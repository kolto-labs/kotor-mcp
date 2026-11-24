//! `kq mcp` — a Model Context Protocol server over stdio.
//!
//! Each tool is one read-only `kq` subcommand. A call re-runs this same
//! binary as a child process with the matching argv, so the MCP surface can
//! never drift from the CLI: same flags, same JSON, same exit codes, same
//! on-disk index cache.
//!
//! The transport is newline-delimited JSON-RPC 2.0 on stdin/stdout, as the
//! MCP stdio transport specifies. Diagnostics go to stderr only; stdout
//! carries protocol messages and nothing else.
//!
//! The server is synchronous and hand-written instead of built on an SDK:
//! the official Rust SDK needs a newer toolchain than this workspace's MSRV,
//! and a stdio server that only exposes tools is a small, fixed protocol.

use std::io::{self, BufRead, Read, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use anyhow::Result;
use serde_json::{json, Map, Value};

use crate::exit;

/// Protocol revisions this server speaks, newest first. The server answers
/// `initialize` with the client's version when it is listed here, and with
/// the newest one otherwise, as the lifecycle section of the spec requires.
pub const PROTOCOL_VERSIONS: &[&str] = &["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

/// Upper bound on the text returned from one tool call. Large enough for a
/// decoded creature or dialogue, small enough not to flood a context window.
/// Callers narrow with `limit`, `type`, `module`, or a more specific name.
const MAX_OUTPUT_BYTES: usize = 200_000;

/// A full-install `grep` or `graph` on a cold cache can take a while; a hung
/// child must still not wedge the session.
const CALL_TIMEOUT: Duration = Duration::from_secs(300);

/// JSON-RPC error codes.
const PARSE_ERROR: i64 = -32700;
const INVALID_REQUEST: i64 = -32600;
const METHOD_NOT_FOUND: i64 = -32601;
const INVALID_PARAMS: i64 = -32602;

#[derive(clap::Args)]
pub struct Args {}

/// Server-wide defaults taken from the `kq mcp` invocation's global flags.
#[derive(Clone, Debug, Default)]
pub struct Defaults {
    pub install: Option<PathBuf>,
    pub nwscript: Option<PathBuf>,
    pub no_cache: bool,
}

pub fn run(defaults: Defaults, _args: Args) -> Result<i32> {
    let exe = std::env::current_exe()?;
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = stdout.lock();
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        if let Some(reply) = handle_line(&line, &defaults, &|argv| run_kq(&exe, argv)) {
            serde_json::to_writer(&mut out, &reply)?;
            out.write_all(b"\n")?;
            out.flush()?;
        }
    }
    Ok(exit::OK)
}

/// Outcome of one child `kq` run.
#[derive(Debug, Clone)]
pub struct Run {
    pub code: i32,
    pub stdout: String,
    pub stderr: String,
}

/// Handle one inbound line. Returns the response to write, or `None` for a
/// notification (which never gets a reply).
pub fn handle_line(
    line: &str,
    defaults: &Defaults,
    exec: &dyn Fn(&[String]) -> Result<Run>,
) -> Option<Value> {
    let msg: Value = match serde_json::from_str(line) {
        Ok(v) => v,
        Err(e) => {
            return Some(error(
                Value::Null,
                PARSE_ERROR,
                &format!("parse error: {e}"),
            ))
        }
    };
    let Some(obj) = msg.as_object() else {
        return Some(error(
            Value::Null,
            INVALID_REQUEST,
            "expected a JSON-RPC object",
        ));
    };
    let method = obj.get("method").and_then(Value::as_str);
    let id = obj.get("id").cloned();

    let (Some(method), Some(id)) = (method, id) else {
        // A notification (no id), or a response to a request we never send.
        return None;
    };
    let params = obj.get("params").cloned().unwrap_or(Value::Null);

    Some(match method {
        "initialize" => success(id, initialize(&params)),
        "ping" => success(id, json!({})),
        "tools/list" => success(id, json!({ "tools": tool_definitions() })),
        "tools/call" => match call_tool(&params, defaults, exec) {
            Ok(result) => success(id, result),
            Err(message) => error(id, INVALID_PARAMS, &message),
        },
        other => error(id, METHOD_NOT_FOUND, &format!("method not found: {other}")),
    })
}

fn initialize(params: &Value) -> Value {
    let requested = params.get("protocolVersion").and_then(Value::as_str);
    let version = requested
        .filter(|v| PROTOCOL_VERSIONS.contains(v))
        .unwrap_or(PROTOCOL_VERSIONS[0]);
    json!({
        "protocolVersion": version,
        "capabilities": { "tools": { "listChanged": false } },
        "serverInfo": {
            "name": "kq",
            "title": "kq — KotOR install query",
            "version": env!("CARGO_PKG_VERSION"),
        },
        "instructions": INSTRUCTIONS,
    })
}

const INSTRUCTIONS: &str = "Read-only queries over a Knights of the Old Republic (KotOR / TSL) \
install, decoded in place without extracting archives. Typical flow: kq_which to see which copy \
of a ResRef the game loads, kq_cat to read it, kq_grep to find every resource mentioning a tag, \
StrRef, or script routine. Every tool takes an optional `install` path; without it the server's \
default (`kq mcp -i PATH` or KQ_INSTALL) applies. Narrow broad searches with `type`, `module`, \
and `limit` before widening.";

fn success(id: Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

fn error(id: Value, code: i64, message: &str) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

/// A source-kind filter shared by `ls`, `grep`, and `graph`.
const SOURCE_KINDS: &[&str] = &[
    "override",
    "module-mod",
    "module-rim",
    "lips",
    "texturepack",
    "rims",
    "stream",
    "chitin",
    "talktable",
];

fn install_prop() -> Value {
    json!({
        "type": "string",
        "description": "Game folder, capsule (.mod/.rim/.erf), or loose file to query. \
    Defaults to the server's configured install."
    })
}

fn types_prop() -> Value {
    json!({
        "type": "array",
        "items": { "type": "string" },
        "description": "Only these resource types, e.g. [\"utc\", \"dlg\", \"2da\"]."
    })
}

fn modules_prop() -> Value {
    json!({
        "type": "array",
        "items": { "type": "string" },
        "description": "Only resources from these module roots, e.g. [\"danm13\"]."
    })
}

fn source_prop() -> Value {
    json!({ "type": "string", "enum": SOURCE_KINDS, "description": "Only this source kind." })
}

fn limit_prop(default: u64, what: &str) -> Value {
    json!({
        "type": "integer",
        "minimum": 0,
        "default": default,
        "description": format!("Stop after this many {what}. 0 means no limit.")
    })
}

fn tool(name: &str, title: &str, description: &str, props: Value, required: &[&str]) -> Value {
    let mut properties = props.as_object().cloned().unwrap_or_default();
    properties.insert("install".into(), install_prop());
    json!({
        "name": name,
        "title": title,
        "description": description,
        "inputSchema": {
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": false,
        },
        "annotations": {
            "title": title,
            "readOnlyHint": true,
            "destructiveHint": false,
            "idempotentHint": true,
            "openWorldHint": false,
        },
    })
}

pub fn tool_definitions() -> Vec<Value> {
    vec![
        tool(
            "kq_info",
            "Summarize install",
            "Summarize a KotOR install, capsule, or folder: detected game, resource counts by \
source (or by type), module count. Start here to confirm the target resolves.",
            json!({
                "by_type": { "type": "boolean", "description": "Count by resource type instead of by source." }
            }),
            &[],
        ),
        tool(
            "kq_ls",
            "List resources",
            "List resources by name. A bare pattern is a substring match; `*` and `?` are globs. \
Returns one JSON object per line with name, type, source, container, and module.",
            json!({
                "pattern": { "type": "string", "description": "Name substring or glob." },
                "type": types_prop(),
                "module": modules_prop(),
                "source": source_prop(),
                "loaded": { "type": "boolean", "description": "Only the copy the game loads." },
                "limit": limit_prop(200, "results"),
            }),
            &[],
        ),
        tool(
            "kq_which",
            "Resolve a ResRef",
            "Show every copy of a ResRef in load order. The entry marked as loaded is the one \
the game uses; the rest are overshadowed. Use before kq_cat when Override may shadow chitin.",
            json!({
                "resref": { "type": "string", "description": "ResRef, with or without extension, e.g. appearance.2da." },
                "type": { "type": "string", "description": "Resource type when the name is ambiguous." },
            }),
            &["resref"],
        ),
        tool(
            "kq_cat",
            "Read a resource",
            "Decode one resource to text: GFF (utc, dlg, git, ...) as a field tree, 2DA as rows, \
TLK entries, NCS as decompiled NSS (or disassembly with `disasm`). Reads the loaded copy unless \
`from` or `module` selects another.",
            json!({
                "resref": { "type": "string", "description": "ResRef to read. Omit only with `tag`." },
                "type": { "type": "string", "description": "Resource type when the name is ambiguous." },
                "format": {
                    "type": "string",
                    "enum": ["json", "gron", "outline"],
                    "description": "json (default): decoded envelope. gron: one `path = value` line per leaf, best for quoting fields. outline: indented tree."
                },
                "from": { "type": "string", "description": "Container label from kq_which, or a resource/archive file path." },
                "module": { "type": "string", "description": "Read the highest-precedence copy from this module root." },
                "tag": { "type": "string", "description": "Read a placed GIT object by Tag. Requires `module` and `type`." },
                "disasm": { "type": "boolean", "description": "For NCS: instruction disassembly instead of decompiled NSS." },
            }),
            &[],
        ),
        tool(
            "kq_grep",
            "Search decoded contents",
            "Regex search over decoded resource text (GFF fields, 2DA cells, TLK strings, NCS, \
plain text). Each hit carries the resource and the field path that matched.",
            json!({
                "pattern": { "type": "string", "description": "Regex, or a literal with fixed_strings." },
                "name_glob": { "type": "string", "description": "Only resources whose name matches this glob." },
                "type": types_prop(),
                "module": modules_prop(),
                "source": source_prop(),
                "ignore_case": { "type": "boolean", "description": "Case-insensitive match." },
                "fixed_strings": { "type": "boolean", "description": "Treat pattern as a literal." },
                "files_with_matches": { "type": "boolean", "description": "Only list matching resource names." },
                "context": { "type": "integer", "minimum": 0, "description": "Lines of context around each match." },
                "loaded": { "type": "boolean", "description": "Only the copy the game loads." },
                "limit": limit_prop(50, "matching resources"),
            }),
            &["pattern"],
        ),
        tool(
            "kq_graph",
            "Reference graph",
            "Report used, unused, and overshadowed resources reachable from the game's live \
reference graph. With `name`, show one ResRef or module: who references it and what it references.",
            json!({
                "name": { "type": "string", "description": "ResRef or module root to zoom into." },
                "type": types_prop(),
                "module": modules_prop(),
                "source": source_prop(),
                "format": {
                    "type": "string",
                    "enum": ["summary", "lists", "tree"],
                    "description": "summary: counts. lists: used/unused/overshadowed paths. tree: reachability tree."
                },
                "no_assets": { "type": "boolean", "description": "Exclude textures, models, and audio." },
                "depth": { "type": "integer", "minimum": 0, "description": "Tree depth for format=tree. 0 is unlimited." },
                "missing": { "type": "boolean", "description": "With `name`: include referenced ResRefs that do not exist." },
                "limit": limit_prop(200, "rows"),
            }),
            &[],
        ),
        tool(
            "kq_delta",
            "Compare two resources",
            "Structured diff of two decoded resources. Compare two ResRefs or files, two copies \
of one ResRef (`from`/`against`), the loaded copy against what it shadows (`shadow`), or the \
same ResRef across installs (`other`).",
            json!({
                "left": { "type": "string", "description": "Left side: ResRef or resource file." },
                "right": { "type": "string", "description": "Right side. Omit with `shadow`." },
                "from": { "type": "string", "description": "Container label for the left copy." },
                "against": { "type": "string", "description": "Container label for the right copy." },
                "shadow": { "type": "boolean", "description": "Compare the loaded copy to the next overshadowed copy." },
                "other": { "type": "string", "description": "Look up `right` (or the same ResRef) in this other install." },
            }),
            &["left"],
        ),
    ]
}

/// Typed accessors over a tool's `arguments` object that reject wrong types
/// and unknown keys with a message the model can act on.
struct ToolArgs<'a> {
    map: &'a Map<String, Value>,
}

impl<'a> ToolArgs<'a> {
    fn str(&self, key: &str) -> Result<Option<&'a str>, String> {
        match self.map.get(key) {
            None | Some(Value::Null) => Ok(None),
            Some(Value::String(s)) => Ok(Some(s.as_str())),
            Some(_) => Err(format!("`{key}` must be a string")),
        }
    }

    fn bool(&self, key: &str) -> Result<bool, String> {
        match self.map.get(key) {
            None | Some(Value::Null) => Ok(false),
            Some(Value::Bool(b)) => Ok(*b),
            Some(_) => Err(format!("`{key}` must be a boolean")),
        }
    }

    fn uint(&self, key: &str) -> Result<Option<u64>, String> {
        match self.map.get(key) {
            None | Some(Value::Null) => Ok(None),
            Some(v) => v
                .as_u64()
                .map(Some)
                .ok_or_else(|| format!("`{key}` must be a non-negative integer")),
        }
    }

    fn strs(&self, key: &str) -> Result<Vec<&'a str>, String> {
        match self.map.get(key) {
            None | Some(Value::Null) => Ok(Vec::new()),
            Some(Value::String(s)) => Ok(vec![s.as_str()]),
            Some(Value::Array(items)) => items
                .iter()
                .map(|v| {
                    v.as_str()
                        .ok_or_else(|| format!("`{key}` must be an array of strings"))
                })
                .collect(),
            Some(_) => Err(format!("`{key}` must be an array of strings")),
        }
    }
}

