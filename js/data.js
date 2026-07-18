/* =============================================================
   YOUR ARTWORK LIST  🖼️
   The gallery is a free-form Pinterest-style wall — no rigid folders.
   Just tag each piece however you like! A work can have many tags,
   and the tag bar at the top is built automatically from them.

   To add a real photo:
     1. Put the image file in  assets/img/  (e.g. my-painting.jpg)
     2. Change "img" below to point to it.
   To add a new artwork: copy one { ... } block and edit it.

   Fields:
     title   - name of the piece
     desc    - a short description
     img     - path to the image
     tags    - ANY labels you like, e.g. ["watercolor","nature","favorite"]
     aspect  - shape of the card: "tall", "wide", or "square" (for the
               mixed masonry look). Optional — defaults to "square".
   ============================================================= */

window.ARTWORKS = [
  {
    id: "pr1",
    title: "Leaf Print",
    desc: "A carved block print inspired by forest leaves.",
    img: "assets/img/printmaking-1.svg",
    tags: ["printmaking", "nature", "green"],
    aspect: "square",
  },
  {
    id: "pr2",
    title: "Wave Stamp",
    desc: "Repeating wave pattern in two shades of green.",
    img: "assets/img/printmaking-2.svg",
    tags: ["printmaking", "pattern"],
    aspect: "wide",
  },
  {
    id: "sk1",
    title: "Portrait Study",
    desc: "Pencil sketch practicing faces and shading.",
    img: "assets/img/sketch-1.svg",
    tags: ["sketch", "portrait", "practice"],
    aspect: "tall",
  },
  {
    id: "sk2",
    title: "Manga Character",
    desc: "A character drawn in my favorite manga style.",
    img: "assets/img/sketch-2.svg",
    tags: ["sketch", "manga", "character"],
    aspect: "square",
  },
  {
    id: "wc1",
    title: "Green Hills",
    desc: "Soft watercolor washes of rolling green hills.",
    img: "assets/img/watercolor-1.svg",
    tags: ["watercolor", "landscape", "nature"],
    aspect: "wide",
  },
  {
    id: "wc2",
    title: "Sunlit Forest",
    desc: "Light and shadow through the trees.",
    img: "assets/img/watercolor-2.svg",
    tags: ["watercolor", "nature", "light"],
    aspect: "tall",
  },
  {
    id: "cl1",
    title: "Little Bowl",
    desc: "A hand-pinched clay bowl with a leaf edge.",
    img: "assets/img/clay-1.svg",
    tags: ["clay", "handmade"],
    aspect: "square",
  },
  {
    id: "cl2",
    title: "Clay Creature",
    desc: "A tiny sculpted friend with big eyes.",
    img: "assets/img/clay-2.svg",
    tags: ["clay", "character", "cute"],
    aspect: "tall",
  },
  {
    id: "wv1",
    title: "Woven Band",
    desc: "A woven bracelet in green and cream threads.",
    img: "assets/img/weaving-1.svg",
    tags: ["weaving", "handmade", "pattern"],
    aspect: "tall",
  },
  {
    id: "wv2",
    title: "Mini Tapestry",
    desc: "A small wall hanging with a leaf motif.",
    img: "assets/img/weaving-2.svg",
    tags: ["weaving", "nature", "handmade"],
    aspect: "wide",
  },
];
