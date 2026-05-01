---
'specward': patch
---

CLI: don't crash on a single bad YAML spec. `parseSpecFile` now runs through `Promise.allSettled`, so a malformed file (e.g. unquoted `: ` inside an `assert:` value) prints a per-file `ERROR:` line with the path and the underlying YAML message, and the rest of the specs are still parsed and reported. Exit code is `1` if any spec failed to parse, even when matching of the remaining specs would otherwise succeed.
