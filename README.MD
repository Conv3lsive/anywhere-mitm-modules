# Anywhere MITM Modules

Four self-contained MITM modules for YouTube, Spotify, SoundCloud, and Reddit.
Readable JavaScript lives in [`scripts/`](scripts/); the `.amrs` subscriptions
embed the code, so they never download scripts from another repository.

## Quick add

Install [Anywhere](https://github.com/NodePassProject/Anywhere), then open an
**Add** link on the device where it is installed and tap **Open in Anywhere**.

| Module | What it does | Quick add | Subscription |
| --- | --- | --- | --- |
| **YouTube Ad Block & Playback** | Removes supported ads; enables picture-in-picture and background playback flags. | [Add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=youtube&ref=85dc221246a0ba7bd9e41c807102b2b9afa29f48) | [Copy URL](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/85dc221246a0ba7bd9e41c807102b2b9afa29f48/modules/youtube.amrs) |
| **Spotify Premium** | Enables Premium playback controls, removes trial restrictions, and blocks selected ads. | [Add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=spotify&ref=85dc221246a0ba7bd9e41c807102b2b9afa29f48) | [Copy URL](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/85dc221246a0ba7bd9e41c807102b2b9afa29f48/modules/spotify.amrs) |
| **SoundCloud Go+ Configuration** | Sets local Go+ plan and playback feature flags for the iOS app. | [Add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=soundcloud&ref=85dc221246a0ba7bd9e41c807102b2b9afa29f48) | [Copy URL](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/85dc221246a0ba7bd9e41c807102b2b9afa29f48/modules/soundcloud.amrs) |
| **Reddit Ad Block** | Removes supported feed and comment ads, with an optional NSFW prompt setting. | [Add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=reddit&ref=85dc221246a0ba7bd9e41c807102b2b9afa29f48) | [Copy URL](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/85dc221246a0ba7bd9e41c807102b2b9afa29f48/modules/reddit.amrs) |

**[Add all four](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=all&ref=85dc221246a0ba7bd9e41c807102b2b9afa29f48)**

Quick-add links use a fixed commit. Refreshing these subscriptions keeps the
same reviewed code. The import page has no external scripts or analytics.

## Setup

1. In Anywhere, install its generated MITM certificate and enable full trust in
   your device's certificate settings.
2. Enable MITM and the modules you want to use.
3. Restart the target app. For Spotify, follow the additional setup below.

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

Sets Premium account attributes, removes selected Free/trial restrictions,
and applies a fixed playback configuration. It processes bootstrap and
customization responses locally, including `player-license-v2`, trial-key
removal, and the bootstrap trial wrapper. Selected ad and service requests
receive local responses; optional feed filtering handles supported protobuf
layouts. No API keys or extra network requests are needed.

**User-confirmed playback:** on 2026-10-08, a user reported that music now
plays normally with this implementation in Anywhere on Spotify **9.1.88.2209**.
This is a report from one setup; other app versions and environments can differ.

**The Add button imports three sets:**

| Set | Where to configure it | Action |
| --- | --- | --- |
| **Spotify Premium** | MITM | Enable. |
| **Spotify Ads** | Routing | Keep on **REJECT** (selected on first import). |
| **Spotify Network** | Routing | Select your existing proxy or **PROXY**. |

Use **Rule** mode and leave the built-in Spotify routing set on **Default**
so it does not override the custom ad rule. Set streaming quality to **Normal**
for Wi-Fi and cellular, and use **Block QUIC: Automatic**. Sign out and sign
in again after first enabling the module to refresh cached customization.
Enable only one Spotify MITM module; remove older Spotify sets when migrating.

Manual routing subscriptions:
[Spotify Ads](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/85dc221246a0ba7bd9e41c807102b2b9afa29f48/routing/spotify-reject.arrs),
[Spotify Network](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/85dc221246a0ba7bd9e41c807102b2b9afa29f48/routing/spotify-network.arrs).

| Option | Default | Use |
| --- | --- | --- |
| **Apply module changes** | On | Account, service, and optional feed changes. Turn off to compare without these mutations; customization cache-validator removal remains active. |
| **Replace playback configuration** | On | Replace existing assignments with 875 fixed configuration records. This can also affect UI and other features. Turn off to retain live assignments while applying account changes. |
| **Filter feed advertisements** | Off | Optional structural filtering for supported search, home, and scroll responses. |

After changing playback configuration, sign in again and restart Spotify.
Selected Gabo requests receive an empty 200 response; selected Pendragon,
regional plan-view, and AI DJ requests receive a local 403 response.
Spotify Ads rejects `aet.spotify.com` and its subdomains. Spotify Network uses
host keywords/suffixes; the `spotify` keyword also matches hostnames containing
that word outside `spotify.com`.

Anywhere's suffix matching requires intercepting `spotify.com` to cover
regional `*-spclient.spotify.com` hosts. Other intercepted paths are forwarded
unchanged. Automatic blocks QUIC for proxied destinations and MITM-listed hosts;
`.arrs` cannot express a Spotify-only UDP rejection rule.

If playback fails, compare **Replace playback configuration: Off** after
signing in again. To compare HTTPS interception without script changes, turn
off **Apply module changes** and disable **Spotify Ads**, then sign in again.
Include the Spotify/Anywhere versions and sanitized errors in a report.

Premium/offline attributes are local flags. They do not create a paid
server-side subscription; Very High audio quality, downloads, audiobooks, and
other server-controlled features may remain unavailable. Unsupported or error
responses are kept unchanged.

Readable files: [account rewrites](scripts/spotify-premium.js),
[service responses](scripts/spotify-services.js),
[optional feed filtering](scripts/spotify-feeds.js), and
[configuration data](data/spotify-amlabort-config.json).

### SoundCloud Go+ Configuration

Rewrites the iOS configuration response with Go+ plan flags, offline sync,
ad-free audio, and high-quality audio flags. It makes no extra network requests.

These are local configuration changes. They do not grant a server-side
subscription or guarantee access to paid tracks, downloads, or audio quality.

### Reddit Ad Block

Removes supported advertising nodes from Reddit's GraphQL JSON responses,
including feed ad posts, ad metadata/payload nodes, and comment-page ads.
Ordinary content is retained. All processing is local; the script makes no
extra network requests and stores no response data.

- **Disable NSFW prompts:** enabled by default, matching the source module.
  Turn off to keep Reddit's normal sensitive-content flags and prompts. This
  setting is independent of ad removal.
- **Forced translation:** disabled. The source's two request-header rules for
  Simplified Chinese translation are omitted; the JavaScript is copied unchanged.

Enable the MITM module and restart Reddit. Rewrites are scoped to `gql.reddit.com`
and `gql-fed.reddit.com`; no additional routing set is required. Use Anywhere's
QUIC Automatic mode if HTTP/3 prevents interception.

Malformed JSON, unchanged content, and responses beyond the script's nesting
limit retain their original bytes. App/schema changes can affect ad removal;
this module has synthetic validation but no live Reddit verification yet.
Readable code: [scripts/reddit.js](scripts/reddit.js).

## Versions and integrity

The quick-add links pin all modules to commit
`85dc221246a0ba7bd9e41c807102b2b9afa29f48`. Scripts and configuration data are
embedded in each `.amrs` file and are also available in this repository for
inspection. There are no automatic upstream script updates.

For subscriptions that follow this repository's future changes, use:

- [YouTube — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/modules/youtube.amrs)
- [Spotify Premium — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/modules/spotify.amrs)
- [Spotify Ads — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/routing/spotify-reject.arrs)
- [Spotify Network — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/routing/spotify-network.arrs)
- [SoundCloud — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/modules/soundcloud.amrs)
- [Reddit Ad Block — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/modules/reddit.amrs)

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

The build reads only local files. See [validation notes](VALIDATION.md) for test
coverage and [third-party notices](THIRD_PARTY_NOTICES.md) for authors and licenses.
