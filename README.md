# VALLORA

Single page brand site for [@vallorawear](https://www.instagram.com/vallorawear/).
Static HTML, CSS and vanilla JS. No build step, no dependencies.

```
index.html
assets/
  css/style.css
  js/main.js
  img/vallora-*.jpg
netlify.toml
```

## Run locally

```
python -m http.server 8123 --directory .
```

Then open http://localhost:8123.

## Deploy

Drag the folder into Netlify, or connect the repo. `netlify.toml` already sets
the publish directory and asset caching. No build command needed.

## Before this goes live

1. **Replace the imagery.** Everything in `assets/img` was pulled off the
   Instagram grid, so it is 640px, recompressed, and several frames are video
   covers with campaign text burned into them. It works as a placeholder, it
   will look soft on a large screen. Shoot or export the originals and drop them
   in under the same filenames.
2. **Replace the feedback quotes.** The three cards in the Feedback section are
   dashed and dimmed on purpose so they cannot ship unnoticed. Real quotes live
   in the brand's "Feedbacks" Instagram highlight. Do not invent them.
3. **Add pricing and the size run.** The Phase 01 spec list has no price and no
   sizes, because neither is public. There is a `TODO` marker in `index.html`.
4. **Point the CTAs at the real order channel.** Every button currently opens
   the Instagram profile. If there is a WhatsApp number or an order form, swap
   the `href` values.
5. **Favicon.** Currently the 150px Instagram avatar. Export a proper one.

## Notes

- Fonts load from Google Fonts (Inter 200/300/400/500). To go fully offline,
  self host them and drop the two `preconnect` tags.
- Motion respects `prefers-reduced-motion`.
- Breakpoints at 900px and 560px.
