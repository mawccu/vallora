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
3. **Add pricing and the size run.** Every card reads "Price over DM" because no
   price is public. There is a `TODO` block above the shop section in
   `index.html`.
4. **Set the WhatsApp number.** The Contact section and the footer both link to
   `wa.me/000000000000`, a placeholder. Replace it in both places with the real
   number, international format, digits only. `main.js` reads the number back
   off those hrefs to build the prefilled order message, so nothing else needs
   editing.
5. **Fill the shop.** Only the Fearless Soul tee is real. Pieces 02, 03 and 04
   are dashed, greyed placeholders waiting on names, photos and prices, and the
   size chart measurements are dashed until the brand confirms them.
6. **Favicon.** Currently the 150px Instagram avatar. Export a proper one.

## Structure

Two grounds, one system. Every colour reads from `--fg`, `--bg`, `--dim` and
`--line-c`, which default to the dark brand ground and are overridden in exactly
one place, `.shop`, to flip that block to paper. That is why a button, a chip or
a table needs no light variant to work on either side. The dark run is the brand
film, the paper block is the store, and the switch is what tells you which one
you are looking at.

```
hero  →  ticker  →  manifesto  →  SHOP (paper)  →  strip
      →  lookbook  →  ethos  →  contact  →  phase 02  →  footer
```

## The set pieces

**Loader.** The percentage is real: it counts campaign frames that have actually
decoded, then the curtain clips upward and the hero opens. Two independent
timeouts lift it regardless of what the counter reports, because a curtain that
can stick is a blank site.

**Hero mask.** The only move made on the photography. It opens from a narrow
centre column to full bleed when the loader lifts. A mask, never a filter. A
WebGL shader was built for this hero once and **removed at the client's
request**, because the displacement and chromatic split softened the frame. Any
distortion is fighting a 640px source. Revisit only after the real photography
lands.

**Manifesto.** Words light one at a time as the block crosses the viewport,
driven from the scroll loop. `main.js` builds the spans, so the copy stays an
ordinary sentence in the markup and a dead script leaves plain paragraph text.

**Product overlay** (`.pv`). Opening a card MOVES that card's `[data-panel]`
node into the overlay and closing puts it back, so there is never a second copy
of a size chart to fall out of date with the first. With scripting off the same
node stays where it is, inside a native `<details>` under the card. Picking a
size rewrites the WhatsApp link with a prefilled order message.

**Pinned horizontal lookbook** (`.rail`). The outer element is 440vh tall, the
inner one sticks to the viewport, and the track is translated across as you
scroll through that height. Native scroll throughout, nothing hijacked, and it
can also be dragged: a horizontal drag is converted back into a vertical scroll
rather than fighting it, so scroll position stays the single source of truth for
where the rail is. A HUD keeps the section label and a live 01/05 counter on
screen. Below 900px it collapses to a single column grid, and the pinning is
gated on `js` so a script failure degrades to vertical flow instead of a screen
of empty space.

**Sticky ethos stack.** Each panel pins slightly lower than the last, so the
previous one stays visible behind it. The step between offsets is also the
height of the band that stays visible, so it has to clear the number and the
title. Any smaller and the stack guillotines the headings.

**Footer wordmark.** Sized by `main.js` to fill its line exactly, re-run on
resize and once the webfont lands, since fallback metrics are not the real ones.
The CSS value is the safe floor that must not clip with scripting off.

## Motion

All hand written, no animation library.

- **Split text.** `main.js` rewraps anything with `data-split` into per line or
  per character spans inside overflow masks, then an IntersectionObserver slides
  them up. `data-delay` seeds the stagger.
- **Clip reveals.** `.unmask` elements wipe in via `clip-path`.
- **Parallax.** `data-parallax="0.28"` moves an element against scroll at that
  fraction, batched into one `requestAnimationFrame`.
- **Marquee.** Drifts on a CSS keyframe; JS upgrades it to scroll velocity
  reactive and only then switches the keyframe off.
