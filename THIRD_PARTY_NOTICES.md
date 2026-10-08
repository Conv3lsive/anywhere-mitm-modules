# Third-party notices

The original code in this repository is covered by [LICENSE](LICENSE). The
following third-party material retains its own license and attribution.

## YouTube response core

- Author: Maasea, [Maasea/sgmodule](https://github.com/Maasea/sgmodule).
- Source: `Script/Youtube/youtube.response.js`, snapshot
  `65075cdb388fc5e3094afd7e7314c67b243f3525`, build `2026/7/19 16:16:39`.
- Retained in `scripts/vendor/youtube-core.js` under
  [Apache License 2.0](licenses/Maasea-Apache-2.0.txt).
- Changes: removed the client adapters, original entry point, and text-codec
  polyfill; use Anywhere's UTF-8 codec and expose `youtubeTransform(input)`.
- The bundled protobuf runtime is from Tim Ostamm's
  [protobuf-ts](https://github.com/timostamm/protobuf-ts), also under
  [Apache License 2.0](licenses/protobuf-ts-Apache-2.0.txt).

## Spotify lyrics behavior reference

- Author: app2smile, [app2smile/rules](https://github.com/app2smile/rules).
- Reference: `js/spotify-lyric.js`, snapshot
  `df6366a7024e0b3f0aa3510c5b791eea6f3cba89`.
- [MIT License](licenses/app2smile-MIT.txt), copyright (c) 2023 app2smile.
- `scripts/spotify-lyrics.js` implements the lyric translation behavior using
  Anywhere's protobuf, crypto, and HTTP APIs. The reference's bundled libraries
  and general-purpose client helpers are not included.

## SoundCloud configuration behavior reference

- Reference: [Marol62926/MarScrpt](https://github.com/Marol62926/MarScrpt),
  `soundcloud.js`, snapshot `3ac7413fbcf58e2ca3e4a2b9353bccc9e4df6cce`.
- `scripts/soundcloud.js` implements the observed configuration values with a
  native Anywhere entry point. No original standalone script is vendored.
