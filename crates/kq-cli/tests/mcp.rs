//! End-to-end: drive `kq mcp` over stdio the way an MCP client does.

use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};

use serde_json::{json, Value};

fn session(install: &std::path::Path, requests: &[Value]) -> Vec<Value> {
    let mut child = Command::new(env!("CARGO_BIN_EXE_kq"))
        .args(["mcp", "--no-cache", "-i"])
        .arg(install)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("spawn kq mcp");
    let mut stdin = child.stdin.take().unwrap();
    for r in requests {
        writeln!(stdin, "{r}").unwrap();
    }
    drop(stdin); // EOF ends the session
    let out = BufReader::new(child.stdout.take().unwrap());
    let replies: Vec<Value> = out
        .lines()
        .map(|l| serde_json::from_str(&l.unwrap()).expect("every stdout line is JSON-RPC"))
        .collect();
    assert!(child.wait().unwrap().success());
    replies
}

fn call(id: u64, name: &str, arguments: Value) -> Value {
    json!({"jsonrpc":"2.0","id":id,"method":"tools/call","params":{"name":name,"arguments":arguments}})
}

#[test]
fn full_session_against_a_loose_folder() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("hello.nss"), "void main() { int x = 1; }\n").unwrap();

    let replies = session(
        dir.path(),
        &[
            json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}),
            json!({"jsonrpc":"2.0","method":"notifications/initialized"}),
            json!({"jsonrpc":"2.0","id":2,"method":"tools/list"}),
            call(3, "kq_ls", json!({})),
            call(4, "kq_grep", json!({"pattern": "int x"})),
            call(5, "kq_grep", json!({"pattern": "no_such_text"})),
            call(6, "kq_cat", json!({"resref": "hello.nss"})),
            call(7, "kq_info", json!({"install": "/definitely/not/here"})),
        ],
    );

    // The notification gets no reply, so seven requests produce seven replies.
    assert_eq!(replies.len(), 7);
    let by_id = |id: u64| replies.iter().find(|r| r["id"] == id).unwrap();

    assert_eq!(by_id(1)["result"]["protocolVersion"], "2025-11-25");
    let tools: Vec<&str> = by_id(2)["result"]["tools"]
        .as_array()
        .unwrap()
        .iter()
        .map(|t| t["name"].as_str().unwrap())
        .collect();
    for t in [
        "kq_info", "kq_ls", "kq_which", "kq_cat", "kq_grep", "kq_graph", "kq_delta",
    ] {
        assert!(tools.contains(&t), "missing {t}");
    }

    let text = |id| {
        by_id(id)["result"]["content"][0]["text"]
            .as_str()
            .unwrap()
            .to_string()
    };
    assert_eq!(by_id(3)["result"]["isError"], false);
    assert!(text(3).contains("hello.nss"));
    assert!(text(4).contains("int x = 1"));
    assert_eq!(text(5), "No matches.");
    assert!(text(6).contains("void main()"));
    assert_eq!(by_id(7)["result"]["isError"], true);
    assert!(text(7).contains("install"));
}
