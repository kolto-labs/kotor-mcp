---
name: review
description: >-
  Audit a KotOR mod or Override folder against an install: which of its files actually load, which
  are overshadowed or overshadow vanilla, what each changed file changes versus the copy it
  replaces, and which references point at resources that do not exist. Use when the user asks to
  review, audit, sanity-check, or debug a mod or Override folder, asks why a mod change is not
  showing up in game, or asks what a mod touches. Not for merging two mods' edits to the same file
  (use merge-mods) or for single-resource lookups (use kq-query).
---

# Review a mod

The output is a **load report**: every resource the mod ships, with whether it loads, what it
replaced, and what it changes. Build it from kq output only. Remembered mod lore goes stale, and kq
reflects the actual install.

## 1. Fix the two targets

Identify the **install** (the game folder) and the **mod**: an Override subfolder, a loose folder
the user has not installed yet, or a `.mod`/`.erf` capsule. List the mod's resources with `kq_ls`
using the mod path as `install`; a folder or capsule given as `install` is read on its own.

> **Done when:** you have the full list of the mod's resources (ResRef and type).

## 2. Resolve every resource

For each mod resource, run `kq_which` against the install. Classify it:

- **Loads**: the mod's copy is the marked one.
- **Overshadowed**: something with higher precedence wins (another Override file, or a module
  `NAME.rim`, which beats `.mod`). This is the most common reason a mod change does not show up in
  game.
- **New**: no other copy exists.

If the mod is not installed yet, compare against where it would land instead: Override files
outrank every module and chitin copy.

> **Done when:** every resource from step 1 has exactly one classification.

## 3. Diff what replaces something

For each resource that loads and replaces another copy, run `kq_delta` with `shadow: true`. That
compares the loaded copy with the one it hides. For an uninstalled mod, pass the mod file as `left`
and the vanilla ResRef with `against`. Summarize each diff by changed field paths, not raw JSON.
Changes to `2da`, `dialog.tlk`, and `.git` files deserve a sentence each, because those files are
shared across many mods and conflict most often.

> **Done when:** every replacing resource has a one-line change summary.

## 4. Check references

For each new or changed resource, run `kq_graph` with `name` set to the ResRef and `missing: true`.
Flag missing targets: a creature pointing at a dialogue that does not exist, or a script calling an
absent resource. Note that the graph is a mention scan, so a script that builds names at runtime can
reference things the graph cannot see. Say so instead of claiming a reference is clean.

> **Done when:** every new or changed resource has been graph-checked.

## Report

Present findings as one table, most severe first:

| # | Severity | Resource | Finding | Evidence |
|---|----------|----------|---------|----------|

- **Broken**: the mod's intent cannot take effect (overshadowed file, missing referenced resource).
- **Risky**: works now but conflicts easily (edits to a shared `2da`, `dialog.tlk`, or `.git`).
- **Info**: loads cleanly; one-line change summary.

Evidence is the container label from `kq_which` and the field path from `kq_delta` or
`kq_graph`. Then offer to run `merge-mods` for any Risky shared-file edit.

## Honesty rules

- Report only what kq output shows. Lore about how a mod "usually" behaves is not a finding.
- If a judgment depends on something you have not queried (another mod's files, a runtime-built
  script name), say exactly that and name the query you would run.
- A short table for a clean mod is a good result. Do not pad it.
