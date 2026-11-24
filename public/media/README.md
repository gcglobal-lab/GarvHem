# Media files

All paths live in `src/config/media.ts`. Replace a file with the same name, or point the config at a new
file. A path set to `null` shows a generated visual instead, so nothing ever looks broken. Files here are
public: never put private documents in this folder.

| File | Size | Aspect | Used on | How to replace |
|---|---|---|---|---|
| `videos/hero.mp4` | 1920x1080, about 12 s loop, H.264 yuv420p faststart, no audio, up to 2.5 MB | 16:9 | Home hero background | Same name, or `media.hero.video.mp4`. `null` shows the poster only |
| `videos/hero.webm` | Same clip, VP9, up to 2 MB | 16:9 | Home hero (preferred by browsers that support it) | Replace together with the MP4, or set `media.hero.video.webm` to `null` |
| `videos/hero-poster.webp` | 1920x1080, up to 120 KB, must match the first frame | 16:9 | Home hero first paint, reduced motion, slow connections | `media.hero.poster` |
| `videos/process.mp4` | 1280x720, 20 to 60 s, up to 3 MB | 16:9 | "See how we work" dialog (Home, How it works) | Same name, or set `media.process.video` to `{ kind: "embed", url: "<YouTube or Vimeo link>" }`. Update `durationLabel` |
| `videos/process.webm` | Same clip, VP9 | 16:9 | Same | Replace together with the MP4, or `null` |
| `videos/process-poster.webp` | 1280x720, up to 80 KB | 16:9 | Cover of the process video | `media.process.poster` |
| `team/hemant-singh.jpg` (not supplied yet) | 1200x1500 | 4:5 | Founder note (Home, About) | Add the file, then set `media.founder.photo` to `{ src: "/media/team/hemant-singh.jpg", width: 1200, height: 1500, alt: "Hemant Singh" }` |
| `images/login.jpg` (not supplied yet) | 1600x2000 | 4:5, safe area in the centre | Sign-in page panel | Add the file, then set `media.login.image` |
| `services/<slug>.jpg` (not supplied yet) | 1600x1200 | 4:3 | Header of each service page | Add the file, then set `media.services["<slug>"]`. Slugs: `web-development`, `accounting-bookkeeping`, `cloud-services`, `it-support`, `it-consulting`, `dedicated-offshore-talent`, `custom-requirements` |
| `images/og.jpg` (optional) | 1200x630 | 1.91:1 | Social share preview | Set `media.og` to `"/media/images/og.jpg"`. `null` uses the generated image |
| `images/brand/garvhem-logo-original.png` | 1536x1024 | 3:2 | Source artwork, not shown on the site | Keep |
| `images/brand/garvhem-mark.svg` | vector | 13:12 | Brand mark for other uses | Keep |
| `images/brand/icon-192.png`, `icon-512.png` | 192x192, 512x512 | 1:1 | Web app manifest, structured data logo | Same names |

Compress a new hero clip:

```
ffmpeg -i in.mov -an -vf "scale=1920:-2,format=yuv420p" -c:v libx264 -crf 27 -preset veryslow -movflags +faststart hero.mp4
ffmpeg -i in.mov -an -vf "scale=1920:-2" -c:v libvpx-vp9 -crf 38 -b:v 0 hero.webm
ffmpeg -i hero.mp4 -frames:v 1 -quality 80 hero-poster.webp
```
