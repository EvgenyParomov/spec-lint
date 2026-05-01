# specward

## 0.1.2

### Patch Changes

- 89db758: CLI: don't crash on a single bad YAML spec. `parseSpecFile` now runs through `Promise.allSettled`, so a malformed file (e.g. unquoted `: ` inside an `assert:` value) prints a per-file `ERROR:` line with the path and the underlying YAML message, and the rest of the specs are still parsed and reported. Exit code is `1` if any spec failed to parse, even when matching of the remaining specs would otherwise succeed.

## 0.1.1

### Patch Changes

- 5e64b0a: Verify Trusted Publishing pipeline (OIDC + provenance) by releasing a no-op patch through GitHub Actions.

## 0.1.0

### Minor Changes

- 9f4cb27: Initial release. CLI tool for spec-driven development: validates `*.spec.yaml` files against test files using SWC AST analysis. Reports specs without tests as errors and tests without specs as warnings.
