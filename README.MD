# Anywhere MITM Modules

Three self-contained MITM modules for YouTube, Spotify, and SoundCloud.
Readable JavaScript lives in [`scripts/`](scripts/); the `.amrs` subscriptions
embed the code, so they never download scripts from another repository.

## Quick add

Install [Anywhere](https://github.com/NodePassProject/Anywhere), then open an
**Add** link on the device where it is installed and tap **Open in Anywhere**.

| Module | What it does | Quick add | Subscription |
| --- | --- | --- | --- |
| **YouTube Ad Block & Playback** | Removes supported ads; enables picture-in-picture and background playback flags. | [Add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=youtube&ref=ffa77ba7eb57701a16b79beb1d6c4393610ae7fe) | [Copy URL](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/ffa77ba7eb57701a16b79beb1d6c4393610ae7fe/modules/youtube.amrs) |
| **Spotify Lyrics Translation** | Adds translated lyrics using your own Baidu Translate API account. | [Add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=spotify-lyrics&ref=ffa77ba7eb57701a16b79beb1d6c4393610ae7fe) | [Copy URL](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/ffa77ba7eb57701a16b79beb1d6c4393610ae7fe/modules/spotify-lyrics.amrs) |
| **SoundCloud Go+ Configuration** | Sets local Go+ plan and playback feature flags for the iOS app. | [Add](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=soundcloud&ref=ffa77ba7eb57701a16b79beb1d6c4393610ae7fe) | [Copy URL](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/ffa77ba7eb57701a16b79beb1d6c4393610ae7fe/modules/soundcloud.amrs) |

**[Add all three](https://conv3lsive.github.io/anywhere-mitm-modules/import.html?module=all&ref=ffa77ba7eb57701a16b79beb1d6c4393610ae7fe)**

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

### Spotify Lyrics Translation

Open the module's parameters and fill in:

| Parameter | Value |
| --- | --- |
| **Baidu App ID** | Your application's App ID. |
| **Baidu API key** | Your private signing key. Enter it in Anywhere. |
| **Target language** | `zh` Chinese (default), `en` English, `ru` Russian, `de` German, `fr` French, `spa` Spanish, `jp` Japanese, or `kor` Korean. |
| **Enable translation** | Switch to `true` after configuring your API account. |

Get credentials from [Baidu Translate](https://fanyi-api.baidu.com/). Translation
is off by default. When enabled, lyric text, App ID, a random salt, and an MD5
signature are sent over HTTPS to `fanyi-api.baidu.com`. Spotify authorization
headers and cookies are not forwarded; the signing key is not sent as a field.
API quotas or fees depend on your Baidu account.

Supports JSON and protobuf lyric responses and preserves original lines and
timing. Missing lyrics, API errors, and unsupported responses pass through
unchanged. This module handles lyric translation; it does not change your
Spotify subscription.

### SoundCloud Go+ Configuration

Rewrites the iOS configuration response with Go+ plan flags, offline sync,
ad-free audio, and high-quality audio flags. It makes no extra network requests.

These are local configuration changes. They do not grant a server-side
subscription or guarantee access to paid tracks, downloads, or audio quality.

## Versions and integrity

The quick-add links pin the modules to commit `ffa77ba7eb57701a16b79beb1d6c4393610ae7fe`. The scripts are
embedded in each `.amrs` file and are also available in this repository for
inspection. There are no automatic upstream script updates.

For subscriptions that follow this repository's future changes, use:

- [YouTube — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/modules/youtube.amrs)
- [Spotify lyrics — latest](https://raw.githubusercontent.com/Conv3lsive/anywhere-mitm-modules/main/modules/spotify-lyrics.amrs)
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
