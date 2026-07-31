# VALLORA business card

`vallora-card.pdf` . 2 pages, page 1 front, page 2 back.

## Specification for the printer

| | |
|---|---|
| Trim size | 85 x 55 mm (the standard outside North America) |
| Bleed | 3 mm on all four edges |
| Document size | 91 x 61 mm, which is trim plus bleed |
| Safety margin | 7 mm from the document edge, so 4 mm inside the trim |
| Pages | 2, double sided |
| Colour | RGB. Ask the printer to convert, or say the word and it can be reissued in CMYK |
| Crop marks | None. The document is bleed only, so give the printer the trim size above |

The background is near black (`#050505`) and runs off all four edges, which is
exactly what the bleed is for. Nothing important sits within 4 mm of the trim.

## The QR code

Encodes `https://mawccu.github.io/vallora/`. Error correction level H, which
recovers from about 30 percent damage, so it survives wear and a slight
misprint.

It is printed dark on a paper coloured tile rather than inverted, because
light-on-dark QR codes are not reliably supported by scanners. The tile carries
a 3 mm quiet zone, comfortably over the 4 module minimum. At the printed size
each module is roughly 0.55 mm, which is well above the practical floor for
phone cameras.

Verified by rendering the finished card at about 768 dpi and decoding the QR
back out of the pixels. It returns the exact target URL.

## Before you print anything

**The URL on the card is `mawccu.github.io/vallora`.** That is a personal
GitHub Pages address and it will read as unfinished on a printed card. Buy the
real domain first, point the site at it, then regenerate this PDF. Print is not
something you can hot fix.

## Regenerating

`card.html` is the source and is fully self contained, with the QR inlined as
SVG. Edit it and print to PDF at 91 x 61 mm with backgrounds enabled and margins
set to zero. If the URL changes, the QR has to be regenerated too, not just the
text next to it.
