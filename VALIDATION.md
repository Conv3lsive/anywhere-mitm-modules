# Validation

Validated locally on 2026-10-08:

- Deterministic offline build and SHA-256 verification passed.
- Native script syntax passed Node.js checks.
- Synthetic JSON/protobuf response tests passed, including preservation of
  timing and unknown fields, failure passthrough, and outbound-request contents.
- Import-page tests passed for one module, all three modules, and rejected input.
- The official Anywhere `MITMRuleSetParser.swift`, fetched on the review date,
  accepted all generated files. Its native JavaScriptCore syntax check accepted
  the embedded scripts. YouTube: 6 rules and 3 parameters; Spotify lyrics:
  1 rule and 4 parameters; SoundCloud: 1 rule and no parameters.

The parser check used the official parser and its rule models with storage/icon
support shims for a standalone macOS harness. These modules have not been tested
against a live YouTube, Spotify, or SoundCloud session in Anywhere.

Repeat the portable checks:

```sh
python3 tools/build.py --check
node --test tests/*.test.mjs
shasum -a 256 -c SHA256SUMS
```
