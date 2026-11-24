#!/usr/bin/env bash
# Link the kq agent plugin into Cursor's local plugin directory.
# Claude Code installs it from the marketplace instead; see plugin/README.md.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
plugin="$root/plugin"
dest_dir="${HOME}/.cursor/plugins/local"
dest="$dest_dir/kq"

if [[ ! -f "$plugin/.cursor-plugin/plugin.json" ]]; then
  echo "install-agent-plugin: missing $plugin/.cursor-plugin/plugin.json" >&2
  exit 1
fi

mkdir -p "$dest_dir"
ln -sfn "$plugin" "$dest"
echo "Cursor: linked $dest -> $plugin (enable kq under Settings > Plugins)"
echo "Claude Code: /plugin marketplace add kolto-labs/kotor-mcp && /plugin install kq@kolto-labs"
echo "             or, for one session: claude --plugin-dir $plugin"
if ! command -v kq >/dev/null 2>&1; then
  echo "warning: kq is not on PATH; the MCP server will not start until it is." >&2
fi
