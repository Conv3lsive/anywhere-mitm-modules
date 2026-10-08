# Spotify playback research

Checked on **2026-10-08**, after a user reported playback failures with
Spotify **9.1.88.2209** in Anywhere. Both the Premium module and the Ad Block
Trial failed to resolve the skips. The same track plays normally through the
same proxy when all Spotify MITM modules are disabled.

**No reviewed candidate has confirmed Spotify 9.1.88 playback in Anywhere.**
This search compares source changes and compatibility claims; it does not
replace a device test or a full security review of the external projects.

## Candidates

| Source | Relevant update | What differs | Assessment |
| --- | --- | --- | --- |
| [app2smile/rules](https://github.com/app2smile/rules) | Core script commit: [2026-02-25](https://github.com/app2smile/rules/commit/e2c6f341eff294ce863658b95a490143183314b9). | Basis of this repository's original Premium attribute changes. | The matching 3–5 second skip report remains [open](https://github.com/app2smile/rules/issues/274). No newer core fix was found in its file history. |
| [YuXilong Spotify.module](https://github.com/YuXilong/surge-modules/blob/e8329928cd1cd89cab722369c4b99ccbaa2e46b8/Spotify.module) | Repository active in September 2026. | Additional desktop ad-domain blocking and macOS cache instructions. | Its `js/spotify-proto.js` is byte-identical to the app2smile snapshot already reviewed here. A new repository date does not mean new iOS playback logic. |
| [kiki0-zz spotify.plugin](https://github.com/kiki0-zz/QX_rules/blob/c99eb22bce0c20e73b4b51c2397dff63b3f5e372/loon/master/spotify.plugin) | File header: 2026-08-21. | Returns JSON objects for two ad endpoints to address conflicts with other ad blockers. | Still uses app2smile's core script. Its UDP/443 rule is global. No device verification on 9.1.88 was found. |
| [001ProMax Spotify.Crack.Dev.js](https://github.com/001ProMax/Surge/blob/2e3eb28d163d5e5de4d2f2532fe71eba22666634/Script/Spotify.Crack.Dev.js) | Script commit: 2026-07-26. | Smaller bundled codec, fetch-style client adapter, plan-drawer change. | Account changes closely follow the older app2smile set; no current-version playback fix was established. This is different from the ten-attribute kelee provider used as the trial's reference. |
| [Amlabort spot-NoAd.module](https://raw.githubusercontent.com/Amlabort/MY_clash/main/files/surge/spot-NoAd.module) | Core script commit: [2026-04-25](https://github.com/Amlabort/MY_clash/commit/ace980176335227337e8c4a5eeb8bae070cf5dae). Module header: 2026-04-26. | Extra UI/ad response scripts, removal of bootstrap trial data, and replacement of resolved configuration from a static snapshot. | Genuinely different behavior, but aggressive: 883 property records in the static override array, and the active merge code does not retain unmatched live assignments. Suggested in the skip issue, without a confirmed 9.1.88/Anywhere result. |
| [EeveeSpotifyReincarnated](https://github.com/SideloadLabs/EeveeSpotifyReincarnated) | README: 2026-10-05, Spotify 9.1.88. Reviewed tree: `9b32d81073daaec4dfb47ff5b6fc63a25e0bf16f`. | Current account mutations, trial-key removals, playback timeout/capping configuration changes, and native app hooks. | A current-version reference, but it is an app tweak requiring a patched app or tweak installation. It cannot be imported as an Anywhere subscription. |

The cloned `mickeu/spotify-modules` repository was empty at the time of review
and supplies no usable candidate.

## Current-version differences

The reviewed Eevee implementation
[removes trial-related account keys and modifies playback configuration](https://github.com/SideloadLabs/EeveeSpotifyReincarnated/blob/9b32d81073daaec4dfb47ff5b6fc63a25e0bf16f/Sources/EeveeSpotify/Premium/DynamicPremium%2BModifyingFunctions.swift).
For example, it adds `player-license-v2`, removes `on-demand-trial`,
`on-demand-trial-in-progress`, and `smart-shuffle`, and modifies existing
playback-timeout flags. These changes are absent from the two published
Spotify implementations in this repository.

It also [preserves real server-controlled entitlements](https://github.com/SideloadLabs/EeveeSpotifyReincarnated/blob/9b32d81073daaec4dfb47ff5b6fc63a25e0bf16f/Sources/EeveeSpotify/Premium/Helpers/ServerSidedFeaturePolicy.swift),
including offline, audio-quality, and several social-session attributes.
Its protobuf model preserves unknown bootstrap fields; Amlabort's explicit
trial-response removal is therefore not a universal requirement shared by
the current-version project.

These are source observations, not proof that any individual change fixes
the reported failure. Eevee also patches app behavior outside network
responses, so its claimed app compatibility cannot be transferred to an MITM
rewrite by copying account attributes alone.

## What the playback comparison establishes

Normal playback with Spotify MITM disabled narrows the issue to the enabled
MITM path, including HTTPS interception and response/request mutations. It
does not isolate the protobuf changes from the transport or host scope.
Before another compatibility variant is treated as a fix, compare MITM with
all mutations disabled and inspect a sanitized playback error or response.

The September [upstream comments](https://github.com/app2smile/rules/issues/274)
contain QUIC/UDP workarounds that helped only some tracks in another client.
They do not establish a general Anywhere fix.

Account region is another possible factor mentioned by the authors, and
[Spotify documents country-related playback issues](https://support.spotify.com/us/article/cant-play-abroad/).
The user's account/proxy countries were not provided, and working playback
without MITM means a region problem must not be assumed to be the cause.
