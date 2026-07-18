/* =============================================================
   EDIT ME!  ✏️
   This is the ONE file you change to personalize your site.
   You do NOT need to touch any other code.
   ============================================================= */

window.CONFIG = {
  // --- Your name & who you are ---
  name: "My Name",                 // <-- put your name here
  tagline: "Young Artist & Maker",  // a short line under your name
  age: 12,
  emoji: "🎨",

  // --- Your avatar picture ---
  // Put your own photo in  assets/img/  and change this to it,
  // e.g. "assets/img/me.jpg". For now it uses a placeholder.
  avatar: "assets/img/avatar.svg",

  // --- The book/anime you love right now (shown on the home page) ---
  obsession: {
    title: "Omniscient Reader's Viewpoint",
    note: "My favorite book right now! I love manga and stories like this.",
  },

  // --- About Me text (shown on the About page) ---
  about: [
    "Hi! I'm a 12-year-old artist and I love making things with my hands.",
    "I draw, paint, print, sculpt, and weave. Manga is my biggest inspiration.",
    "Take a look at my work, leave me a message, and try the doodle pad!",
  ],

  // Fun facts shown as little chips on the About page
  funFacts: [
    "5 kinds of art",
    "Manga lover",
    "Favorite color: green",
    "Always drawing",
  ],

  // --- Your social links (leave "" to hide a button) ---
  // These are used by the Share buttons and the About page.
  socials: {
    instagram: "",   // e.g. "https://instagram.com/yourname"
    youtube: "",
    email: "",       // e.g. "you@example.com"
  },

  // --- Cloud sync (optional) ☁️ ---
  // Fill these in to make the GUESTBOOK and LIKES shared by everyone and
  // never lost (see SETUP-CLOUD.md for the 5-minute setup).
  // Leave them "" to keep everything on this device only (localStorage).
  // Both values are SAFE to be public — do NOT paste any "service"/secret key here.
  cloud: {
    url: "",        // e.g. "https://xxxxxxxx.supabase.co"
    anonKey: "",    // the Supabase "anon public" key
  },
};
