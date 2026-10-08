# Validation

Validated locally on 2026-10-08:

- Deterministic offline build and SHA-256 verification passed.
- Native script syntax passed Node.js checks.
- Synthetic JSON/protobuf response tests passed, including Spotify bootstrap
  and customization attributes, unknown-field preservation, failure passthrough,
  URL/header rule scope, and routing helpers. The trial also covers its smaller
  attribute set, UI options, local service responses, and disabling service
  blocking. 22 portable tests passed.
- The native trial's account attributes and UI values matched the downloaded
  reference on four successful protobuf fixtures: bootstrap and customization,
  each with default and changed UI options. Field order was compared semantically.
- Import-page tests passed for one module, all three modules with routing
  helpers, separate trial import, earlier pinned releases, and rejected input.
- The official Anywhere `MITMRuleSetParser.swift`, fetched on the review date,
  accepted all generated files. Its native JavaScriptCore syntax check accepted
  the embedded scripts. YouTube: 6 rules and 3 parameters; Spotify Premium:
  7 rules and no parameters; SoundCloud: 1 rule and no parameters.
  Spotify Ad Block Trial: 2 rules and 3 parameters.
- The official Anywhere `RoutingRuleParser.swift` accepted both `.arrs` files,
  including 5 rejection rules with an initial REJECT assignment and 4 network
  rules with an initial Default assignment.

The parser check used the official parser and its rule models with storage/icon
support shims for a standalone macOS harness. These modules have not been tested
against a live YouTube, Spotify, or SoundCloud session in Anywhere.

User feedback on 2026-10-08: Spotify 9.1.88.2209 skips tracks after a few seconds
and then stops with this subscription in Anywhere and QUIC set to Automatic.
The cause is not yet isolated; passing the checks above does not establish
playback compatibility. See the README's playback troubleshooting steps.

Repeat the portable checks:

```sh
python3 tools/build.py --check
node --test tests/*.test.mjs
shasum -a 256 -c SHA256SUMS
```
