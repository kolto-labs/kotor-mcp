# kq agent plugin

Gives AI coding agents a working interface to a Knights of the Old Republic install: the `kq` MCP
server, skills that teach the query workflow and output formats, mod review and merge workflows, and
an explorer agent. One directory serves as both a Claude Code plugin and a Cursor plugin.

## Contents

| Path | Kind | Purpose |
|------|------|---------|
| `.mcp.json` | MCP server | Starts `kq mcp`, which exposes `kq_info`, `kq_ls`, `kq_which`, `kq_cat`, `kq_grep`, `kq_graph`, `kq_delta` |
| `skills/kq-query/` | Skill, auto | Run queries correctly: interface choice, target resolution, narrowing, flags |
| `skills/kq-formats/` | Skill, auto | Read what each resource type decodes to and cite field paths |
| `skills/review/` | Skill, auto or `/kq:review` | Audit a mod or Override folder: what loads, what it changes, missing references |
| `skills/merge-mods/` | Skill, auto or `/kq:merge-mods` | Three-way merge two mods' edits to one resource |
| `skills/setup/` | Skill, `/kq:setup` only | Install kq, point it at the game, connect the MCP server |
| `agents/kq-explorer.md` | Subagent | Multi-step install investigations in a separate context |
| `rules/kq.mdc` | Cursor rule | Always-on contract for Cursor |
| `.claude-plugin/plugin.json` | Manifest | Claude Code |
| `.cursor-plugin/plugin.json` | Manifest | Cursor |

## Requirements

- `kq` 0.5.0 or later on `PATH` (`kq mcp` was added in 0.5.0). See the repo
  [README](../README.md#install).
- A KotOR or TSL install. Set `KQ_INSTALL`, or pass `install` on each tool call.

## Install

**Claude Code**, from the marketplace in this repository:

```text
/plugin marketplace add kolto-labs/kotor-mcp
/plugin install kq@kolto-labs
```

Or load a checkout for one session: `claude --plugin-dir ./plugin`.

**Cursor**: link the directory as a local plugin, then enable **kq** under Settings → Plugins:

```bash
./scripts/install-agent-plugin.sh
```

**Any other MCP client**: register a stdio server with the command `kq mcp` (optionally
`kq mcp -i /path/to/game`). The [AI agents guide](../docs/ai-agents.md) has config snippets.

Then run `/kq:setup` to verify the binary, the install path, and the server connection.
