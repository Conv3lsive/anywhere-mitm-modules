# Validation

**User-confirmed Spotify playback:** on 2026-10-08, the user reported that all
music plays normally with the snapshot-based implementation in Anywhere on
Spotify **9.1.88.2209**. That implementation is now the sole Spotify module,
published as Spotify Premium. This report covers one user setup, not universal
compatibility or all Premium features.

Validated locally on 2026-10-08:

- Deterministic offline build and SHA-256 verification passed.
- Synthetic JSON/protobuf tests cover Spotify bootstrap/customization account
  rewrites, trial-key removals, all 875 assignments, configuration/mutation
  switches, service-response scope, structural feed filtering, embedded data,
  and preservation of unrelated fields and unsupported responses.
- Spotify account changes, deletions, and all 875 assignments matched the
  pinned Amlabort provider on successful bootstrap/customization fixtures.
  Expiry timestamps were checked separately because the scripts run at
  different instants.
- Promotion preserves the working rules, parameters, configuration data, and
  script behavior. Only names, source paths, and generic log labels changed.
- Import-page tests cover Spotify alone, all three modules with two routing
  helpers, the earlier working snapshot link, and rejected inputs/retired IDs.
- 17 portable tests passed.
- The official Anywhere MITM parser accepted every generated file and its
  JavaScriptCore syntax check accepted embedded scripts: YouTube has 6 rules
  and 3 parameters; Spotify Premium has 4 rules and 3 parameters; SoundCloud
  has 1 rule and no parameters.
- The official routing parser accepted both helpers: Spotify Ads has 1 rejection
  rule with initial REJECT assignment; Spotify Network has 4 rules with initial
  Default assignment.

Parser checks use official rule/parser sources with storage/icon support shims
in a standalone macOS harness. The assistant has not independently tested a
live session on the user's device. YouTube and SoundCloud lack live verification
in this session.

Repeat the portable checks:

```sh
python3 tools/build.py --check
node --test tests/*.test.mjs
shasum -a 256 -c SHA256SUMS
```
