/* VALLORA · cart and checkout
   ---------------------------------------------------------------------------
   The flow is the ordinary one: choose a size on the piece, add to cart, review
   the cart, go to checkout, fill in where it is going, send. The only unusual
   step is the last one. There is no payment provider and no server, so
   "place order" opens WhatsApp with the entire order already written out:
   every piece, its size, its quantity, the total, and the buyer's details.

   Unlike the rest of the site this is NOT an enhancement, because a cart with
   no scripting is not a cart. That is also why the bag button and the drawer
   are injected from here rather than written into every page: there is no
   no-script state for them to fall back to, and one source of truth beats ten
   copies that drift. Every page keeps a working WhatsApp and Instagram link in
   its markup, so a visitor with scripting off can still order the old way.

   Prices are optional by design. A piece with no price in config.js shows
   "Price over DM", still goes in the cart, and the order asks us to confirm the
   total. Nothing here invents a number.                                       */

(function () {
  'use strict';

  var doc = document;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || doc).querySelectorAll(s)); };

  var CFG = window.VALLORA_CONFIG || {};
  var KEY = 'vallora.cart.v1';
  var BUYER = 'vallora.buyer.v1';

  /* Pages live at two depths (/ and /shop/), so every stored path is written
     canonically from the site root and prefixed at render time. The stylesheet
     link is the one element guaranteed to be on every page, so its href is
     what the prefix is read from. Hard-coding "/" would break on GitHub Pages,
     which serves the whole site under /vallora/. */
  var ROOT = (function () {
    var l = $('link[rel="stylesheet"][href*="style.css"]');
    var href = l ? l.getAttribute('href') : '';
    return href.slice(0, href.indexOf('assets/css/style.css'));
  })();

  function money(n) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + (CFG.currency || 'JOD');
  }

  function priceOf(slug) {
    var p = (CFG.prices || {})[slug];
    return typeof p === 'number' && p > 0 ? p : 0;
  }

  function stockOf(slug) {
    var s = (CFG.stock || {})[slug];
    return Array.isArray(s) ? s : ['S', 'M', 'L', 'XL'];
  }

  /* ── state ─────────────────────────────────────────────── */

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];   // corrupt or unavailable storage must not break the shop
    }
  }

  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* private mode */ }
    render();
  }

  function readBuyer() {
    try { return JSON.parse(localStorage.getItem(BUYER)) || {}; } catch (e) { return {}; }
  }

  function writeBuyer(b) {
    try { localStorage.setItem(BUYER, JSON.stringify(b)); } catch (e) { /* private mode */ }
  }

  function count() {
    return read().reduce(function (n, i) { return n + i.qty; }, 0);
  }

  function total() {
    // null when any line has no price: a partial total is worse than none,
    // because it reads as the amount owed
    var items = read();
    if (!items.length) return null;
    var sum = 0;
    for (var i = 0; i < items.length; i++) {
      var p = priceOf(items[i].slug);
      if (!p) return null;
      sum += p * items[i].qty;
    }
    return sum;
  }

  function add(item) {
    var items = read();
    // the same piece in the same size is one line with a bigger number
    var hit = items.filter(function (i) {
      return i.slug === item.slug && i.size === item.size;
    })[0];

    if (hit) hit.qty = Math.min(20, hit.qty + item.qty);
    else items.push(item);

    write(items);
  }

  function setQty(slug, size, qty) {
    var items = read().map(function (i) {
      if (i.slug === slug && i.size === size) i.qty = qty;
      return i;
    }).filter(function (i) { return i.qty > 0; });
    write(items);
  }

  function remove(slug, size) { setQty(slug, size, 0); }

  /* ── the order message ─────────────────────────────────── */

  function orderText() {
    var items = read();
    var lines = ['VALLORA order', ''];

    items.forEach(function (i, n) {
      var p = priceOf(i.slug);
      lines.push((n + 1) + '. ' + i.name);
      lines.push('   Size ' + i.size + '  x' + i.qty +
                 (p ? '  ' + money(p * i.qty) : '  price to confirm'));
    });

    var t = total();
    lines.push('');
    if (t !== null) lines.push('Total: ' + money(t));
    else lines.push('Please confirm availability and the total.');

    var b = readBuyer();
    lines.push('');
    if (b.name) lines.push('Name: ' + b.name);
    if (b.phone) lines.push('Phone: ' + b.phone);
    if (b.city) lines.push('City: ' + b.city);
    if (b.notes) lines.push('Notes: ' + b.notes);

    return lines.join('\n');
  }

  function waNumber() {
    var n = (CFG.whatsapp || '').replace(/[^\d]/g, '');
    if (n) return n;
    // fall back to whatever number the markup carries, so the button still goes
    // somewhere real before config.js is filled in
    var a = $('a[href*="wa.me/"]');
    var m = a ? (a.getAttribute('href') || '').match(/wa\.me\/(\d+)/) : null;
    return m ? m[1] : '';
  }

  function orderHref() {
    var num = waNumber();
    return num ? 'https://wa.me/' + num + '?text=' + encodeURIComponent(orderText()) : '#';
  }

  /* ── shared line rendering ─────────────────────────────── */

  /* Both the drawer and the checkout page list the same lines, so they share
     one builder. `full` adds the per-line total column that the wide layout
     has room for. */
  function lineEl(i, full) {
    var p = priceOf(i.slug);

    var li = doc.createElement('li');
    li.className = 'cart__item';
    li.setAttribute('data-slug', i.slug);
    li.setAttribute('data-size', i.size);
    li.setAttribute('data-qty', String(i.qty));

    var thumb = doc.createElement('a');
    thumb.className = 'cart__thumb';
    thumb.href = ROOT + i.href;
    var img = doc.createElement('img');
    img.src = ROOT + i.img;
    img.alt = '';
    thumb.appendChild(img);

    var body = doc.createElement('div');
    body.className = 'cart__lines';

    var name = doc.createElement('a');
    name.className = 'cart__name';
    name.href = ROOT + i.href;
    name.textContent = i.name;     // names come from our own markup, but
    body.appendChild(name);        // textContent keeps that true forever

    var meta = doc.createElement('p');
    meta.className = 'cart__meta';
    meta.textContent = 'Size ' + i.size + (p ? ' . ' + money(p) + ' each' : ' . price over DM');
    body.appendChild(meta);

    var row = doc.createElement('div');
    row.className = 'cart__qty';
    row.innerHTML =
      '<button type="button" data-act="dec" aria-label="One fewer">&minus;</button>' +
      '<span>' + i.qty + '</span>' +
      '<button type="button" data-act="inc" aria-label="One more">+</button>' +
      '<button type="button" class="cart__del" data-act="del">Remove</button>';
    body.appendChild(row);

    li.appendChild(thumb);
    li.appendChild(body);

    if (full && p) {
      var line = doc.createElement('p');
      line.className = 'cart__line';
      line.textContent = money(p * i.qty);
      li.appendChild(line);
    }

    return li;
  }

  function wireLineButtons(listEl) {
    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var li = btn.closest('li');
      var slug = li.getAttribute('data-slug');
      var size = li.getAttribute('data-size');
      var qty = parseInt(li.getAttribute('data-qty'), 10);
      var act = btn.getAttribute('data-act');

      if (act === 'inc') setQty(slug, size, Math.min(20, qty + 1));
      if (act === 'dec') setQty(slug, size, qty - 1);
      if (act === 'del') remove(slug, size);
    });
  }

  /* ── the drawer ────────────────────────────────────────── */

  var el = {};

  function build() {
    var side = $('.nav__side');
    if (side && !$('.bag')) {
      var bag = doc.createElement('button');
      bag.className = 'bag';
      bag.type = 'button';
      bag.setAttribute('aria-label', 'Open cart');
      bag.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M4.5 7.5h15l-1.2 12.2a1.6 1.6 0 0 1-1.6 1.4H7.3a1.6 1.6 0 0 1-1.6-1.4Z"/>' +
        '<path d="M8.6 9.6V6.4a3.4 3.4 0 0 1 6.8 0v3.2"/></svg>' +
        '<span class="bag__n" data-bag-count hidden>0</span>';
      bag.addEventListener('click', function () { open(); });
      side.appendChild(bag);
    }

    if ($('.cart')) return;

    var wrap = doc.createElement('div');
    wrap.className = 'cart';
    wrap.id = 'cart';
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="cart__scrim" data-cart-close></div>' +
      '<aside class="cart__panel" role="dialog" aria-modal="true" aria-label="Your cart">' +
        '<header class="cart__head">' +
          '<h2>Your cart <span data-cart-count></span></h2>' +
          '<button class="cart__close" type="button" data-cart-close aria-label="Close cart">' +
            '<span></span><span></span></button>' +
        '</header>' +

        '<div class="cart__body">' +
          '<ul class="cart__list" data-cart-list></ul>' +
          '<p class="cart__empty" data-cart-empty>Nothing in the cart yet.</p>' +
          '<p class="cart__keep"><a href="' + ROOT + 'shop/">Keep shopping</a></p>' +
        '</div>' +

        '<footer class="cart__foot">' +
          '<div class="cart__total" data-cart-total></div>' +
          '<a class="btn btn--solid cart__send" data-cart-checkout href="' + ROOT + 'checkout/">' +
            'Checkout</a>' +
          '<p class="cart__note">Next step is where it is going. No account and no ' +
            'card: the finished order opens in WhatsApp.</p>' +
        '</footer>' +
      '</aside>';

    doc.body.appendChild(wrap);

    el.wrap = wrap;
    el.list = $('[data-cart-list]', wrap);
    el.empty = $('[data-cart-empty]', wrap);
    el.keep = $('.cart__keep', wrap);
    el.totalBox = $('[data-cart-total]', wrap);
    el.checkout = $('[data-cart-checkout]', wrap);
    el.headCount = $('[data-cart-count]', wrap);

    $$('[data-cart-close]', wrap).forEach(function (b) {
      b.addEventListener('click', close);
    });

    wireLineButtons(el.list);

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !wrap.hidden) close();
      if (e.key === 'Tab' && !wrap.hidden) trap(e);
    });
  }

  function trap(e) {
    var f = $$('a[href], button, input, textarea, [tabindex]:not([tabindex="-1"])', el.wrap)
      .filter(function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  var opener = null;

  function open() {
    if (!el.wrap) return;
    opener = doc.activeElement;
    el.wrap.hidden = false;
    doc.body.classList.add('is-locked');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.wrap.classList.add('is-open'); });
    });
    var c = $('.cart__close', el.wrap);
    if (c) c.focus();
  }

  function close() {
    if (!el.wrap || el.wrap.hidden) return;
    el.wrap.classList.remove('is-open');
    doc.body.classList.remove('is-locked');

    var settled = false;
    var done = function () {
      if (settled) return;
      settled = true;
      el.wrap.hidden = true;
      if (opener && opener.focus) { opener.focus(); opener = null; }
    };
    var panel = $('.cart__panel', el.wrap);
    if (panel) panel.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 700);   // hidden tabs never fire transitionend
  }

  /* ── checkout page ─────────────────────────────────────── */

  var co = {};

  function buildCheckout() {
    var root = $('[data-checkout]');
    if (!root) return;

    co.root = root;
    co.list = $('[data-co-list]', root);
    co.empty = $('[data-co-empty]', root);
    co.filled = $('[data-co-filled]', root);
    co.totalBox = $('[data-co-total]', root);
    co.send = $('[data-co-send]', root);
    co.err = $('[data-co-err]', root);

    wireLineButtons(co.list);

    // the buyer fields are the same store the drawer used to hold, so a
    // customer who filled them in once never types them again
    var b = readBuyer();
    ['name', 'phone', 'city', 'notes'].forEach(function (f) {
      var input = $('[name="' + f + '"]', root);
      if (!input) return;
      if (b[f]) input.value = b[f];
      input.addEventListener('input', function () {
        var cur = readBuyer();
        cur[f] = input.value;
        writeBuyer(cur);
        // the send link carries the entire message, so it has to be rebuilt on
        // every keystroke. without this the order arrives with no name on it.
        render();
      });
    });

    co.send.addEventListener('click', function (e) {
      if (!read().length) { e.preventDefault(); return; }

      var b2 = readBuyer();
      if (!b2.name || !String(b2.name).trim() || !b2.phone || !String(b2.phone).trim()) {
        e.preventDefault();
        co.err.textContent = 'A name and a phone number, so we know whose order this is.';
        co.err.hidden = false;
        var f = !b2.name ? $('[name="name"]', root) : $('[name="phone"]', root);
        if (f) { f.focus(); f.scrollIntoView({ block: 'center' }); }
        return;
      }
      co.err.hidden = true;
    });
  }

  function renderCheckout() {
    if (!co.list) return;
    var items = read();

    co.list.textContent = '';
    items.forEach(function (i) { co.list.appendChild(lineEl(i, true)); });

    co.empty.hidden = items.length > 0;
    if (co.filled) co.filled.hidden = items.length === 0;

    var t = total();
    if (!items.length) {
      co.totalBox.textContent = '';
    } else if (t !== null) {
      co.totalBox.innerHTML =
        '<div class="sum__row"><span>Subtotal</span><span>' + money(t) + '</span></div>' +
        '<div class="sum__row"><span>Delivery</span><span>Confirmed by message</span></div>' +
        '<div class="sum__row sum__row--big"><span>Total</span><strong>' + money(t) + '</strong></div>';
    } else {
      co.totalBox.innerHTML =
        '<div class="sum__row"><span>Subtotal</span><span>Price over DM</span></div>' +
        '<div class="sum__row"><span>Delivery</span><span>Confirmed by message</span></div>' +
        '<div class="sum__row sum__row--big"><span>Total</span><strong>Confirmed by message</strong></div>';
    }

    co.send.href = orderHref();
    co.send.setAttribute('target', '_blank');
    co.send.setAttribute('rel', 'noopener');
    if (!items.length) co.send.setAttribute('aria-disabled', 'true');
    else co.send.removeAttribute('aria-disabled');
  }

  /* ── render ────────────────────────────────────────────── */

  function render() {
    var items = read();
    var n = count();

    $$('[data-bag-count]').forEach(function (b) {
      b.textContent = String(n);
      b.hidden = n === 0;
    });

    renderCheckout();

    if (!el.list) return;

    if (el.headCount) el.headCount.textContent = n ? '(' + n + ')' : '';
    el.empty.hidden = items.length > 0;
    if (el.keep) el.keep.hidden = items.length === 0;

    el.list.textContent = '';
    items.forEach(function (i) { el.list.appendChild(lineEl(i, false)); });

    var t = total();
    if (!items.length) {
      el.totalBox.textContent = '';
    } else if (t !== null) {
      el.totalBox.innerHTML = '<span>Subtotal</span><strong>' + money(t) + '</strong>';
    } else {
      el.totalBox.innerHTML = '<span>Subtotal</span><strong>Confirmed by message</strong>';
    }

    if (!items.length) el.checkout.setAttribute('aria-disabled', 'true');
    else el.checkout.removeAttribute('aria-disabled');
  }

  /* ── prices on grid cards, anywhere on the site ────────── */

  function paintPrices() {
    $$('[data-price-for]').forEach(function (n) {
      var p = priceOf(n.getAttribute('data-price-for'));
      n.textContent = p ? money(p) : 'Price over DM';
    });
  }

  /* ── product page wiring ───────────────────────────────── */

  function wireProduct() {
    var pdp = $('[data-product]');
    if (!pdp) return;

    var slug = pdp.getAttribute('data-product');
    var name = pdp.getAttribute('data-name') || '';
    var colour = pdp.getAttribute('data-colour');
    var label = name + (colour ? ' [' + colour + ']' : '');
    var img = pdp.getAttribute('data-img') || '';
    var href = pdp.getAttribute('data-href') || '';

    var p = priceOf(slug);
    $$('[data-price-slot]').forEach(function (n2) {
      n2.textContent = p ? money(p) : 'Price over DM';
    });

    // sold out sizes come out of the stock list, not the markup
    var inStock = stockOf(slug);
    $$('.chip', pdp).forEach(function (chip) {
      var s = chip.getAttribute('data-size');
      if (inStock.indexOf(s) === -1) {
        chip.classList.add('is-out');
        chip.disabled = true;
        chip.setAttribute('aria-label', s + ', sold out');
      }
    });

    var qty = 1;
    var qtyOut = $('[data-qty-val]', pdp);
    $$('[data-qty-act]', pdp).forEach(function (b) {
      b.addEventListener('click', function () {
        qty = Math.max(1, Math.min(20, qty + (b.getAttribute('data-qty-act') === 'inc' ? 1 : -1)));
        if (qtyOut) qtyOut.textContent = String(qty);
      });
    });

    var addBtn = $('[data-add]', pdp);
    var addErr = $('[data-add-err]', pdp);
    if (!addBtn) return;

    addBtn.addEventListener('click', function () {
      var on = $('.chip.is-on', pdp);
      if (!on) {
        if (addErr) { addErr.textContent = 'Pick a size first.'; addErr.hidden = false; }
        var chips = $('.chips', pdp);
        if (chips) {
          chips.classList.remove('is-asking');
          void chips.offsetWidth;              // restart the animation
          chips.classList.add('is-asking');
        }
        return;
      }
      if (addErr) addErr.hidden = true;

      add({
        slug: slug,
        name: label,
        size: on.getAttribute('data-size'),
        qty: qty,
        img: img,
        href: href
      });
      open();
    });
  }

  /* ── go ────────────────────────────────────────────────── */

  build();
  buildCheckout();
  paintPrices();
  wireProduct();
  render();

  // a second tab is the same cart
  window.addEventListener('storage', function (e) {
    if (e.key === KEY || e.key === BUYER) render();
  });

  window.VALLORA_CART = { add: add, open: open, close: close, count: count, items: read };
})();
