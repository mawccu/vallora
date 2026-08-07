/* VALLORA · the two things that need real values
   ---------------------------------------------------------------------------
   This is the only file that has to be edited to take the site out of
   placeholder mode. Everything else reads from here.

   1. whatsapp   The number orders go to, international format, digits only,
                 no +, no spaces. Jordan example: 9627XXXXXXXX.
                 Every WhatsApp link on every page is rewritten from this
                 value. The wa.me/000000000000 written into the HTML is only
                 the fallback for visitors with scripting off.

   2. supabase   Where customer reviews live. Run supabase/setup.sql once in
                 the SQL editor, then paste the project URL and the anon key
                 from Settings → API.
                 While these are blank the review lists stay hidden and each
                 product page shows the "send it over DM" route instead, so
                 the site is complete either way. The anon key is meant to be
                 public: setup.sql is what keeps it safe. Never put the
                 service key here.                                            */

window.VALLORA_CONFIG = {
  whatsapp: '',                 // e.g. '9627XXXXXXXX'

  supabase: {
    url: '',                    // e.g. 'https://abcdefgh.supabase.co'
    anonKey: ''                 // the anon / public key, never the service key
  }
};
