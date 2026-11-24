---
name: kq-formats
description: >-
  Interpret what kq cat and kq grep print for each KotOR resource type — GFF (utc, dlg, git, are,
  uti, ...), 2DA, TLK, NCS, SSF, LIP, LTR, BWM walkmeshes, TPC, MDL, WAV — including gron and JSON
  field paths, localized strings and StrRefs, and which types are searchable text versus opaque
  bytes. Use when reading or explaining decoded resource output, citing a field, or deciding whether
  a type can be grepped. Not for choosing commands or flags (use kq-query) or for binary file-format
  specifications.
---

# kq-formats

`cat`, `grep`, and `delta` share one text projection per type. kq picks the decoder by sniffing
bytes, not by extension: `.utc` and `.dlg` are both GFF.

## Searchable, indexed, opaque

| Class | Types | What to do |
|-------|-------|------------|
| Searchable | GFF types, `2da`, `tlk`, `ssf`, `lip`, `ncs`, `ltr`, `tpc`, `mdl`, `wok`/`dwk`/`pwk`, `wav`/`bmu`, and plain text (`nss`, `lyt`, `vis`, `txi`, `ini`, `txt`) | `cat` and `grep` work directly |
| Indexed containers | `key`, `bif`, `erf`, `mod`, `sav`, `rim`, `hak` | `ls` lists their contents; they are never printed as a blob |
| Opaque | TGA, DDS, MVE, BIK, other undecoded types | Only `--raw` or `grep --include-binary` |

## Honest limits

State these when they affect the answer:

- **NCS** prints decompiled NSS by default. Decompiled code is a reconstruction, not the original
  source: names of locals are synthetic. `--disasm` (or `-f json`) gives the located instruction
  tree. Engine routine names need `nwscript.nss`, which kq finds in the install or takes from
  `--nwscript`; without it, ACTION calls keep numeric routine IDs.
- **TPC and WAV** decode to metadata (dimensions, format, mipmaps, trailing TXI; rate and
  channels). There are no pixels or samples.
- **MDL** decodes to a full model IR. A binary MDL needs its same-ResRef `.mdx` for vertex data.

## Citing a hit

`grep` reports `resource  path = value`; that path is the address. Quote it in answers and reuse it
with `cat -f gron` or `jq` on `--json` output. Never cite a byte offset into a BIF as a field.

Read [references/projections.md](references/projections.md) now if you need the exact JSON shape of
a type: GFF localized strings, 2DA row labels, TLK entries, the NCS instruction tree, or walkmesh
fields.
