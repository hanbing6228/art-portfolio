/* =============================================================
   Hand-drawn SVG icon set  🎨
   Flat, soft, slightly organic shapes in the sage/teal palette.
   - Primary shapes use currentColor so they adapt to any background
     (light cards, colored buttons, active nav).
   - A few fixed accent colors add detail (teal / tan / cyan / blush).
   Usage:
     window.icon("home")            -> returns an <svg> string
     window.renderIcons(document)   -> fills <span data-icon="home">
   ============================================================= */
(function () {
  // fixed accent colors (kept small, per the design)
  var C = {
    teal: "#2f5d55",
    tan: "#cfaf92",
    cyan: "#c8f5f9",
    blush: "#d9b3b3",
    cream: "#f2efe0",
    sage: "#60925e",
  };

  // helper to wrap paths in a 24x24 svg using currentColor
  function svg(inner, opts) {
    opts = opts || {};
    var vb = opts.vb || "0 0 24 24";
    return (
      '<svg class="ic-svg" viewBox="' + vb + '" fill="none" xmlns="http://www.w3.org/2000/svg" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      inner +
      "</svg>"
    );
  }

  var ICONS = {
    /* ---------- Navigation ---------- */
    home: svg(
      '<path d="M4 11.2 12 4l8 7.2"/><path d="M6 10.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8.5" fill="' + C.cream + '"/>' +
      '<path d="M10 20v-4.5a2 2 0 0 1 4 0V20" fill="' + C.sage + '" stroke="' + C.teal + '"/>'
    ),
    gallery: svg(
      '<rect x="3.5" y="5" width="17" height="14" rx="2.5" fill="' + C.cream + '"/>' +
      '<circle cx="9" cy="10" r="1.6" fill="' + C.tan + '" stroke="' + C.tan + '"/>' +
      '<path d="M5 17l4.5-4.5 3 3 3-2.5L19 17" fill="' + C.sage + '" stroke="' + C.teal + '"/>'
    ),
    doodle: svg(
      '<path d="M4 20c1-3 1.5-4 2.5-5L16 5.5a2 2 0 0 1 3 3L9.5 18C8.5 19 7 19.5 4 20Z" fill="' + C.tan + '"/>' +
      '<path d="M14 7.5l3 3" stroke="' + C.teal + '"/><path d="M4.5 19.5l1.8-.4" stroke="' + C.teal + '"/>'
    ),
    quiz: svg(
      '<path d="M9 9a3 3 0 1 1 4 2.8c-.9.5-1 1-1 2" fill="none"/>' +
      '<circle cx="12" cy="18" r="0.4" fill="currentColor" stroke="currentColor" stroke-width="1.6"/>' +
      '<rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="' + C.cyan + '" opacity="0.5" stroke="none"/>' +
      '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/>'
    ),
    about: svg(
      '<circle cx="12" cy="8.5" r="3.2" fill="' + C.tan + '"/>' +
      '<path d="M5.5 19.5c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5" fill="' + C.sage + '" stroke="' + C.teal + '"/>'
    ),

    /* ---------- Art categories ---------- */
    "cat-all": svg(
      '<path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4Z" fill="' + C.cyan + '" stroke="' + C.teal + '"/>' +
      '<path d="M18 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z" fill="' + C.tan + '" stroke="' + C.tan + '"/>'
    ),
    "cat-printmaking": svg(
      '<rect x="5" y="4" width="14" height="9" rx="1.5" fill="' + C.sage + '" stroke="' + C.teal + '"/>' +
      '<path d="M9 5.5h6M9 8h6M9 10.5h4" stroke="' + C.cream + '"/>' +
      '<rect x="8" y="13" width="8" height="2.5" fill="' + C.tan + '"/><path d="M6 20h12" />'
    ),
    "cat-sketch": svg(
      '<path d="M5 19c.5-2.5 1-3.5 1.8-4.3L15 6.5a1.8 1.8 0 0 1 2.6 2.6L9.3 17.3C8.5 18 7.5 18.5 5 19Z" fill="' + C.tan + '"/>' +
      '<path d="M13.3 8.2l2.5 2.5" stroke="' + C.teal + '"/>'
    ),
    "cat-watercolor": svg(
      '<path d="M6 3.5v9a3 3 0 0 0 6 0v-9Z" fill="' + C.cyan + '" stroke="' + C.teal + '"/>' +
      '<path d="M6 6.5h6" stroke="' + C.teal + '"/>' +
      '<path d="M9 15.5V21" stroke="' + C.tan + '"/><path d="M7 21h4" stroke="' + C.tan + '"/>'
    ),
    "cat-clay": svg(
      '<path d="M7 4h10l-1 3a5.5 5.5 0 1 1-8 0Z" fill="' + C.tan + '" stroke="' + C.teal + '"/>' +
      '<path d="M8 10.5c2 1.2 6 1.2 8 0" stroke="' + C.teal + '"/>'
    ),
    "cat-weaving": svg(
      '<circle cx="12" cy="12" r="7.5" fill="' + C.sage + '" stroke="' + C.teal + '"/>' +
      '<path d="M6.5 9.5c3 1 8 1 11 0M6 12.5c3.5 1 8.5 1 12 0M7 15.5c3 1 7 1 10 0" stroke="' + C.cream + '"/>' +
      '<path d="M18.5 14l2.5 3.5" stroke="' + C.tan + '"/>'
    ),

    /* ---------- UI ---------- */
    heart: svg('<path d="M12 20S4 14.5 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 14.5 12 20 12 20Z"/>'),
    "heart-filled": svg('<path d="M12 20S4 14.5 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 14.5 12 20 12 20Z" fill="' + C.blush + '" stroke="' + C.blush + '"/>'),
    share: svg(
      '<circle cx="6" cy="12" r="2.4" fill="' + C.cyan + '"/><circle cx="17.5" cy="6.5" r="2.4" fill="' + C.sage + '"/>' +
      '<circle cx="17.5" cy="17.5" r="2.4" fill="' + C.tan + '"/><path d="M8.1 10.9l7.3-3.3M8.1 13.1l7.3 3.3"/>'
    ),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    sun: svg(
      '<circle cx="12" cy="12" r="4" fill="' + C.tan + '"/>' +
      '<path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>'
    ),
    moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" fill="' + C.cream + '"/>'),
    brush: svg(
      '<path d="M6 15c-1.5.6-2 2.4-2 4 1.6 0 3.4-.5 4-2Z" fill="' + C.tan + '" stroke="' + C.teal + '"/>' +
      '<path d="M8 13.5 16.5 5a1.8 1.8 0 0 1 2.5 2.5L10.5 16Z" fill="' + C.cyan + '"/>'
    ),
    eraser: svg(
      '<path d="M8.5 18H20" /><path d="M4.5 15.5 12 8l4.5 4.5L11.5 18H8Z" fill="' + C.blush + '" stroke="' + C.teal + '"/>' +
      '<path d="M9.5 10.5 14 15" stroke="' + C.teal + '"/>'
    ),
    trash: svg(
      '<path d="M5 7h14"/><path d="M9 7V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7"/>' +
      '<path d="M6.5 7l.8 11a1 1 0 0 0 1 1h7.4a1 1 0 0 0 1-1l.8-11" fill="' + C.tan + '"/>'
    ),
    save: svg(
      '<path d="M5 4.5h11L19.5 8v10.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" fill="' + C.sage + '" stroke="' + C.teal + '"/>' +
      '<rect x="8" y="4.5" width="6" height="4" fill="' + C.cream + '" stroke="' + C.teal + '"/>' +
      '<rect x="7.5" y="12" width="9" height="5" rx="0.6" fill="' + C.cream + '" stroke="' + C.teal + '"/>'
    ),
    send: svg('<path d="M4 12l16-7-7 16-2.5-6.5Z" fill="' + C.cyan + '" stroke="' + C.teal + '"/><path d="M10.5 14.5 20 5" stroke="' + C.teal + '"/>'),
    retry: svg('<path d="M19 12a7 7 0 1 1-2.2-5.1"/><path d="M19 4v3.5h-3.5"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7" stroke="' + C.sage + '"/>'),
    xmark: svg('<path d="M7 7l10 10M17 7L7 17" stroke="' + C.blush + '"/>'),
    sparkle: svg('<path d="M12 4l1.6 5.4L19 11l-5.4 1.6L12 18l-1.6-5.4L5 11l5.4-1.6Z" fill="' + C.cyan + '" stroke="' + C.teal + '"/>'),
    book: svg(
      '<path d="M12 6c-1.5-1.2-3.5-1.5-6-1.5v12c2.5 0 4.5.3 6 1.5 1.5-1.2 3.5-1.5 6-1.5v-12c-2.5 0-4.5.3-6 1.5Z" fill="' + C.tan + '" stroke="' + C.teal + '"/>' +
      '<path d="M12 6v12" stroke="' + C.teal + '"/>'
    ),
    leaf: svg('<path d="M5 19c0-8 6-13 14-14 1 8-4 14-11 14a6 6 0 0 1-3 0Z" fill="' + C.sage + '" stroke="' + C.teal + '"/><path d="M8 16c2-4 5-6 9-7.5" stroke="' + C.cream + '"/>'),
    cake: svg(
      '<path d="M4 20h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Z" fill="' + C.blush + '" stroke="' + C.teal + '"/>' +
      '<path d="M4 16c1.5 1.2 2.5 1.2 4 0s2.5-1.2 4 0 2.5 1.2 4 0 2.5-1.2 4 0" stroke="' + C.cream + '"/>' +
      '<path d="M12 12V9" stroke="' + C.teal + '"/><circle cx="12" cy="7.5" r="1" fill="' + C.tan + '" stroke="' + C.tan + '"/>'
    ),
    palette: svg(
      '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 1.8-1 1.3-1.9-.6-1 0-2.1 1.2-2.1H16a4.5 4.5 0 0 0 4.5-4.8C20.2 6.9 16.6 3.5 12 3.5Z" fill="' + C.cream + '" stroke="' + C.teal + '"/>' +
      '<circle cx="8" cy="10" r="1" fill="' + C.blush + '" stroke="' + C.blush + '"/><circle cx="12" cy="8" r="1" fill="' + C.sage + '" stroke="' + C.sage + '"/><circle cx="16" cy="10" r="1" fill="' + C.cyan + '" stroke="' + C.teal + '"/>'
    ),

    /* ---------- Game & achievements ---------- */
    achievements: svg(
      '<path d="M8.5 3l-2 6M15.5 3l2 6" stroke="' + C.tan + '"/>' +
      '<circle cx="12" cy="14.5" r="5.5" fill="' + C.tan + '" stroke="' + C.teal + '"/>' +
      '<path d="M12 11.2l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3Z" fill="' + C.cream + '" stroke="' + C.teal + '"/>'
    ),
    trophy: svg(
      '<path d="M7 4h10v3a5 5 0 0 1-10 0Z" fill="' + C.tan + '" stroke="' + C.teal + '"/>' +
      '<path d="M7 5H4.5v2a3 3 0 0 0 3 3M17 5h2.5v2a3 3 0 0 1-3 3" stroke="' + C.teal + '"/>' +
      '<path d="M12 12v3M9 20h6M10 20l.5-3h3l.5 3" stroke="' + C.teal + '"/>'
    ),
    timer: svg(
      '<path d="M9.5 2.5h5" stroke="' + C.teal + '"/>' +
      '<circle cx="12" cy="13.5" r="7" fill="' + C.cream + '" stroke="' + C.teal + '"/>' +
      '<path d="M12 13.5V9.5" stroke="' + C.teal + '"/><path d="M18.5 7l1.5-1.5" stroke="' + C.tan + '"/>'
    ),
    flame: svg(
      '<path d="M12 3c1 3 5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 1.8 1.8 2C10.2 8 10.5 5.5 12 3Z" fill="' + C.blush + '" stroke="' + C.teal + '"/>' +
      '<path d="M12 19a2.4 2.4 0 0 1-2.4-2.4c0-1.4 1.4-2 1.6-3.1.9.7 3.2 1.7 3.2 3.1A2.4 2.4 0 0 1 12 19Z" fill="' + C.tan + '" stroke="none"/>'
    ),
    crown: svg(
      '<path d="M4 8l3 3 5-6 5 6 3-3-1.5 10H5.5Z" fill="' + C.tan + '" stroke="' + C.teal + '"/>' +
      '<path d="M5.5 18h13" stroke="' + C.teal + '"/><circle cx="12" cy="5" r="1" fill="' + C.cyan + '" stroke="' + C.teal + '"/>'
    ),
    gem: svg(
      '<path d="M7 4h10l4 5-9 11L3 9Z" fill="' + C.cyan + '" stroke="' + C.teal + '"/>' +
      '<path d="M3 9h18M9 4l-2 5 5 11 5-11-2-5" stroke="' + C.teal + '"/>'
    ),
    lock: svg(
      '<rect x="5.5" y="10.5" width="13" height="9" rx="2" fill="' + C.cream + '" stroke="' + C.teal + '"/>' +
      '<path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="' + C.teal + '"/><circle cx="12" cy="15" r="1.2" fill="' + C.teal + '" stroke="' + C.teal + '"/>'
    ),
    bolt: svg('<path d="M13 2.5 5 13h5l-1 8.5L19 10h-5Z" fill="' + C.cyan + '" stroke="' + C.teal + '"/>'),
    target: svg(
      '<circle cx="12" cy="12" r="8.5" fill="' + C.cream + '" stroke="' + C.teal + '"/>' +
      '<circle cx="12" cy="12" r="5" fill="' + C.sage + '" stroke="' + C.teal + '"/>' +
      '<circle cx="12" cy="12" r="1.6" fill="' + C.blush + '" stroke="' + C.teal + '"/>'
    ),
    scholar: svg(
      '<path d="M4 6.5c2.5 0 5 .3 8 1.8 3-1.5 5.5-1.8 8-1.8v11c-2.5 0-5 .3-8 1.8-3-1.5-5.5-1.8-8-1.8Z" fill="' + C.tan + '" stroke="' + C.teal + '"/>' +
      '<path d="M12 8.3v11" stroke="' + C.teal + '"/><path d="M6.5 9.5c1.5.2 3 .6 4 1.2M17.5 9.5c-1.5.2-3 .6-4 1.2" stroke="' + C.cream + '"/>'
    ),
    chat: svg(
      '<path d="M4 6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4 3.5V15.5H6a2 2 0 0 1-2-2Z" fill="' + C.sage + '" stroke="' + C.teal + '"/>' +
      '<circle cx="9" cy="10" r="1" fill="' + C.cream + '" stroke="' + C.cream + '"/><circle cx="12" cy="10" r="1" fill="' + C.cream + '" stroke="' + C.cream + '"/><circle cx="15" cy="10" r="1" fill="' + C.cream + '" stroke="' + C.cream + '"/>'
    ),
    play: svg('<path d="M7 4.5 19 12 7 19.5Z" fill="' + C.sage + '" stroke="' + C.teal + '"/>'),
    medal: svg(
      '<circle cx="12" cy="14" r="6" fill="' + C.tan + '" stroke="' + C.teal + '"/>' +
      '<path d="M12 11l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 13.3 11 13Z" fill="' + C.cream + '" stroke="' + C.teal + '"/>'
    ),
    gear: svg(
      '<path d="M12 2.4l1.5 2.3 2.7-.7.3 2.8 2.7 1-1.2 2.5 1.8 2.1-2.4 1.5.4 2.8-2.8.2-1 2.6L12 21.6l-1.5-2.3-2.7.7-.3-2.8-2.7-1 1.2-2.5L2.2 11.6l2.4-1.5-.4-2.8 2.8-.2 1-2.6L12 2.4Z" fill="' + C.tan + '" stroke="' + C.teal + '"/>' +
      '<circle cx="12" cy="12" r="3.3" fill="' + C.cream + '" stroke="' + C.teal + '"/>'
    ),
    star: svg('<path d="M12 3l2.5 6.1L21 9.6l-5 4.3 1.6 6.5L12 16.9 6.4 20.4 8 13.9l-5-4.3 6.5-.5Z" fill="' + C.tan + '" stroke="' + C.teal + '"/>'),
    plus: svg('<path d="M12 5v14M5 12h14" stroke-width="2.4"/>'),
    music: svg('<path d="M9 17V5l10-2v12" fill="none"/><ellipse cx="6.2" cy="17" rx="3" ry="2.6" fill="' + C.tan + '"/><ellipse cx="16.2" cy="15" rx="3" ry="2.6" fill="' + C.sage + '"/>'),
    pause: svg('<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="' + C.teal + '"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="' + C.teal + '"/>'),
    next: svg('<path d="M6 5l9 7-9 7Z" fill="' + C.sage + '" stroke="' + C.teal + '"/><path d="M17 5v14" stroke="' + C.teal + '"/>'),
    prev: svg('<path d="M18 5l-9 7 9 7Z" fill="' + C.sage + '" stroke="' + C.teal + '"/><path d="M7 5v14" stroke="' + C.teal + '"/>'),
    undo: svg('<path d="M4 9h10a5.5 5.5 0 1 1 0 11H9" fill="none"/><path d="M4 9l4-4M4 9l4 4"/>'),
    redo: svg('<path d="M20 9H10a5.5 5.5 0 1 0 0 11h5" fill="none"/><path d="M20 9l-4-4M20 9l-4 4"/>'),
    link: svg(
      '<path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" stroke="' + C.teal + '"/>' +
      '<path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" stroke="' + C.teal + '"/>'
    ),
    expand: svg('<path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"/>'),
    collapse: svg('<path d="M9 4v3a2 2 0 0 1-2 2H4M15 4v3a2 2 0 0 0 2 2h3M9 20v-3a2 2 0 0 0-2-2H4M15 20v-3a2 2 0 0 1 2-2h3"/>'),
    resize: svg('<path d="M15 4h5v5M20 4l-6 6M9 20H4v-5M4 20l6-6"/>'),
  };

  window.ICONS = ICONS;

  window.icon = function (name, cls) {
    var s = ICONS[name] || "";
    if (cls) s = s.replace('class="ic-svg"', 'class="ic-svg ' + cls + '"');
    return '<span class="ic">' + s + "</span>";
  };

  window.renderIcons = function (root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      var name = el.getAttribute("data-icon");
      if (ICONS[name]) el.innerHTML = ICONS[name];
      el.classList.add("ic");
    });
  };
})();
