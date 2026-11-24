---
name: kq-query
description: >-
  Query a KotOR or KotOR II (TSL) install, capsule, or loose file in place with kq — list, resolve,
  read, search, diff, and graph game resources through the kq_* MCP tools or the kq CLI. Use when the
  user asks what a creature, dialogue, 2DA row, talk-table string, or script contains; which copy of a
  ResRef the game loads; where a tag, StrRef, or script routine appears; or mentions Override,
  chitin.key, dialog.tlk, BIF/ERF/RIM/MOD archives, or modules. Also use when someone proposes
  extracting or unpacking archives to search them. Not for editing or packing game files, compiling
  NSS, or Rust work on kq itself (see the repo's AGENTS.md).
---

# kq-query

kq reads a KotOR install the way `rg` reads a source tree: in place, decoded to text, read-only.
Nothing ever needs extracting.

## 1. Pick the interface

Use the `kq_*` MCP tools when they are listed: they return the same JSON as the CLI and need no
shell. Otherwise run `kq` on `PATH`, or `./target/release/kq` inside a kq checkout. If neither
exists, run the `setup` skill rather than guessing an install command.

| Intent | MCP tool | CLI |
|--------|----------|-----|
| What is this target? | `kq_info` | `kq info [--by-type]` |
| Find names | `kq_ls` | `kq ls PATTERN` |
| Which copy loads? | `kq_which` | `kq which RESREF` |
| Read one resource | `kq_cat` | `kq cat RESREF` |
| Search contents | `kq_grep` | `kq grep PATTERN [NAME_GLOB]` |
| Compare copies | `kq_delta` | `kq delta LEFT [RIGHT]` |
| Used / unused / overshadowed | `kq_graph` | `kq graph [NAME]` |

`patch` and `merge` are CLI-only; the `merge-mods` skill covers them.

> **Done when:** you know which interface you are calling.

## 2. Resolve the target

In order: the `install` tool argument or `-i PATH`; the server's or shell's `KQ_INSTALL`; a walk
upward from the working directory looking for `chitin.key`. A folder *inside* an install still means
the whole install. A named file or capsule (`danm13.mod`, `n_bastila.utc`) is queried on its own.

Exit code 4, or a tool result saying no install resolved, means ask the user for the game folder.
Do not invent a path.

> **Done when:** `kq_info` (or `kq info`) succeeds against the target.

## 3. Narrow, then read

1. Start narrow. Filter `ls` and `grep` by `type`, `module`, or `source` before a full-install
   search; a full `grep` decodes every searchable resource.
2. Run `which` before `cat` whenever a ResRef may exist in more than one place. To read an
   overshadowed copy, pass the container label `which` printed as `from`.
3. For field-level answers, read with `format: gron` (CLI `-f gron`): every line carries its own
   path, so you can quote it exactly.
4. Treat exit 3 / "No matches." as an empty answer, then widen the filter or fix the pattern.

> **Done when:** the answer names the loaded source or container and quotes the field path or line it
> came from.

## Flags that trip agents

- `-i` is `--install`. Case-insensitive grep is `--ignore-case` only, so `kq grep -i foo` treats
  `foo` as the install path.
- JSON is the default output; `--text` is for humans. `ls` and `grep` emit JSONL.
- NCS prints as decompiled NSS by default; `--disasm` gives the instruction listing.
- Run `kq <command> --help` for anything not covered here, rather than guessing a flag.

## Exit codes

`0` ok · `1` runtime error · `2` usage · `3` no match · `4` no install · `5` delta differs or merge
conflicts.

## Reference

- Read [references/cli.md](references/cli.md) when you need the full flag table, source kinds, the
  resolve order, or a recipe for a less common query.
- Read the `kq-formats` skill when you need to interpret what `cat` or `grep` printed for a type.
