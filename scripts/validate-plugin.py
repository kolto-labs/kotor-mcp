#!/usr/bin/env python3
"""Validate the agent plugin and marketplace without third-party packages.

Checks that every manifest parses, both plugin manifests agree on name and
version, every skill and agent has frontmatter with a name matching its
path and a description, and every relative markdown link resolves.
Exits non-zero with one line per problem.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLUGIN = ROOT / "plugin"
problems: list[str] = []


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        problems.append(f"{path.relative_to(ROOT)}: {e}")
        return {}


def frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        problems.append(f"{path.relative_to(ROOT)}: missing frontmatter")
        return {}
    fields: dict[str, str] = {}
    key = None
    for line in m.group(1).splitlines():
        top = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if top:
            key, value = top.group(1), top.group(2).strip()
            fields[key] = "" if value in (">-", ">", "|", "|-") else value
        elif key and line.startswith((" ", "\t")):
            fields[key] = (fields[key] + " " + line.strip()).strip()
    return fields


market = load_json(ROOT / ".claude-plugin" / "marketplace.json")
claude = load_json(PLUGIN / ".claude-plugin" / "plugin.json")
cursor = load_json(PLUGIN / ".cursor-plugin" / "plugin.json")
mcp = load_json(PLUGIN / ".mcp.json")

for field in ("name", "version"):
    if claude.get(field) != cursor.get(field):
        problems.append(f"plugin manifests disagree on {field}: {claude.get(field)!r} vs {cursor.get(field)!r}")
for entry in market.get("plugins", []):
    if not (ROOT / entry.get("source", "")).joinpath(".claude-plugin", "plugin.json").is_file():
        problems.append(f"marketplace entry {entry.get('name')!r}: source has no .claude-plugin/plugin.json")
if "kq" not in mcp.get("mcpServers", {}):
    problems.append("plugin/.mcp.json: no `kq` server")

for skill in sorted((PLUGIN / "skills").glob("*/SKILL.md")):
    fm = frontmatter(skill)
    if fm.get("name", skill.parent.name) != skill.parent.name:
        problems.append(f"{skill.relative_to(ROOT)}: name {fm.get('name')!r} != directory {skill.parent.name!r}")
    if not fm.get("description"):
        problems.append(f"{skill.relative_to(ROOT)}: missing description")
    elif len(fm["description"]) + len(fm.get("when_to_use", "")) > 1536:
        problems.append(f"{skill.relative_to(ROOT)}: description exceeds the 1536-character budget")
for agent in sorted((PLUGIN / "agents").glob("*.md")):
    fm = frontmatter(agent)
    if fm.get("name") != agent.stem:
        problems.append(f"{agent.relative_to(ROOT)}: name {fm.get('name')!r} != file {agent.stem!r}")
    if not fm.get("description"):
        problems.append(f"{agent.relative_to(ROOT)}: missing description")

docs = [ROOT / "AGENTS.md", ROOT / "README.md", *ROOT.glob("docs/*.md"), *PLUGIN.rglob("*.md")]
for doc in docs:
    for target in re.findall(r"\]\(([^)\s#]+)", doc.read_text(encoding="utf-8")):
        if "://" in target or target.startswith("mailto:"):
            continue
        if not (doc.parent / target).exists():
            problems.append(f"{doc.relative_to(ROOT)}: broken link {target}")

for p in problems:
    print(f"validate-plugin: {p}", file=sys.stderr)
sys.exit(1 if problems else 0)
