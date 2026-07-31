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

## The two set pieces

**WebGL hero** (`assets/js/hero-gl.js`). The hero frame is rendered through a
custom fragment shader on a fullscreen triangle: raw WebGL1, no library. A slow
two octave value noise drives a flowing UV displacement, the pointer pushes a
ripple through it, chromatic split scales with the displacement magnitude, and a
vignette and fine grain sit on top. Scrolling settles the whole field downward.

The `<img>` underneath is the fallback and is only faded out once the first
frame has genuinely drawn, so no WebGL, a failed shader compile, a failed link
or a lost context all leave the original hero exactly as it was. Device pixel
ratio is capped at 2 and the loop idles when the hero is off screen.

**Pinned horizontal lookbook** (`.rail`). The outer element is 420vh tall, the
inner one sticks to the viewport, and the track is translated across as you
scroll through that height. Native scroll throughout, nothing hijacked. A HUD
keeps the section label and a live 01/05 counter on screen, and a rule at the
bottom tracks horizontal progress. Below 900px the whole thing collapses to the
ordinary single column grid, and the pinning is gated on `js` so a script
failure degrades to vertical flow instead of a screen of empty space.

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
  first `mousemove`. Gallery tiles swap it for a "View" bubble. Pointer-fine
  devices only.
- **Magnetic buttons.** `.magnetic` elements lean toward the cursor.

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

- Fonts load from Google Fonts (Inter 200/300/400/500). To go fully offline,
  self host them and drop the two `preconnect` tags.
- Motion respects `prefers-reduced-motion`, which disables the intro, the
  cursor, splitting and parallax outright.
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
- Breakpoints at 900px and 560px.