/// Build argv for a tool call. Option values are passed as `--flag=value`
/// and positionals follow `--`, so a value that starts with `-` can never be
/// read as a flag.
pub fn build_argv(
    name: &str,
    args: &Map<String, Value>,
    defaults: &Defaults,
) -> Result<Vec<String>, String> {
    let schema = tool_definitions()
        .into_iter()
        .find(|t| t["name"] == name)
        .ok_or_else(|| format!("unknown tool: {name}"))?;
    let props = schema["inputSchema"]["properties"]
        .as_object()
        .cloned()
        .unwrap_or_default();
    for key in args.keys() {
        if !props.contains_key(key) {
            return Err(format!("unknown argument `{key}` for {name}"));
        }
    }
    for req in schema["inputSchema"]["required"]
        .as_array()
        .into_iter()
        .flatten()
    {
        let key = req.as_str().unwrap_or_default();
        if !matches!(args.get(key), Some(v) if !v.is_null()) {
            return Err(format!("missing required argument `{key}` for {name}"));
        }
    }

    let a = ToolArgs { map: args };
    let mut argv: Vec<String> = vec!["--color=never".into()];

    let install = a
        .str("install")?
        .map(PathBuf::from)
        .or_else(|| defaults.install.clone());
    if let Some(p) = install {
        argv.push(format!("--install={}", p.display()));
    }
    if let Some(p) = &defaults.nwscript {
        argv.push(format!("--nwscript={}", p.display()));
    }
    if defaults.no_cache {
        argv.push("--no-cache".into());
    }

    let opt = |argv: &mut Vec<String>, flag: &str, v: Option<&str>| {
        if let Some(v) = v {
            argv.push(format!("--{flag}={v}"));
        }
    };
    let flag = |argv: &mut Vec<String>, flag: &str, on: bool| {
        if on {
            argv.push(format!("--{flag}"));
        }
    };
    let mut positionals: Vec<String> = Vec::new();

    match name {
        "kq_info" => {
            argv.push("info".into());
            flag(&mut argv, "by-type", a.bool("by_type")?);
        }
        "kq_ls" => {
            argv.push("ls".into());
            filters(&mut argv, &a)?;
            flag(&mut argv, "loaded", a.bool("loaded")?);
            argv.push(format!("--limit={}", a.uint("limit")?.unwrap_or(200)));
            positionals.extend(a.str("pattern")?.map(str::to_string));
        }
        "kq_which" => {
            argv.push("which".into());
            opt(&mut argv, "type", a.str("type")?);
            positionals.extend(a.str("resref")?.map(str::to_string));
        }
        "kq_cat" => {
            argv.push("cat".into());
            opt(&mut argv, "type", a.str("type")?);
            opt(&mut argv, "format", a.str("format")?);
            opt(&mut argv, "from", a.str("from")?);
            opt(&mut argv, "module", a.str("module")?);
            opt(&mut argv, "tag", a.str("tag")?);
            flag(&mut argv, "disasm", a.bool("disasm")?);
            if let Some(f) = a.str("format")? {
                if !matches!(f, "json" | "gron" | "outline") {
                    return Err(format!("`format` must be json, gron, or outline (got {f})"));
                }
            }
            if a.str("resref")?.is_none() && a.str("tag")?.is_none() {
                return Err("kq_cat needs `resref` or `tag`".into());
            }
            positionals.extend(a.str("resref")?.map(str::to_string));
        }
        "kq_grep" => {
            argv.push("grep".into());
            filters(&mut argv, &a)?;
            flag(&mut argv, "ignore-case", a.bool("ignore_case")?);
            flag(&mut argv, "fixed-strings", a.bool("fixed_strings")?);
            flag(
                &mut argv,
                "files-with-matches",
                a.bool("files_with_matches")?,
            );
            flag(&mut argv, "loaded", a.bool("loaded")?);
            if let Some(n) = a.uint("context")? {
                argv.push(format!("--context={n}"));
            }
            argv.push(format!("--limit={}", a.uint("limit")?.unwrap_or(50)));
            positionals.extend(a.str("pattern")?.map(str::to_string));
            positionals.extend(a.str("name_glob")?.map(str::to_string));
        }
        "kq_graph" => {
            argv.push("graph".into());
            filters(&mut argv, &a)?;
            opt(&mut argv, "format", a.str("format")?);
            flag(&mut argv, "no-assets", a.bool("no_assets")?);
            flag(&mut argv, "missing", a.bool("missing")?);
            if let Some(n) = a.uint("depth")? {
                argv.push(format!("--depth={n}"));
            }
            argv.push(format!("--limit={}", a.uint("limit")?.unwrap_or(200)));
            positionals.extend(a.str("name")?.map(str::to_string));
        }
        "kq_delta" => {
            argv.push("delta".into());
            opt(&mut argv, "from", a.str("from")?);
            opt(&mut argv, "against", a.str("against")?);
            opt(&mut argv, "other", a.str("other")?);
            flag(&mut argv, "shadow", a.bool("shadow")?);
            positionals.extend(a.str("left")?.map(str::to_string));
            positionals.extend(a.str("right")?.map(str::to_string));
        }
        _ => return Err(format!("unknown tool: {name}")),
    }

    if !positionals.is_empty() {
        argv.push("--".into());
        argv.extend(positionals);
    }
    Ok(argv)
}

