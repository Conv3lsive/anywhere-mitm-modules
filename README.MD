# Anywhere MITM Modules

Three self-contained MITM modules for YouTube, Spotify, and SoundCloud.
Two optional Spotify trials provide separate playback comparisons.
Readable JavaScript lives in [`scripts/`](scripts/); the `.amrs` subscriptions
embed the code, so they never download scripts from another repository.

## Quick add

Install [Anywhere](https://github.com/NodePassProject/Anywhere), then open an
**Add** link on the device where it is installed and tap **Open in Anywhere**.

| Module | What it does | Quick add | Subscription |
| --- | --- | --- | --- |
| **YouTube Ad Block & Playback** | Removes supported ads; enables picture-in-picture and background playback flags. | [Add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=youtube&ref=be99056a6233fe2a3a1ae0d05625a4d5c50f4763) | [Copy URL](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/be99056a6233fe2a3a1ae0d05625a4d5c50f4763/modules/youtube.amrs) |
| **Spotify Premium** | Sets Premium playback flags, removes supported ads and shuffle restrictions, and adjusts mobile API requests. | [Add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=spotify&ref=be99056a6233fe2a3a1ae0d05625a4d5c50f4763) | [Copy URL](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/be99056a6233fe2a3a1ae0d05625a4d5c50f4763/modules/spotify.amrs) |
| **SoundCloud Go+ Configuration** | Sets local Go+ plan and playback feature flags for the iOS app. | [Add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=soundcloud&ref=be99056a6233fe2a3a1ae0d05625a4d5c50f4763) | [Copy URL](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/be99056a6233fe2a3a1ae0d05625a4d5c50f4763/modules/soundcloud.amrs) |

**[Add all three](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=all&ref=be99056a6233fe2a3a1ae0d05625a4d5c50f4763)**

Optional: **[Add Spotify Ad Block Trial](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=spotify-adblock&ref=9dc12435a05ea2b4d2d9d28fe435a2304638aa15)**
for a separate playback comparison. Read its setup instructions below.

Optional: **[Add Spotify Snapshot Trial](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=spotify-snapshot&ref=d3fc27488eaa48e91a7ef39a6cf464c142ab72d6)**
to test an alternative playback configuration. Enable only one Spotify MITM trial.

Quick-add links use a fixed commit. Refreshing these subscriptions keeps the
same reviewed code. The import page has no external scripts or analytics.

## Setup

1. In Anywhere, install its generated MITM certificate and enable full trust in
   your device's certificate settings.
2. Enable MITM and the modules you want to use.
3. Restart the target app. If its traffic uses HTTP/3, enable Anywhere's QUIC
   blocking option so the app can fall back to HTTP/2 or HTTP/1.1.

For manual setup, copy a **Subscription** URL from the table into Anywhere's
MITM subscription screen. Each module can be enabled independently.

## Module details

### YouTube Ad Block & Playback

Processes supported YouTube API responses to remove ad placements and set
picture-in-picture and background playback flags. It also blocks selected ad
tracking endpoints and handles a CDN playback redirect.

- **Hide upload button:** enabled by default.
- **Hide immersive tab:** enabled by default.
- **Hide Shorts tab:** disabled by default.

Uses `youtubei.googleapis.com`, `www.youtube.com`, `s.youtube.com`, and
`googlevideo.com`. Anywhere matches hosts by suffix, so the CDN entry also
intercepts redirector hosts; the CDN rewrite rules leave those requests
unchanged. Features depend on the YouTube app version and response format.

### Spotify Premium

Rewrites Spotify's bootstrap and customization responses with Premium account
attributes: ad-free playback, on-demand playback, unrestricted selection, and
disabled forced shuffle. It also changes artist/album requests from
`platform=iphone` to `platform=ipad` and removes the customization cache
validator so Spotify can fetch a fresh response.

No API keys or translation account are needed. All script processing is local;
the module makes no extra network requests.

**The Add button imports three sets:**

| Set | Where to configure it | Action |
| --- | --- | --- |
| **Spotify Premium** | MITM | Enable. |
| **Spotify Ads & Diagnostics** | Routing | Keep on **REJECT** (selected on first import). |
| **Spotify Network** | Routing | Select your existing proxy or **PROXY**. |

Use **Rule** mode for the routing sets. Leave the built-in Spotify routing set
on **Default** so it does not override the custom reject rules. Domain rules
follow Anywhere's routing priority; the `spotify` keyword also matches hostnames
containing that word outside `spotify.com`.

Manual import links:
[ad and diagnostic blocking](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/be99056a6233fe2a3a1ae0d05625a4d5c50f4763/routing/spotify-reject.arrs),
[Spotify proxy routing](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/be99056a6233fe2a3a1ae0d05625a4d5c50f4763/routing/spotify-network.arrs).

Restart Spotify after enabling the sets. Start with **Block QUIC: Automatic**:
Anywhere blocks QUIC for proxied destinations and MITM-listed hosts in this
mode, allowing clients to fall back to TCP. `.arrs` cannot express a
Spotify-only UDP rejection rule.
If you previously added **Spotify Lyrics Translation**, remove or disable that
set first so its more-specific hostname does not take precedence.

Anywhere's suffix matching requires intercepting `spotify.com` to cover regional
`*-spclient.spotify.com` hosts. Only the listed API and ad paths are rewritten;
other intercepted Spotify requests are forwarded unchanged.

Premium, offline, high-bitrate, and audiobook attributes are local flags. The
module does not create a paid server-side subscription, and downloads, Very High
audio quality, audiobooks, or other server-controlled features may remain
unavailable. Unsupported or error responses are kept unchanged.

#### Tracks skip after a few seconds

The [script author's instructions](https://github.com/app2smile/rules#spotify)
explicitly exclude **Very High** audio quality. Similar 3–5 second skips are
also reported in [upstream issue #274](https://github.com/app2smile/rules/issues/274);
that report does not establish the cause of an individual failure.

Test one change at a time, restarting Spotify and retrying the same tracks:

1. Set streaming quality to **Normal** for both Wi-Fi and cellular. Keep QUIC
   on **Automatic** for this first test.
2. If skipping continues, temporarily test **Purify → Block QUIC → Unblocked**
   with **Block UDP** off. HTTP/3 traffic can then bypass these MITM rules, so
   this is a transport diagnostic, not a guaranteed Premium setup. Restore
   **Automatic** if it makes no difference.
3. Restore the initial QUIC setting, then temporarily disable **Spotify Ads &
   Diagnostics** to check the extra domain blocks. Re-enable it if unchanged.
4. Disable **Spotify Premium** MITM while retaining the same proxy route and
   retry. If ordinary playback works only with MITM off, report that difference
   along with the Spotify and Anywhere versions. If it still fails, compare
   another fixed proxy before changing the script.

Keep one fixed proxy throughout the first four tests. Include relevant error
messages in a report, but omit authorization headers, cookies, and tokens.
QUIC behavior is defined in Anywhere's
[QUIC policy](https://github.com/NodePassProject/Anywhere/blob/main/Shared/Models/QUICPolicy.swift).

### Spotify Ad Block Trial

[Quick add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=spotify-adblock&ref=9dc12435a05ea2b4d2d9d28fe435a2304638aa15)
imports the trial MITM module and **Spotify Network**. For manual import,
[copy the subscription URL](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/9dc12435a05ea2b4d2d9d28fe435a2304638aa15/modules/spotify-adblock.amrs).

An experimental alternative with ten account-attribute changes and optional
local responses for selected service endpoints. It does not add the Premium
module's high-bitrate, audiobook, catalogue, subscription-expiry, or shuffle
attributes. Existing attributes outside its smaller set are preserved.
This is a playback comparison, not a confirmed fix for Spotify 9.1.88.2209.
User feedback on 2026-10-08: the trial did not resolve playback skips on that
version; the same track plays normally through the same proxy with Spotify
MITM disabled. See [current module research](SPOTIFY_RESEARCH.md) for reviewed
alternatives and the limits of their compatibility claims.

Before testing, disable **Spotify Premium**, **Spotify Lyrics Translation**,
and **Spotify Ads & Diagnostics**. Enable only **Spotify Ad Block Trial** for
Spotify MITM, and keep **Spotify Network** assigned to the same fixed proxy.
Use **Normal** streaming quality and **Block QUIC: Automatic** for the first
test. Sign out and sign in again to refresh cached customization responses.

- **Block extra service endpoints:** enabled by default. Returns local 200
  responses for selected `pendragon`, `gabo-receiver-service`, `pushka-tokens`,
  ad, and offline endpoints. If playback still stops, turn this off and restart
  Spotify to compare the account rewrites alone.
- **Hide Create tab:** disabled by default.
- **Allow Apple Handoff:** enabled by default; retains the server's setting.
  Disable to turn off the matching sharing flag.

Sign in again after changing the UI options. The module hides the existing
Your Plan side-drawer row. It leaves artist/album URLs unchanged and imports
no additional ad-domain routing set. The scripts make no extra network requests
and keep unsupported responses unchanged. Premium and offline flags remain
local configuration; server-controlled features are not guaranteed.

The trial is installed separately and is excluded from **Add all three**.
Readable code: [account and UI settings](scripts/spotify-adblock.js),
[service responses](scripts/spotify-adblock-services.js).

### Spotify Snapshot Trial

[Quick add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=spotify-snapshot&ref=d3fc27488eaa48e91a7ef39a6cf464c142ab72d6)
imports the MITM trial, **Spotify Snapshot Ads**, and **Spotify Network**.
For manual import, copy these subscription URLs:
[MITM module](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/d3fc27488eaa48e91a7ef39a6cf464c142ab72d6/modules/spotify-snapshot.amrs),
[ad routing](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/d3fc27488eaa48e91a7ef39a6cf464c142ab72d6/routing/spotify-snapshot-ads.arrs),
[proxy routing](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/d3fc27488eaa48e91a7ef39a6cf464c142ab72d6/routing/spotify-network.arrs).

An experimental Spotify playback profile that sets Premium account attributes,
removes selected Free/trial markers, and replaces resolved playback assignments
with a fixed configuration snapshot. It adds `player-license-v2`, removes
`on-demand-trial` and `smart-shuffle`, and removes the bootstrap trial wrapper.
The default snapshot contains 875 assignments after exclusions and replaces
all existing assignments. This can change UI and features beyond playback.

**Setup for the first test:**

1. Disable other Spotify MITM sets, including **Spotify Premium**, **Spotify Ad
   Block Trial**, and **Spotify Lyrics Translation**. Disable the older
   **Spotify Ads & Diagnostics** routing set.
2. Enable **Spotify Snapshot Trial**. Keep **Spotify Snapshot Ads** on **REJECT**
   and **Spotify Network** on the same fixed proxy used for ordinary playback.
   Use Rule mode and leave the built-in Spotify routing set on Default.
3. Keep streaming quality on **Normal** and **Block QUIC: Automatic**. Sign out
   and sign in again to refresh customization, then retry the same track.

| Option | Default | Use |
| --- | --- | --- |
| **Apply module changes** | On | Account, service, and optional feed changes. Turn off for a comparison without these mutations; customization cache-validator removal remains active. |
| **Replace playback configuration** | On | Use the fixed assignment snapshot. If playback fails, turn off, sign in again, and retry to compare account changes alone. |
| **Filter feed advertisements** | Off | Optional structural filtering of supported search, home, and scroll protobuf fields. Leave off for the first playback test. |

Selected Gabo requests receive an empty 200 response; selected Pendragon,
regional plan-view, and AI DJ requests receive a local 403 response.
The separate routing helper rejects `aet.spotify.com` and its subdomains.
Artist/album URLs are left unchanged. The scripts make no extra network
requests, and unsupported responses are retained.

This trial has not been verified on Spotify 9.1.88.2209 in Anywhere. It is
installed separately and excluded from **Add all three**. Premium/offline
attributes remain local flags; server-controlled features are not guaranteed.
To compare HTTPS interception without script changes, turn off **Apply module
changes**, disable **Spotify Snapshot Ads**, sign in again, and retry. To stop
the experiment, disable the entire trial and its ad routing set.

Readable files: [account rewrites](scripts/spotify-snapshot.js),
[service responses](scripts/spotify-snapshot-services.js),
[optional feed filtering](scripts/spotify-snapshot-feeds.js), and
[configuration data](data/spotify-amlabort-config.json).

### SoundCloud Go+ Configuration

Rewrites the iOS configuration response with Go+ plan flags, offline sync,
ad-free audio, and high-quality audio flags. It makes no extra network requests.

These are local configuration changes. They do not grant a server-side
subscription or guarantee access to paid tracks, downloads, or audio quality.

## Versions and integrity

The three primary modules are pinned to commit
`be99056a6233fe2a3a1ae0d05625a4d5c50f4763`; the optional Spotify trial is pinned
to `9dc12435a05ea2b4d2d9d28fe435a2304638aa15`, and the Snapshot Trial is pinned
to `d3fc27488eaa48e91a7ef39a6cf464c142ab72d6`. The scripts are
embedded in each `.amrs` file and are also available in this repository for
inspection. There are no automatic upstream script updates.

For subscriptions that follow this repository's future changes, use:

- [YouTube — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/modules/youtube.amrs)
- [Spotify Premium — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/modules/spotify.amrs)
- [Spotify Ad Block Trial — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/modules/spotify-adblock.amrs)
- [Spotify Snapshot Trial — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/modules/spotify-snapshot.amrs)
- [Spotify Snapshot Ads — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/routing/spotify-snapshot-ads.arrs)
- [Spotify ad blocking — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/routing/spotify-reject.arrs)
- [Spotify proxy routing — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/routing/spotify-network.arrs)
- [SoundCloud — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/modules/soundcloud.amrs)

Those `main` links change when this repository is updated. Review changes before
switching from a pinned version. [SECURITY.md](SECURITY.md) records the code review
and data flows; [SHA256SUMS](SHA256SUMS) records the generated file hashes.

## Build and verify

Requires Python 3 and Node.js; no package downloads are needed.

```sh
python3 tools/build.py
python3 tools/build.py --check
node --test tests/*.test.mjs
shasum -a 256 -c SHA256SUMS
```

The build reads only local files. See
[validation notes](VALIDATION.md) for test coverage and
[third-party notices](THIRD_PARTY_NOTICES.md) for authors and licenses.