- **Cursor.** Dot tracks the pointer, ring lags behind it, both hidden until the
  first `mousemove`. `data-cursor` swaps it for a labelled bubble: "Drag" on
  lookbook tiles, "Open" on product cards. Pointer-fine devices only.
- **Magnetic buttons.** `.magnetic` elements lean toward the cursor.
- **Hero slideshow.** Slow crossfade between three campaign frames. No
  transform, no filter, the frames are left exactly as shot.

### Three things to preserve if you edit this

0. **Never put the reveal's hidden state on the observed element itself.** The
   `.unmask` clip lives on the child `img`, not on the figure the
   IntersectionObserver watches. An element collapsed by its own `clip-path`
   reports no intersection area, so the observer never fires, so the class that
   lifts the clip is never added. That deadlock shipped once and blanked every
   image on the site. `main.js` also runs a `getBoundingClientRect` safety sweep
   inside the scroll loop, which is immune to clip and filter effects, so a
   missed observer can never again be the reason content is invisible.

1. **The `js` watchdog.** The inline script in `<head>` adds a `js` class, and
   every hidden-until-revealed state is gated on it. If `main.js` 404s or
   throws, a 3 second timer strips the class and the page renders as plain
   static content. Without that net a script failure would leave the page
   permanently blank. `main.js` sets `window.__valloraReady` at the end to call
   the watchdog off. Verified by pointing the script tag at a missing file.
2. **Character splitting and letter-spacing.** Each character becomes its own
   `inline-block`, so tracking would otherwise apply twice, once inside each box
   and again between boxes, and the browser gains a line break opportunity
   between every letter. `[data-split="chars"]` is therefore `nowrap` with
   `letter-spacing:0` on the child `.char`. Do not remove either.

## Notes

- Fonts load from Google Fonts: Inter 200/300/400/500 for the brand wordmark and
  body, Archivo 500/700/900 for everything the brand states rather than
  whispers. To go fully offline, self host them and drop the two `preconnect`
  tags.
- The accent colour needs its own hook, `.display .hl`. The line splitter wraps
  each heading in spans of its own, so a bare `.display span` paints every line
  ember instead of the one word you meant.
- Motion respects `prefers-reduced-motion`, which disables the loader, the
  cursor, the word lighting, splitting, parallax and the sticky stack outright.
- **The imagery is untouched on purpose.** No grading, no sharpening. These are
  640px placeholder frames off the public Instagram grid, and they are meant to
  look like exactly that until the brand supplies real photography. An SVG
  sharpen convolution and per-image grading were both built and then removed at
  the client's request. Grade the real shots when they land rather than
  reintroducing a sharpen pass.
- If you ever reintroduce `filter:url(#someId)`, gate it behind a class that JS
  adds only after confirming the filter is in the document. An unresolvable
  filter reference does not degrade: Chrome skips painting the element outright,
  which blanks every image it touches.
- Two treatments are kept because they solve composition, not quality: the
  Phase 02 backdrop is blurred and offset, and one gallery tile is crop-biased
  left. Both exist to push burned-in campaign text out of the way. Drop them
  once the real photography arrives.
- Breakpoints at 1200px (shop grid drops from four columns to two), 900px (nav
  collapses, rail unpins, overlay stacks) and 560px.

## Verifying a change

Screenshots prove it renders, they do not prove it works. Both were checked over
CDP for this build: 24 assertions at 1512px and at 390px (overlay opens, the
panel moves and comes back, the order link carries product, colour and size,
focus and scroll lock behave, the footer wordmark fills its line to within a
pixel, no console errors), plus 11 more with `main.js` blocked at the network
layer to prove the watchdog path still shows every image, the size chart and a
working order link.

Never verify a reveal mechanism with a harness that forces the revealed state.
An earlier screenshot harness added `is-in` before every capture, which meant it
only ever tested the end state and never the trigger, and that is how the blank
image bug shipped.
