# AGENTS.md

Instructions for AI coding agents working in this repository or answering
questions about a KotOR install with it. Human-facing docs are in
[README.md](README.md) and [docs/](docs/).

## What this repository is

`kq` is a read-only Rust CLI that indexes a Knights of the Old Republic
(KotOR / TSL) install and decodes its resources to text in place. `kq mcp`
serves the same queries as a Model Context Protocol server. The
[`plugin/`](plugin/) directory packages skills, an agent, and the MCP server
config for Claude Code and Cursor.

## Answering KotOR resource questions

Use the `kq_*` MCP tools when they are connected; otherwise run the `kq` CLI.
Either way:

- Query archives in place. Extracting KEY/BIF/ERF/RIM/MOD/SAV files to disk
  to search them is never needed: `kq grep` searches decoded contents.
- Resolve before reading. Run `kq which NAME` when Override, a module, and
  chitin may each hold a copy; the marked copy is the one the game loads.
- `-i` is `--install`, on every command. Case-insensitive grep is
  `--ignore-case`; there is no short form.
- Output is JSON by default (`ls` and `grep` are JSONL). Quote the field path
  from a hit (`Tag`, `EntryList[3].Text`) rather than byte offsets.
- Exit codes are stable: 0 ok, 1 runtime error, 2 usage, 3 no match (an empty
  result, not a failure), 4 no install resolved (ask for the path), 5
  `delta`/`merge` found differences or conflicts.
- `kq` never writes into an install. `patch` and `merge` print results or
  write the `-o` file you name.

The `kq-query` and `kq-formats` skills in [`plugin/skills/`](plugin/skills/)
carry the full flag surface and per-format output shapes.

## Build and test

```bash
cargo build --workspace --locked
cargo test --workspace --locked
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked   # CI sets RUSTFLAGS=-D warnings
python3 scripts/validate-plugin.py                 # plugin manifests, skills, doc links
```

The MSRV is 1.82 and CI builds against it. Check a new dependency's
`rust-version` before adding it.

## Workspace layout

| Crate | Role |
|-------|------|
| `crates/kq-format` | Byte-level decoders for every resource type |
| `crates/kq-index` | Install discovery, resolve order, on-disk index cache |
| `crates/kq-ncs` | NCS decompile and disassembly glue |
| `crates/kq-cli` | The `kq` binary: clap args, rendering, commands, `kq mcp` |
| `vendor/kotor-formats` | Vendored upstream format crates; excluded from the workspace |

## Conventions

- Exit codes in `crates/kq-cli/src/exit.rs` are a public contract. Add new
  ones; never renumber.
- `-i` stays the global `--install`. Do not add a per-command short `-i`.
- Choose a decoder by sniffing bytes, not by file extension.
- A new text projection must also be added to `grep`'s searchable-type check
  (`is_searchable`), or `grep` will skip it.
- An MCP tool is one read-only CLI subcommand. Add it in
  `crates/kq-cli/src/mcp.rs` (`tool_definitions` and `build_argv`), and cover
  it in `crates/kq-cli/tests/mcp.rs`.
- Commits follow Conventional Commits; release-please derives versions and the
  changelog from them.
- When you change a skill or the plugin, bump `version` in both
  `plugin/.claude-plugin/plugin.json` and `plugin/.cursor-plugin/plugin.json`.
  Installed copies only update when it changes.