/// `--type`, `--module`, `--source`, shared by ls/grep/graph.
fn filters(argv: &mut Vec<String>, a: &ToolArgs) -> Result<(), String> {
    for t in a.strs("type")? {
        argv.push(format!("--type={t}"));
    }
    for m in a.strs("module")? {
        argv.push(format!("--module={m}"));
    }
    if let Some(s) = a.str("source")? {
        if !SOURCE_KINDS.contains(&s) {
            return Err(format!(
                "`source` must be one of {}",
                SOURCE_KINDS.join(", ")
            ));
        }
        argv.push(format!("--source={s}"));
    }
    Ok(())
}

/// `tools/call`. An `Err` is a protocol error (unknown tool, malformed
/// params). Bad arguments and failed runs come back as a tool result with
/// `isError: true`, so the model sees the message and can correct itself.
fn call_tool(
    params: &Value,
    defaults: &Defaults,
    exec: &dyn Fn(&[String]) -> Result<Run>,
) -> Result<Value, String> {
    let name = params
        .get("name")
        .and_then(Value::as_str)
        .ok_or("tools/call needs a `name`")?;
    if !tool_definitions().iter().any(|t| t["name"] == name) {
        return Err(format!("unknown tool: {name}"));
    }
    let empty = Map::new();
    let args = match params.get("arguments") {
        None | Some(Value::Null) => &empty,
        Some(Value::Object(m)) => m,
        Some(_) => return Err("`arguments` must be an object".into()),
    };

    let argv = match build_argv(name, args, defaults) {
        Ok(argv) => argv,
        Err(message) => return Ok(tool_result(message, true)),
    };
    let run = match exec(&argv) {
        Ok(run) => run,
        Err(e) => return Ok(tool_result(format!("could not run kq: {e:#}"), true)),
    };
    Ok(interpret(run))
}

