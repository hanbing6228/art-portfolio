# ☁️ Cloud setup — shared guestbook & likes (about 5 minutes)

By default the guestbook and likes are saved only on each visitor's own device.
Follow these steps to make them **shared by everyone and never lost**, using
**Supabase** (free). Ask a grown-up to help with the sign-up.

## 1. Create a free project
1. Go to **https://supabase.com** → sign up (free) → **New project**.
2. Give it a name (e.g. `art-portfolio`) and a database password (save it).
3. Wait ~1 minute for it to finish setting up.

## 2. Create the tables (copy–paste)
Open the left menu → **SQL Editor** → **New query**, paste this, click **Run**:

```sql
-- Guestbook messages (anyone can read + post)
create table guestbook (
  id bigint generated always as identity primary key,
  name text not null,
  message text not null,
  created_at timestamptz default now()
);
alter table guestbook enable row level security;
create policy "read guestbook"  on guestbook for select to anon using (true);
create policy "post guestbook"  on guestbook for insert to anon with check (
  char_length(message) between 1 and 300 and char_length(name) between 1 and 40
);

-- Like counts per artwork
create table art_likes (
  art_id text primary key,
  count  int not null default 0
);
alter table art_likes enable row level security;
create policy "read likes" on art_likes for select to anon using (true);

-- Safe +1 / -1 helpers (only these can change the counts)
create or replace function increment_like(p_art text) returns void
  language sql security definer as $$
  insert into art_likes(art_id, count) values (p_art, 1)
  on conflict (art_id) do update set count = art_likes.count + 1;
$$;
create or replace function decrement_like(p_art text) returns void
  language sql security definer as $$
  insert into art_likes(art_id, count) values (p_art, 0)
  on conflict (art_id) do update set count = greatest(0, art_likes.count - 1);
$$;
```

## 3. Get your 2 public keys
Left menu → **Project Settings** → **API**. Copy:
- **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
- **anon public** key (a long string labeled `anon` / `public`)

> These two are meant to be public — it's fine that they live in the code.
> **Never** paste the `service_role` / secret key here.

## 4. Paste them into the site
Open `js/config.js` and fill in:

```js
cloud: {
  url: "https://xxxxxxxx.supabase.co",
  anonKey: "eyJhbGciOi...your-anon-key...",
},
```

Save → commit → push. GitHub Pages redeploys automatically, and the guestbook
and likes are now shared by everyone, on every device. 🎉

To turn cloud off again, just set both back to `""`.
