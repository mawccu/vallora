# VALLORA

Single page brand site for [@vallorawear](https://www.instagram.com/vallorawear/).
Static HTML, CSS and vanilla JS. No build step, no dependencies.

```
index.html                        landing
shop/index.html                   the four pieces
shop/fearless-soul-tee.html       the one real product page
shop/piece-02.html                placeholder product pages
shop/piece-03.html
shop/piece-04.html
checkout/index.html               order review, details, send
lookbook/index.html               vertical scroll, captions bottom left
ethos/index.html
contact/index.html
assets/
  css/style.css                   one stylesheet for every page
  js/config.js                    ← the only file you have to edit
  js/main.js                      one script for every page
  img/vallora-*.jpg
supabase/setup.sql                the reviews table, run once
netlify.toml
```

There is no build step and no templating, so the nav and the footer are
duplicated in each page. That is the trade for zero dependencies: if you change
one, change all nine. Everything else is shared through the stylesheet and the
one script, which guards on the elements each block needs, so the same
`main.js` runs the landing, a product page and the lookbook.

## The cart and checkout

The flow is the ordinary one:

```
piece → pick a size and a quantity → add to cart → cart drawer
      → /checkout/ → name, phone, city, notes → send
```

Only the last step is unusual. There is no payment provider and no server, so
"send" opens WhatsApp with the entire order already written out: every piece,
its size, its quantity, the total when prices are set, and the buyer's details.
The cart lives in `localStorage` and survives moving between pages.

The drawer is a summary and a way back in, not the end of the road: its button
goes to `/checkout/`. Quantities can be edited in either place and the order
message rebuilds from whichever one you touched.

Unlike everything else here `cart.js` is **not** an enhancement, because a cart
with no scripting is not a cart. That is also why the bag button and the drawer
are injected from the script rather than written into all nine pages: there is
no no-script state for them to fall back to, and one source of truth beats nine
copies that drift. Every page still carries plain WhatsApp and Instagram links
in its markup, so a visitor with scripting off can order the old way.

Two details worth keeping:

- **Paths are stored from the site root, never relative to the page.** The cart
  renders on pages at two depths, and the site is served from `/vallora/` on
  GitHub Pages, so `cart.js` reads its prefix off the stylesheet link rather
  than assuming `/`.
- **The send link is rebuilt on every keystroke** in the buyer fields, not only
  when the cart changes. It carries the entire message, so without that the
  order arrives with no name on it. That shipped as a bug once and is covered
  by a test now.

## The two things that need real values

Both live in `assets/js/config.js`, and nothing else has to be touched.

1. **`whatsapp`** The order number, international format, digits only. Every
   WhatsApp link on every page is rewritten from it. The `wa.me/000000000000`
   written into the HTML is only the fallback for scripting off.
2. **`supabase`** Where customer reviews live. Run `supabase/setup.sql` once in
   the Supabase SQL editor, then paste the project URL and the anon key from
   Settings → API. **While these are blank the site is still complete**: the
   review list and form stay hidden and each product page shows the "send it
   over DM" route instead.

## Reviews

Real customer words, or nothing. The rule that has survived every round of this
project is that reviews are never invented, so the code is built to leave an
honest empty state rather than fill it.

- A visitor submits from the product page. The row lands with `approved = false`.
- Nothing appears on the site until you tick `approved` in the Supabase table
  editor. The policy that allows inserts checks `approved = false`, so a
  submitter cannot publish themselves by sending `approved: true`.
- There is no update or delete policy, which with RLS on means the anon key
  cannot edit or remove a review either.
- Every field is length- and range-checked in the database, not just the form,
  because the anon key is public by definition.
- A honeypot field catches the simplest bots before the request is made.
- Reviews are written into the page with `textContent`, never `innerHTML`. This
  is the one place on the site where a stranger supplies the string, and it is
  covered by a test that submits `<img src=x onerror=...>` and asserts it renders
  as visible text.

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
3. **Set the WhatsApp number** in `assets/js/config.js`. Every link on every
   page, and the cart's send button, picks it up from there.
4. **Add prices** in the same file. Leave one at 0 and that piece reads
   "Price over DM", still goes in the cart, and the order asks us to confirm the
   total. No price is invented anywhere in this codebase.
5. **Name pieces 02, 03 and 04.** They are full, orderable products already,
   they just carry their slot number instead of a name. Renaming one means the
   `<title>`, the `<h1>` and `data-name` on its page, plus the label on
   `shop/index.html` and `index.html`. Leave the slug alone unless you also
   change it in `config.js` and `supabase/setup.sql`, since that is what ties
   orders and reviews to the piece.
6. **Confirm the size chart.** The measurements are dashed on every product page
   until the brand confirms them.
7. **Favicon.** Currently the 150px Instagram avatar. Export a proper one.

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

**Product pages.** Each piece has its own page: photographs on the left, a
buying column that sticks to the viewport as you scroll them, then the size
chart, the wash care and the reviews across the full width. Pick a size and a
quantity, add to cart, and the drawer opens with it.

**The fit scale.** Five marks with three labels, per the client's reference. It
reports how a piece runs, it is not a control: you choose the size below it, and
this tells you what that size will feel like. Sizes that are not in
`config.js`'s stock list render struck through and disabled.

**Lookbook** (`/lookbook/`). A vertical editorial scroll of on-body frames.
Every frame carries its caption bottom left, always visible: one line of what
the brand means, then where it was shot. Full, wide and paired-tall shapes
alternate, because a long scroll of one aspect ratio sets in.

**Pinned horizontal lookbook** (`.rail`, landing only). The outer element is 440vh tall, the
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

Screenshots prove it renders, they do not prove it works. This build was checked
over CDP on all nine pages at 1512px, at 390px, and again with `main.js` blocked
at the network layer: no 404s, no console errors, no horizontal overflow, every
revealed block actually revealed after a full scroll, the footer wordmark filling
its line to within a pixel, and the DM route still present on every product page
when the script is gone.

The review system is audited separately against a stubbed backend, since the
Supabase project does not exist yet: config and `fetch` are overridden before any
page script runs, then 21 assertions cover rendering, the star row, the submit
payload, the honeypot, and the injection test described above.

The cart and checkout have their own 43-assertion suite, run twice over: once
with no prices set, which is the state the shop ships in, and once with prices
injected, because the two produce different totals and a different order
message. It walks the whole flow: refusing to add without a size, the quantity
stepper, merging a repeat of the same size into one line, surviving navigation
between pages, the drawer handing off to checkout, editing quantities on the
checkout page, the empty state when the cart is cleared, refusing to send
without a name and phone, and the composed message carrying every piece, size,
quantity, total and buyer field.

A local server is needed for any of it, because `file://` cannot resolve
`/shop/` to `/shop/index.html`, which is exactly the thing that has to be tested.

Never verify a reveal mechanism with a harness that forces the revealed state.
An earlier screenshot harness added `is-in` before every capture, which meant it
only ever tested the end state and never the trigger, and that is how the blank
image bug shipped.