/// Map a child run onto a tool result, keyed off kq's stable exit codes.
pub fn interpret(run: Run) -> Value {
    let stderr = run.stderr.trim();
    match run.code {
        exit::OK | exit::DIFFER => tool_result(truncate(run.stdout), false),
        exit::NO_MATCH => tool_result("No matches.".into(), false),
        exit::NO_INSTALL => tool_result(
            format!(
                "{stderr}\nNo KotOR install resolved. Pass `install` with the game folder \
(the one containing chitin.key), or start the server with `kq mcp -i PATH` / KQ_INSTALL."
            ),
            true,
        ),
        code => {
            let mut text = format!("kq exited with code {code}");
            if !stderr.is_empty() {
                text.push_str(":\n");
                text.push_str(stderr);
            }
            tool_result(text, true)
        }
    }
}

fn tool_result(text: String, is_error: bool) -> Value {
    json!({ "content": [{ "type": "text", "text": text }], "isError": is_error })
}

fn truncate(mut text: String) -> String {
    if text.len() <= MAX_OUTPUT_BYTES {
        return text;
    }
    let mut cut = MAX_OUTPUT_BYTES;
    while !text.is_char_boundary(cut) {
        cut -= 1;
    }
    let total = text.len();
    text.truncate(cut);
    text.push_str(&format!(
        "\n[output truncated at {cut} of {total} bytes; narrow with limit, type, module, or a more specific name]"
    ));
    text
}

