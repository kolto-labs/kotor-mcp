---
name: merge-mods
description: >-
  Combine two KotOR mods' changes to the same resource — appearance.2da, a creature, a dialogue —
  with kq delta, patch, and a three-way merge against the vanilla copy, producing a merged file plus
  a list of real conflicts. Use when two mods ship the same file, when one mod's edit wipes out
  another's, or when the user wants a mod's changes as a portable delta to reapply elsewhere. Not for
  auditing what a single mod does (use review), and not a substitute for TSLPatcher or HoloPatcher
  installers that apply changes in-game.
---

# Merge two mods

A three-way merge needs a **base**: the vanilla copy both mods started from. Without it, every
difference looks like a conflict. kq decodes all three sides to the same projection, so the merge
works on fields and rows, not bytes.

`merge` and `patch` are CLI-only. They print results to stdout, or write the `-o` file you name.
They never write into the install.

## 1. Collect the three sides

- **base**: the vanilla copy. Use `kq which RESREF` and read its chitin, or the module copy, with
  `--from LABEL`. If vanilla is a separate clean install, use `kq delta --other`.
- **ours** and **theirs**: each mod's file, as a path or a container label.

> **Done when:** you can `kq cat` all three sides without error.

## 2. Look at each side's changes first

```bash
kq delta RESREF --from BASE_LABEL MOD_A_FILE   # what mod A changed
kq delta RESREF --from BASE_LABEL MOD_B_FILE   # what mod B changed
```

If the changed paths do not overlap, the merge will be clean. If they do, those paths are the
conflicts to resolve with the user.

> **Done when:** you can name the overlapping paths, or confirm there are none.

## 3. Merge

```bash
kq merge BASE OURS THEIRS --from BASE_LABEL -o merged.json
```

Exit 5 means conflicts remain. Each conflict appears inline as
`{ "_conflict": true, "base": …, "ours": …, "theirs": … }`. Show each one to the user and ask which
side wins. Use `--prefer ours|theirs|base` only once they have chosen a blanket policy, because it
silently picks a side for every conflict.

> **Done when:** the merge exits 0, or every remaining conflict has a decision from the user.

## 4. Hand back

The merged output is decoded JSON, not a game file. kq does not re-encode binary formats. Give the
user the merged JSON and the field-level change list. They apply it with their usual tool
(TSLPatcher/HoloPatcher `changes.ini`, the Holocron Toolset, or a 2DA editor). To carry one mod's
edits onto a different base, save them with `kq delta ... -o change.json` and apply them with
`kq patch NEW_BASE change.json -o patched.json`.
