---
name: setup
description: >-
  Install the kq binary, point it at a KotOR or TSL install, and confirm the kq MCP server connects.
  Use when the user asks to set up, install, or configure kq or this plugin, when the kq_* tools are
  missing or fail to start, or when kq reports no install resolved (exit 4). Not for answering
  questions about game resources once kq works (use kq-query).
disable-model-invocation: true
---

# Setup

Takes a machine from nothing to a working `kq` with the MCP server connected. Run the steps in
order and stop at the first one that fails: each later step depends on the one before it.

## 1. Install the binary

Check `kq --version` first. If it runs and lists an `mcp` subcommand under `kq --help`, skip to
step 2. `kq mcp` arrived in 0.5.0, so an older binary has to be upgraded.

Otherwise install it, using the method that matches the user's platform:

```bash
# macOS / Linux
curl -LsSf https://github.com/kolto-labs/kq/releases/latest/download/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://github.com/kolto-labs/kq/releases/latest/download/install.ps1 | iex"

# Any platform with Rust 1.82+
cargo install --git https://github.com/kolto-labs/kotor-mcp --locked
```

Show the command and let the user run it, or run it once they say so. It modifies their machine.

> **Done when:** `kq --version` prints a version from a new shell, which proves the install directory
> is on `PATH`.

## 2. Point it at the game

Ask for the game folder: the one containing `chitin.key`. KotOR and TSL are not bundled, and
guessing Steam or GOG paths produces confident wrong answers. Then run:

```bash
kq -i "/path/to/game" info
```

Expect `"kind": "install"` and a non-null `"game"`. A `"kind"` of `folder` or `capsule` means the
path is not the game root.

To make it the default for the shell and the MCP server, set `KQ_INSTALL` in the user's shell
profile. The MCP server inherits the environment of the app that launches it, so restart the app
after setting it.

> **Done when:** `kq info` reports the install without `-i`, or the user has chosen to pass `-i`
> every time.

## 3. Connect the MCP server

The plugin's `.mcp.json` launches `kq mcp`. In Claude Code, run `/mcp` and confirm `kq` is
connected with seven `kq_*` tools. In Cursor, check Settings → MCP.

If it is not connected:

| Symptom | Cause | Fix |
|---------|-------|-----|
| Command not found / failed to spawn | `kq` is not on the `PATH` the app sees | Install to a directory on the system `PATH`, or restart the app from a shell that has it |
| Connects, but tools say no install resolved | `KQ_INSTALL` is not in the app's environment | Pass `install` per call, or set the variable and restart |
| `error: unrecognized subcommand 'mcp'` | Binary older than 0.5.0 | Repeat step 1 |

Run this to test the server by hand. It should print one JSON line with the tool list:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | kq mcp
```

> **Done when:** a `kq_info` call through MCP returns the same install summary as step 2.
