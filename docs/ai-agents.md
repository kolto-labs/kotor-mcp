# Using kq with AI agents

kq reaches agents in three layers. Use as many as your tool supports:

1. **MCP server**: `kq mcp` exposes the read-only commands as tools. It works with any MCP client.
2. **Plugin**: [`plugin/`](../plugin/) bundles the server config with skills and an explorer agent,
   for Claude Code and Cursor.
3. **Repo instructions**: [`AGENTS.md`](../AGENTS.md) is the contract for agents working inside
   this repository. `CLAUDE.md` and `GEMINI.md` import it.

## The MCP server

```bash
kq mcp                      # default install from KQ_INSTALL or the working directory
kq mcp -i /path/to/game     # pin a default install
```

The server speaks MCP over stdio (protocol revisions 2024-11-05 through 2025-11-25). Every tool is
read-only and accepts an optional `install` argument that overrides the default for that call.

| Tool | CLI equivalent | Use it to |
|------|----------------|-----------|
| `kq_info` | `kq info` | Confirm the target and see what it contains |
| `kq_ls` | `kq ls` | Find resources by name, type, module, or source |
| `kq_which` | `kq which` | See every copy of a ResRef and which one loads |
| `kq_cat` | `kq cat` | Read one decoded resource (JSON, gron, or outline) |
| `kq_grep` | `kq grep` | Search decoded contents |
| `kq_graph` | `kq graph` | Find used, unused, overshadowed, and missing references |
| `kq_delta` | `kq delta` | Diff two resources, or a copy against what it shadows |

Each call runs the `kq` binary itself, so output and behavior match the CLI exactly, and the on-disk
index cache is shared. List-style tools default to a result `limit` (200 for `ls` and `graph`, 50
for `grep`) to protect the context window; pass `limit: 0` for everything. Output over 200 KB is
truncated with a note saying how to narrow the query.

### Client configuration

**Claude Code**: install the plugin (below), or register the server alone:

```bash
claude mcp add kq -- kq mcp
```

**Cursor** (`.cursor/mcp.json`), **VS Code** (`.vscode/mcp.json`, top-level key `servers`), and
most other clients accept the same shape:

```json
{
  "mcpServers": {
    "kq": {
      "command": "kq",
      "args": ["mcp"],
      "env": { "KQ_INSTALL": "/path/to/game" }
    }
  }
}
```

**Codex CLI** (`~/.codex/config.toml`):

```toml
[mcp_servers.kq]
command = "kq"
args = ["mcp"]
env = { KQ_INSTALL = "/path/to/game" }
```

**Smoke test** without a client:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"cli","version":"0"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"kq_info","arguments":{}}}' \
  | kq mcp -i /path/to/game
```

Or explore interactively with `npx @modelcontextprotocol/inspector kq mcp`.

## The plugin

```text
/plugin marketplace add kolto-labs/kotor-mcp
/plugin install kq@kolto-labs
```

Contents and Cursor instructions: [`plugin/README.md`](../plugin/README.md). After installing, run
`/kq:setup`.

| Skill | Invocation | What it does |
|-------|------------|--------------|
| `kq-query` | Automatic | The query workflow: resolve the target, narrow, `which` before `cat` |
| `kq-formats` | Automatic | How to read each type's decoded output and cite field paths |
| `review` | Automatic or `/kq:review` | Load report for a mod: what loads, what it changes, broken references |
| `merge-mods` | Automatic or `/kq:merge-mods` | Three-way merge of two mods' edits to one resource |
| `setup` | `/kq:setup` | Install and connect |

## Other agents

Tools that read `AGENTS.md` (Codex, OpenCode, GitHub Copilot's coding agent, Windsurf, Aider with
`--read AGENTS.md`, and others) pick up the repository contract when this repo is the workspace. For
KotOR questions in any other workspace, connect the MCP server.

## Prompting tips

Name the target and the question:

> Which copy of `appearance.2da` loads in my install, and what does row 8 contain?

"Search the BIF files for Bastila" invites extraction. Ask instead: "find every dialogue that
mentions Bastila".
