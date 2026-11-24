# kq CLI reference

Confirm live flags with `kq --help` and `kq <command> --help`. This file tracks kq 0.5.

## Global flags

| Flag | Meaning |
|------|---------|
| `-i`, `--install PATH` | Install, capsule, folder, or file to query (env `KQ_INSTALL`) |
| `--nwscript FILE` | `nwscript.nss` for engine routine names in NCS output |
| `--text` | Human-readable output instead of JSON |
| `--color auto\|always\|never` | Colorize text output |
| `--no-cache` | Neither read nor write the index cache |
| `--refresh` | Rebuild the index and write it back |

## Per-command flags

| Command | Flags |
|---------|-------|
| `ls [PATTERN]` | `-t/--type` (repeatable), `-m/--module` (repeatable), `-s/--source`, `--loaded`, `-n/--limit`, `-q/--quiet` |
| `which RESREF` | `-t/--type`, `--format json\|text` |
| `cat [RESREF]` | `-t/--type`, `-f/--format gron\|outline\|json\|raw`, `--raw`, `--from LABEL\|FILE`, `-m/--module`, `--tag TAG` (needs `--module` and `--type`), `--disasm` |
| `grep PATTERN [GLOB]` | `-t`, `-m`, `-s`, `--ignore-case`, `-F/--fixed-strings`, `-l/--files-with-matches`, `-C/--context N`, `--loaded`, `--include-binary`, `-n/--limit` |
| `graph [NAME]` | `-t`, `-m`, `-s`, `--format lists\|tree\|summary`, `--depth N`, `--no-assets`, `--missing`, `-q`, `-n` |
| `delta LEFT [RIGHT]` | `--from`, `--against`, `--shadow`, `--other INSTALL`, `--envelope`, `-o FILE` |
| `patch TARGET DELTA` | `--from`, `--envelope`, `-o FILE` |
| `merge BASE OURS THEIRS` | `--from`, `--from-ours`, `--from-theirs`, `--prefer ours\|theirs\|base`, `--envelope`, `-o FILE` |
| `cache status\|clear` | — |
| `mcp` | Serves the read-only commands over MCP stdio; global `-i` sets the default install |

## Source kinds (`-s`)

`override`, `module-mod`, `module-rim`, `lips`, `texturepack`, `rims`, `stream`, `chitin`,
`talktable`, `loose` (standalone files and folders).

## Resolve order

Highest precedence first: Override; the module's `NAME.rim` (IFO/ARE/GIT); `NAME.mod`; `_s.rim` and
`_dlg.erf`; lips; texture packs; `rims/`; streams; chitin BIFs. `kq which` prints copies in this
order and marks the one that loads. Rely on that output, not on remembered rules.

## Recipes

```bash
kq -i "$KQ_INSTALL" info
kq which appearance.2da
kq ls -t utc -m danm13 --loaded
kq cat n_bastila.utc -f gron
kq cat appearance.2da --from 'data/2da.bif' -f gron
kq cat --module end_m01aa --tag end_door01 -t utd
kq grep Bastila -t dlg -n 10
kq grep --ignore-case GetObjectByTag -t ncs
kq -i ./modules/danm13.mod ls -t git
kq graph --format summary
kq graph end_m01aa --missing
kq delta appearance.2da --shadow
kq delta n_bastila.utc --other /path/to/vanilla -o change.json
kq patch n_bastila.utc change.json -o patched.json
kq merge stock.json mine.json theirs.json --prefer ours
```

## Environment

| Variable | Role |
|----------|------|
| `KQ_INSTALL` | Default `--install` |
| `KQ_CACHE_DIR` | Index cache directory (default: the platform cache dir) |

Standalone file, folder, and capsule targets are never cached.
