/* =============================================================
   YOUR ARTWORK LIST  🖼️
   To add a real photo:
     1. Put the image file in  assets/img/  (e.g. my-painting.jpg)
     2. Change the "img" line below to point to it.
   To add a new artwork: copy one { ... } block and edit it.
   Categories must be one of:
     "printmaking", "sketch", "watercolor", "clay", "weaving"
   ============================================================= */

window.CATEGORIES = [
  { id: "all",         name: "All",         icon: "cat-all" },
  { id: "printmaking", name: "Printmaking", icon: "cat-printmaking" },
  { id: "sketch",      name: "Sketch",      icon: "cat-sketch" },
  { id: "watercolor",  name: "Watercolor",  icon: "cat-watercolor" },
  { id: "clay",        name: "Clay",        icon: "cat-clay" },
  { id: "weaving",     name: "Weaving",     icon: "cat-weaving" },
];

window.ARTWORKS = [
  {
    id: "pr1",
    category: "printmaking",
    title: "Leaf Print",
    desc: "A carved block print inspired by forest leaves.",
    img: "assets/img/printmaking-1.svg",
  },
  {
    id: "pr2",
    category: "printmaking",
    title: "Wave Stamp",
    desc: "Repeating wave pattern in two shades of green.",
    img: "assets/img/printmaking-2.svg",
  },
  {
    id: "sk1",
    category: "sketch",
    title: "Portrait Study",
    desc: "Pencil sketch practicing faces and shading.",
    img: "assets/img/sketch-1.svg",
  },
  {
    id: "sk2",
    category: "sketch",
    title: "Manga Character",
    desc: "A character drawn in my favorite manga style.",
    img: "assets/img/sketch-2.svg",
  },
  {
    id: "wc1",
    category: "watercolor",
    title: "Green Hills",
    desc: "Soft watercolor washes of rolling green hills.",
    img: "assets/img/watercolor-1.svg",
  },
  {
    id: "wc2",
    category: "watercolor",
    title: "Sunlit Forest",
    desc: "Light and shadow through the trees.",
    img: "assets/img/watercolor-2.svg",
  },
  {
    id: "cl1",
    category: "clay",
    title: "Little Bowl",
    desc: "A hand-pinched clay bowl with a leaf edge.",
    img: "assets/img/clay-1.svg",
  },
  {
    id: "cl2",
    category: "clay",
    title: "Clay Creature",
    desc: "A tiny sculpted friend with big eyes.",
    img: "assets/img/clay-2.svg",
  },
  {
    id: "wv1",
    category: "weaving",
    title: "Woven Band",
    desc: "A woven bracelet in green and cream threads.",
    img: "assets/img/weaving-1.svg",
  },
  {
    id: "wv2",
    category: "weaving",
    title: "Mini Tapestry",
    desc: "A small wall hanging with a leaf motif.",
    img: "assets/img/weaving-2.svg",
  },
];
