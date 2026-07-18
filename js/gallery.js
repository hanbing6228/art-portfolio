/* ===== Gallery: filters, grid, likes, lightbox, share ===== */
(function () {
  const LIKES_KEY = "artLikes"; // { artId: true }

  function getLikes() { return store.get(LIKES_KEY, {}); }
  function isLiked(id) { return !!getLikes()[id]; }
  function toggleLike(id) {
    const likes = getLikes();
    if (likes[id]) delete likes[id]; else likes[id] = true;
    store.set(LIKES_KEY, likes);
    return !!likes[id];
  }
  function likeCount(art) {
    // base count so it feels alive + your own like
    const base = art.baseLikes != null ? art.baseLikes : 3;
    return base + (isLiked(art.id) ? 1 : 0);
  }

  let currentFilter = "all";

  function renderFilters() {
    const wrap = $("#filters");
    wrap.innerHTML = "";
    (window.CATEGORIES || []).forEach((cat) => {
      const b = document.createElement("button");
      b.className = "filter-btn" + (cat.id === currentFilter ? " active" : "");
      b.innerHTML = icon(cat.icon) + " " + cat.name;
      b.addEventListener("click", () => {
        currentFilter = cat.id;
        renderFilters();
        renderGrid();
      });
      wrap.appendChild(b);
    });
  }

  function visibleArtworks() {
    const all = window.ARTWORKS || [];
    return currentFilter === "all" ? all : all.filter((a) => a.category === currentFilter);
  }

  function renderGrid() {
    const grid = $("#galleryGrid");
    grid.innerHTML = "";
    const items = visibleArtworks();
    if (!items.length) {
      grid.innerHTML = '<p class="gb-empty">No artwork here yet — check back soon!</p>';
      return;
    }
    items.forEach((art) => {
      const card = document.createElement("div");
      card.className = "art-card";
      card.innerHTML = `
        <img src="${art.img}" alt="${art.title}" loading="lazy" />
        <div class="art-meta">
          <div class="art-title">${art.title}</div>
          <div class="art-actions">
            <button class="like-btn ${isLiked(art.id) ? "liked" : ""}" data-id="${art.id}">
              ${icon(isLiked(art.id) ? "heart-filled" : "heart")} <span>${likeCount(art)}</span>
            </button>
            <button class="mini-btn share-one" data-id="${art.id}">${icon("share")}</button>
          </div>
        </div>`;
      // open lightbox when tapping the image/title
      card.querySelector("img").addEventListener("click", () => openLightbox(art));
      card.querySelector(".art-title").addEventListener("click", () => openLightbox(art));
      // like
      card.querySelector(".like-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const liked = toggleLike(art.id);
        const btn = e.currentTarget;
        btn.classList.toggle("liked", liked);
        btn.innerHTML = `${icon(liked ? "heart-filled" : "heart")} <span>${likeCount(art)}</span>`;
        if (liked) toast("Thanks for the love!");
      });
      // share
      card.querySelector(".share-one").addEventListener("click", (e) => {
        e.stopPropagation();
        shareContent(art.title, `Check out "${art.title}" — one of my artworks! 🎨`);
      });
      grid.appendChild(card);
    });
  }

  /* ---------- Lightbox ---------- */
  let lightboxArt = null;
  function openLightbox(art) {
    lightboxArt = art;
    $("#lightboxImg").src = art.img;
    $("#lightboxImg").alt = art.title;
    $("#lightboxTitle").textContent = art.title;
    $("#lightboxDesc").textContent = art.desc || "";
    updateLightboxLike();
    $("#lightbox").hidden = false;
  }
  function closeLightbox() { $("#lightbox").hidden = true; lightboxArt = null; }
  function updateLightboxLike() {
    if (!lightboxArt) return;
    const liked = isLiked(lightboxArt.id);
    $("#lightboxLikeIcon").innerHTML = ICONS[liked ? "heart-filled" : "heart"] || "";
    $("#lightboxLikeCount").textContent = likeCount(lightboxArt);
    $("#lightboxLike").classList.toggle("liked", liked);
  }

  function initLightbox() {
    $("#lightboxClose").addEventListener("click", closeLightbox);
    $("#lightbox").addEventListener("click", (e) => {
      if (e.target.id === "lightbox") closeLightbox();
    });
    $("#lightboxLike").addEventListener("click", () => {
      if (!lightboxArt) return;
      const liked = toggleLike(lightboxArt.id);
      updateLightboxLike();
      if (liked) toast("Thanks for the love!");
      renderGrid(); // keep grid counts in sync
    });
    $("#lightboxShare").addEventListener("click", () => {
      if (!lightboxArt) return;
      shareContent(lightboxArt.title, `Check out "${lightboxArt.title}" — one of my artworks! 🎨`);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#lightbox").hidden) closeLightbox();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderFilters();
    renderGrid();
    initLightbox();
  });
})();
