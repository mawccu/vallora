/* VALLORA · everything that needs a real value
   ---------------------------------------------------------------------------
   This is the only file you have to edit. Nothing else in the site holds a
   phone number, a price or a key.

   1. whatsapp   The number orders go to, international format, digits only,
                 no +, no spaces. Jordan example: 9627XXXXXXXX.
                 Every WhatsApp link on every page is rewritten from this, and
                 it is where the cart sends the order. The wa.me/000000000000
                 written into the HTML is only the fallback for scripting off.

   2. prices     What each piece costs. THE SHOP RUNS WITHOUT THIS: leave a
                 price at 0 and that piece shows "Price over DM", goes into the
                 cart without a figure, and the order message asks us to
                 confirm the total. Put a real number in and the price, the
                 line totals and the cart total all appear by themselves.
                 No price is invented anywhere in this codebase.

   3. supabase   Where customer reviews live. Run supabase/setup.sql once in
                 the SQL editor, then paste the project URL and the anon key
                 from Settings → API. While these are blank the review list and
                 form stay hidden and the "send it over DM" route shows
                 instead. The anon key is meant to be public: setup.sql is what
                 keeps it safe. Never put the service key here.               */

window.VALLORA_CONFIG = {

  whatsapp: '',                 // e.g. '9627XXXXXXXX'

  currency: 'JOD',

  // slug: price. 0 means "not public yet", which is a supported state.
  prices: {
    'fearless-soul-tee': 0,
    'piece-02': 0,
    'piece-03': 0,
    'piece-04': 0
  },

  // Sizes that are actually in stock, per piece. Remove a size from a list and
  // it shows as sold out on that piece instead of being orderable.
  stock: {
    'fearless-soul-tee': ['S', 'M', 'L', 'XL'],
    'piece-02': ['S', 'M', 'L', 'XL'],
    'piece-03': ['S', 'M', 'L', 'XL'],
    'piece-04': ['S', 'M', 'L', 'XL']
  },

  supabase: {
    url: '',                    // e.g. 'https://abcdefgh.supabase.co'
    anonKey: ''                 // the anon / public key, never the service key
  }
};