/// Run this binary with `argv`, with a timeout. stdout and stderr are drained
/// on their own threads so a large result cannot deadlock on a full pipe.
fn run_kq(exe: &std::path::Path, argv: &[String]) -> Result<Run> {
    let mut child = Command::new(exe)
        .args(argv)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;
    let mut out_pipe = child.stdout.take().expect("piped stdout");
    let mut err_pipe = child.stderr.take().expect("piped stderr");
    let out_thread = std::thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = out_pipe.read_to_end(&mut buf);
        buf
    });
    let err_thread = std::thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = err_pipe.read_to_end(&mut buf);
        buf
    });

    let deadline = Instant::now() + CALL_TIMEOUT;
    let status = loop {
        if let Some(status) = child.try_wait()? {
            break Some(status);
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            break None;
        }
        std::thread::sleep(Duration::from_millis(20));
    };
    let stdout = String::from_utf8_lossy(&out_thread.join().unwrap_or_default()).into_owned();
    let stderr = String::from_utf8_lossy(&err_thread.join().unwrap_or_default()).into_owned();
    match status {
        Some(s) => Ok(Run {
            code: s.code().unwrap_or(exit::FAILURE),
            stdout,
            stderr,
        }),
        None => anyhow::bail!("timed out after {}s", CALL_TIMEOUT.as_secs()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(v: Value) -> Map<String, Value> {
        v.as_object().cloned().unwrap()
    }

    fn no_exec(_: &[String]) -> Result<Run> {
        panic!("should not run kq")
    }

    #[test]
    fn initialize_echoes_a_supported_version() {
        let r = handle_line(
            r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}"#,
            &Defaults::default(),
            &no_exec,
        )
        .unwrap();
        assert_eq!(r["result"]["protocolVersion"], "2025-06-18");
        assert_eq!(r["result"]["serverInfo"]["name"], "kq");
        assert!(r["result"]["capabilities"]["tools"].is_object());
    }

    #[test]
    fn initialize_falls_back_to_newest_for_unknown_version() {
        let r = handle_line(
            r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"1999-01-01"}}"#,
            &Defaults::default(),
            &no_exec,
        )
        .unwrap();
        assert_eq!(r["result"]["protocolVersion"], PROTOCOL_VERSIONS[0]);
    }

    #[test]
    fn notifications_get_no_reply() {
        let r = handle_line(
            r#"{"jsonrpc":"2.0","method":"notifications/initialized"}"#,
            &Defaults::default(),
            &no_exec,
        );
        assert!(r.is_none());
    }

    #[test]
    fn unknown_method_and_bad_json_are_protocol_errors() {
        let d = Defaults::default();
        let r = handle_line(r#"{"jsonrpc":"2.0","id":7,"method":"nope"}"#, &d, &no_exec).unwrap();
        assert_eq!(r["error"]["code"], METHOD_NOT_FOUND);
        assert_eq!(r["id"], 7);
        let r = handle_line("{not json", &d, &no_exec).unwrap();
        assert_eq!(r["error"]["code"], PARSE_ERROR);
    }

    #[test]
    fn every_tool_is_read_only_and_closed() {
        for t in tool_definitions() {
            assert_eq!(t["annotations"]["readOnlyHint"], true, "{}", t["name"]);
            assert_eq!(
                t["inputSchema"]["additionalProperties"], false,
                "{}",
                t["name"]
            );
            assert!(t["inputSchema"]["properties"]["install"].is_object());
        }
    }

    #[test]
    fn positionals_follow_double_dash() {
        let argv = build_argv(
            "kq_grep",
            &args(json!({"pattern": "-i", "type": ["dlg"]})),
            &Defaults::default(),
        )
        .unwrap();
        let dd = argv.iter().position(|a| a == "--").unwrap();
        assert_eq!(argv[dd + 1], "-i");
        assert!(argv.contains(&"--type=dlg".to_string()));
        assert!(argv.contains(&"--limit=50".to_string()));
    }

    #[test]
    fn default_install_applies_and_can_be_overridden() {
        let d = Defaults {
            install: Some("/game".into()),
            ..Default::default()
        };
        let argv = build_argv("kq_info", &Map::new(), &d).unwrap();
        assert!(argv.contains(&"--install=/game".to_string()));
        let argv = build_argv("kq_info", &args(json!({"install": "/other"})), &d).unwrap();
        assert!(argv.contains(&"--install=/other".to_string()));
        assert!(!argv.contains(&"--install=/game".to_string()));
    }

    #[test]
    fn bad_arguments_become_tool_errors_not_protocol_errors() {
        let d = Defaults::default();
        for bad in [
            r#"{"name":"kq_which","arguments":{}}"#,
            r#"{"name":"kq_ls","arguments":{"bogus":1}}"#,
            r#"{"name":"kq_ls","arguments":{"source":"nowhere"}}"#,
            r#"{"name":"kq_cat","arguments":{"resref":"x","format":"raw"}}"#,
            r#"{"name":"kq_cat","arguments":{}}"#,
        ] {
            let line =
                format!(r#"{{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{bad}}}"#);
            let r = handle_line(&line, &d, &no_exec).unwrap();
            assert_eq!(r["result"]["isError"], true, "{bad}");
        }
        let r = handle_line(
            r#"{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"kq_nope"}}"#,
            &d,
            &no_exec,
        )
        .unwrap();
        assert_eq!(r["error"]["code"], INVALID_PARAMS);
    }

    #[test]
    fn exit_codes_map_to_results() {
        let run = |code| Run {
            code,
            stdout: "{}".into(),
            stderr: "boom".into(),
        };
        assert_eq!(interpret(run(0))["isError"], false);
        assert_eq!(
            interpret(run(exit::NO_MATCH))["content"][0]["text"],
            "No matches."
        );
        assert_eq!(interpret(run(exit::DIFFER))["isError"], false);
        assert_eq!(interpret(run(exit::NO_INSTALL))["isError"], true);
        assert_eq!(interpret(run(exit::FAILURE))["isError"], true);
    }

    #[test]
    fn truncation_respects_char_boundaries() {
        let s = "é".repeat(MAX_OUTPUT_BYTES);
        let t = truncate(s);
        assert!(t.contains("[output truncated"));
    }
}
