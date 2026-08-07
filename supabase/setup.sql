-- VALLORA · customer reviews
-- ---------------------------------------------------------------------------
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query →
-- paste → Run). Then copy the project URL and the anon key from
-- Settings → API into assets/js/config.js. Nothing on the site changes until
-- both of those are filled in.
--
-- The site talks to this table directly over PostgREST with the anon key, so
-- the policies below ARE the security model. Read them before changing them.

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product     text        not null,
  name        text        not null,
  city        text,
  size        text,
  rating      int         not null,
  body        text        not null,
  approved    boolean     not null default false,
  created_at  timestamptz not null default now(),

  -- the anon key is public by definition, so every limit that matters has to
  -- live here in the database rather than in the form
  constraint reviews_product_known check (product in (
    'fearless-soul-tee', 'piece-02', 'piece-03', 'piece-04'
  )),
  constraint reviews_rating_range  check (rating between 1 and 5),
  constraint reviews_name_len      check (char_length(name) between 2 and 40),
  constraint reviews_city_len      check (city is null or char_length(city) <= 40),
  constraint reviews_size_known    check (size is null or size in ('S','M','L','XL')),
  constraint reviews_body_len      check (char_length(body) between 10 and 600)
);

create index if not exists reviews_product_approved_idx
  on public.reviews (product, approved, created_at desc);

alter table public.reviews enable row level security;

-- Anyone may read a review that has been approved. Nothing else is readable,
-- so an unapproved submission is invisible to everyone but you.
drop policy if exists "read approved reviews" on public.reviews;
create policy "read approved reviews"
  on public.reviews for select
  using (approved = true);

-- Anyone may submit, but only as unapproved. The `approved = false` check is
-- what stops a submitter from publishing themselves by sending approved:true
-- in the request body.
drop policy if exists "submit a review" on public.reviews;
create policy "submit a review"
  on public.reviews for insert
  with check (approved = false);

-- No update and no delete policy exists on purpose: with RLS on, that means
-- nobody holding the anon key can edit or remove a review. Moderation happens
-- in the dashboard, which uses the service key and bypasses RLS.

-- ---------------------------------------------------------------------------
-- Moderating
--
--   Dashboard → Table editor → reviews → tick `approved` on the good ones.
--
-- Or, to approve everything waiting:
--   update public.reviews set approved = true where approved = false;
--
-- To see the queue:
--   select created_at, product, name, rating, body
--   from public.reviews where not approved order by created_at desc;
