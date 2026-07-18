# 🎨 My Art Portfolio

A mobile-friendly personal portfolio app for a young artist — showing
**printmaking, sketch, watercolor, clay sculpture, and weaving**, with fun
interactive features. Built with plain HTML/CSS/JavaScript (no build step),
and installable as a phone app (PWA).

## ✨ Features

- **Home** — avatar, name, "age 12" badge, and a *Currently obsessed with* card
  (Omniscient Reader's Viewpoint)
- **Gallery** — a **Pinterest-style masonry wall** with mixed card sizes. No rigid
  folders: every piece is **freely tagged**, and the tag bar builds itself from your
  tags. Tap any tag to filter. Tap a piece to enlarge (lightbox); like & share each one.
- **Doodle Pad** — draw with your finger, pick colors, erase, and **save as a PNG**
- **Story Challenge** — a mini quiz **game** about the story you love: pick a
  difficulty (Rookie / Adept / Legend), beat the countdown for speed bonuses, build
  a combo streak, and survive with 3 hearts. Best scores are saved.
- **Achievements** — earn **badges that level up** through 4 tiers
  (Bronze → Silver → Gold → Diamond) by playing, liking art, doodling, and leaving
  messages. Each badge shows your tier and progress to the next one.
- **About Me + Guestbook** — your intro plus a message board for visitors
- **Sharing** — a "Share my portfolio" button using the phone's native share
  sheet (social media, Google Chat, etc.), with copy-link fallback
- **Light/Dark theme**, sparkle taps, and it works **offline** & **installs to your home screen**

All likes / guestbook messages / scores / badges are saved in your browser on your
device (no accounts, no server — private and safe).

## 🎨 Look & feel

- **Palette:** soft sage green `#60925e`, teal `#2f5d55`, tan `#cfaf92`, cream, on a pale-sage
  background — with bright cyan `#c8f5f9` used only as small sparkle/accent touches.
- **Icons:** all icons are custom hand-drawn **SVGs** (no emoji), defined in `js/icons.js`. To change
  or add one, edit that file; reference it in markup as `<span class="ic" data-icon="name"></span>`
  or in JS with `icon("name")`.

## 🚀 Run it

It's just static files. Any of these works:

```bash
# Option A: Python (built in on Mac/Linux)
python3 -m http.server 8000
# then open http://localhost:8000

# Option B: Node
npx serve .
```

Open it on your phone by visiting the same address on your home Wi-Fi, or
deploy it (below) and open the link. On a phone you can then tap
**"Add to Home Screen"** to install it like an app.

## ✏️ Make it yours (no coding needed)

Everything you personalize lives in **two files**:

### 1. `js/config.js` — your name & text
Open it and change:
- `name`, `tagline`, `age`
- `avatar` — point it at your own photo (put it in `assets/img/`)
- `obsession` — your favorite book/anime
- `about` — your intro paragraphs
- `socials` — your links (leave `""` to hide)

### 2. `js/data.js` — your artworks
Each artwork looks like this:

```js
{
  id: "wc1",
  title: "Green Hills",
  desc: "Soft watercolor washes of rolling green hills.",
  img: "assets/img/watercolor-1.svg",
  tags: ["watercolor", "landscape", "nature"], // ANY labels you like
  aspect: "wide",                              // "tall" | "wide" | "square"
},
```

- **`tags`** are free — mix media (`watercolor`) with themes (`favorite`, `nature`).
  The gallery's tag bar is built automatically, so there are no folders to manage.
- **`aspect`** controls the card shape for the mixed masonry look.

**To use a real photo:**
1. Put your photo in the `assets/img/` folder (e.g. `my-painting.jpg`).
2. Change that artwork's `img` to `"assets/img/my-painting.jpg"`.

**To add a new artwork:** copy one `{ ... }` block, give it a new `id`, and edit it.

### Bonus: edit the game & badges
- **Quiz questions** live in `js/quiz.js` (grouped by difficulty) — add your own!
- **Badges & tiers** live in `js/achievements.js` — tweak names or the tier thresholds.

> The images that come with the project are green-themed **placeholders** so
> the site looks good before you add your real photos.

## ☁️ Put it online (free)

- **GitHub Pages:** push this repo to GitHub → Settings → Pages → deploy from
  your branch. Your site gets a public link you can share.
- **Vercel / Netlify:** drag-and-drop the folder, or connect the repo.

## 🗂️ Project structure

```
index.html              # the whole app (one page)
manifest.webmanifest    # makes it installable as an app
sw.js                   # offline support
css/styles.css          # the green theme
js/config.js            # ✏️ your name & text  (EDIT ME)
js/data.js              # 🖼️ your artwork list  (EDIT ME)
js/app.js               # navigation, theme, sharing
js/gallery.js           # gallery, likes, lightbox
js/doodle.js            # drawing pad
js/quiz.js              # quiz
js/guestbook.js         # message board
assets/img/             # placeholder art + your photos
assets/icons/           # app icons
```

Made with 💚
