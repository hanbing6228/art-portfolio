/* ===== Gallery: Pinterest-style masonry wall with free tags ===== */
(function () {
  var LIKES_KEY = "artLikes"; // { artId: true } — tracks THIS device's likes
  var cloudCounts = null;     // shared counts from the cloud, when enabled

  function getLikes() { return store.get(LIKES_KEY, {}); }
  function isLiked(id) { return !!getLikes()[id]; }
  function toggleLike(id) {
    var likes = getLikes();
    var nowLiked = !likes[id];
    if (likes[id]) delete likes[id]; else likes[id] = true;
    store.set(LIKES_KEY, likes);
    // when cloud is on, adjust the shared count and push the change up
    if (window.Cloud && Cloud.enabled) {
      if (cloudCounts) cloudCounts[id] = Math.max(0, (cloudCounts[id] || 0) + (nowLiked ? 1 : -1));
      if (nowLiked) Cloud.like(id); else Cloud.unlike(id);
    }
    return nowLiked;
  }
  function likeCount(art) {
    if (window.Cloud && Cloud.enabled && cloudCounts) return cloudCounts[art.id] || 0;
    var base = art.baseLikes != null ? art.baseLikes : 3;
    return base + (isLiked(art.id) ? 1 : 0);
  }

  var currentTag = "all";
  var ARTWORKS_SRC = null; // set from cloud when the owner has added artworks

  function artworks() { return ARTWORKS_SRC || window.ARTWORKS || []; }

  // Collect all tags used across artworks, most-common first.
  function allTags() {
    var counts = {};
    artworks().forEach(function (a) {
      (a.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    });
    return Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b);
    });
  }

  function renderFilters() {
    var wrap = $("#filters");
    wrap.innerHTML = "";
    var tags = ["all"].concat(allTags());
    tags.forEach(function (tag) {
      var b = document.createElement("button");
      b.className = "filter-btn" + (tag === currentTag ? " active" : "");
      b.innerHTML = (tag === "all" ? icon("sparkle") + " All" : "#" + tag);
      b.addEventListener("click", function () {
        currentTag = tag;
        renderFilters();
        renderGrid();
      });
      wrap.appendChild(b);
    });
  }

  function visibleArtworks() {
    var all = artworks();
    if (currentTag === "all") return all;
    return all.filter(function (a) { return (a.tags || []).indexOf(currentTag) !== -1; });
  }

  function tagChips(art, mini) {
    return (art.tags || [])
      .map(function (t) {
        return '<button class="art-tag" data-tag="' + t + '">#' + t + "</button>";
      })
      .join("");
  }

  function renderGrid() {
    var grid = $("#galleryGrid");
    grid.innerHTML = "";
    var items = visibleArtworks();
    if (!items.length) {
      grid.innerHTML = '<p class="gb-empty">Nothing tagged that yet — try another tag!</p>';
      return;
    }
    items.forEach(function (art) {
      var card = document.createElement("div");
      card.className = "art-card aspect-" + (art.aspect || "square");
      card.innerHTML =
        '<div class="art-imgwrap"><img src="' + art.img + '" alt="' + art.title + '" loading="lazy" /></div>' +
        '<div class="art-meta">' +
        '<div class="art-title">' + art.title + "</div>" +
        '<div class="art-tags">' + tagChips(art) + "</div>" +
        '<div class="art-actions">' +
        '<button class="like-btn ' + (isLiked(art.id) ? "liked" : "") + '" data-id="' + art.id + '">' +
        icon(isLiked(art.id) ? "heart-filled" : "heart") + " <span>" + likeCount(art) + "</span></button>" +
        '<button class="mini-btn share-one" data-id="' + art.id + '">' + icon("share") + "</button>" +
        "</div></div>";

      // tapping the picture opens a clean fullscreen image (no details)
      card.querySelector(".art-imgwrap").addEventListener("click", function () { openImageView(art.img); });
      card.querySelector(".art-title").addEventListener("click", function () { openLightbox(art); });

      card.querySelector(".like-btn").addEventListener("click", function (e) {
        e.stopPropagation();
        var liked = toggleLike(art.id);
        var btn = e.currentTarget;
        btn.classList.toggle("liked", liked);
        btn.innerHTML = icon(liked ? "heart-filled" : "heart") + " <span>" + likeCount(art) + "</span>";
        if (liked) {
          toast("Thanks for the love!");
          if (window.Achievements) Achievements.bump("likesGiven");
        }
      });
      card.querySelector(".share-one").addEventListener("click", function (e) {
        e.stopPropagation();
        shareContent(art.title, 'Check out "' + art.title + '" — one of my artworks!');
      });
      // tag chips on a card jump-filter the wall
      card.querySelectorAll(".art-tag").forEach(function (chip) {
        chip.addEventListener("click", function (e) {
          e.stopPropagation();
          currentTag = chip.dataset.tag;
          renderFilters();
          renderGrid();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
      grid.appendChild(card);
    });
  }

  /* ---------- Lightbox ---------- */
  var lightboxArt = null;
  function openLightbox(art) {
    lightboxArt = art;
    $("#lightboxImg").src = art.img;
    $("#lightboxImg").alt = art.title;
    $("#lightboxTitle").textContent = art.title;
    $("#lightboxDesc").textContent = art.desc || "";
    var lt = $("#lightboxTags");
    if (lt) {
      lt.innerHTML = tagChips(art);
      lt.querySelectorAll(".art-tag").forEach(function (chip) {
        chip.addEventListener("click", function () {
          currentTag = chip.dataset.tag;
          closeLightbox();
          renderFilters();
          renderGrid();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
    }
    updateLightboxLike();
    $("#lightbox").hidden = false;
  }
  function closeLightbox() { $("#lightbox").hidden = true; lightboxArt = null; }
  function updateLightboxLike() {
    if (!lightboxArt) return;
    var liked = isLiked(lightboxArt.id);
    $("#lightboxLikeIcon").innerHTML = ICONS[liked ? "heart-filled" : "heart"] || "";
    $("#lightboxLikeCount").textContent = likeCount(lightboxArt);
    $("#lightboxLike").classList.toggle("liked", liked);
  }

  function initLightbox() {
    $("#lightboxClose").addEventListener("click", closeLightbox);
    $("#lightbox").addEventListener("click", function (e) {
      if (e.target.id === "lightbox") closeLightbox();
    });
    $("#lightboxLike").addEventListener("click", function () {
      if (!lightboxArt) return;
      var liked = toggleLike(lightboxArt.id);
      updateLightboxLike();
      if (liked) {
        toast("Thanks for the love!");
        if (window.Achievements) Achievements.bump("likesGiven");
      }
      renderGrid();
    });
    $("#lightboxShare").addEventListener("click", function () {
      if (!lightboxArt) return;
      shareContent(lightboxArt.title, 'Check out "' + lightboxArt.title + '" — one of my artworks!');
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("#lightbox").hidden) closeLightbox();
    });
  }

  // Let the admin panel refresh the wall after adding/editing/deleting works.
  window.reloadGallery = function (list) {
    if (list) ARTWORKS_SRC = list;
    currentTag = "all";
    renderFilters();
    renderGrid();
  };

  document.addEventListener("DOMContentLoaded", function () {
    renderFilters();
    renderGrid();
    initLightbox();
    if (window.Cloud && Cloud.enabled) {
      // shared like counts
      Cloud.getLikeCounts().then(function (m) { if (m) { cloudCounts = m; renderGrid(); } });
      // owner-uploaded artworks replace the placeholders (only if any exist)
      Cloud.listArtworks().then(function (list) {
        if (list && list.length) { ARTWORKS_SRC = list; renderFilters(); renderGrid(); }
      });
    }
  });
})();
