# 🎨 My Art Portfolio

A mobile-friendly personal portfolio app for a young artist — showing
**printmaking, sketch, watercolor, clay sculpture, and weaving**, with fun
interactive features. Built with plain HTML/CSS/JavaScript (no build step),
and installable as a phone app (PWA).

## ✨ Features

- **Home** — avatar, name, "age 12" badge, and a *Currently obsessed with* card
  (Omniscient Reader's Viewpoint 💚)
- **Gallery** — 5 categories with filter tabs, tap-to-enlarge (lightbox),
  ❤️ like buttons, and 📤 share on each artwork
- **Doodle Pad** — draw with your finger, pick colors, erase, and **save as a PNG**
- **Quiz** — a short fun quiz about you and ORV, with a shareable score
- **About Me + Guestbook** — your intro plus a message board for visitors
- **Sharing** — a "Share my portfolio" button using the phone's native share
  sheet (social media, Google Chat, etc.), with copy-link fallback
- **Light/Dark theme**, sparkle taps, and it works **offline** & **installs to your home screen**

All likes / guestbook messages are saved in your browser on your device
(no accounts, no server — private and safe).

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
  category: "watercolor",   // printmaking | sketch | watercolor | clay | weaving
  title: "Green Hills",
  desc: "Soft watercolor washes of rolling green hills.",
  img: "assets/img/watercolor-1.svg",
},
```

**To use a real photo:**
1. Put your photo in the `assets/img/` folder (e.g. `my-painting.jpg`).
2. Change that artwork's `img` to `"assets/img/my-painting.jpg"`.

**To add a new artwork:** copy one `{ ... }` block, give it a new `id`, and edit it.

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
