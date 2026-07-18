/* =============================================================
   Cloud sync (optional)  ☁️
   If you fill in CONFIG.cloud (see js/config.js + SETUP-CLOUD.md), the
   guestbook and likes are stored in the cloud (Supabase) and SHARED by
   everyone, on every device, and never lost.

   If CONFIG.cloud is empty, the site quietly falls back to this-browser
   storage (localStorage) — everything still works, just not shared.
   ============================================================= */
(function () {
  var cfg = (window.CONFIG && window.CONFIG.cloud) || {};
  var configured = !!(cfg.url && cfg.anonKey);

  var client = null;
  var resolveReady;
  var readyPromise = new Promise(function (r) { resolveReady = r; });

  window.Cloud = {
    // optimistic: true when keys are set (may flip to false if the library fails to load)
    enabled: configured,
    ready: readyPromise,

    async listGuestbook() {
      var ok = await readyPromise;
      if (!ok || !client) return null;
      var res = await client.from("guestbook")
        .select("name,message,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (res.error) { console.warn("[cloud] guestbook load:", res.error.message); return null; }
      return res.data;
    },
    async addGuestbook(name, message) {
      var ok = await readyPromise;
      if (!ok || !client) return false;
      var res = await client.from("guestbook").insert({ name: name, message: message });
      if (res.error) { console.warn("[cloud] guestbook add:", res.error.message); return false; }
      return true;
    },
    async getLikeCounts() {
      var ok = await readyPromise;
      if (!ok || !client) return null;
      var res = await client.from("art_likes").select("art_id,count");
      if (res.error) { console.warn("[cloud] likes load:", res.error.message); return null; }
      var m = {};
      (res.data || []).forEach(function (r) { m[r.art_id] = r.count; });
      return m;
    },
    async like(artId) {
      var ok = await readyPromise;
      if (!ok || !client) return;
      var res = await client.rpc("increment_like", { p_art: artId });
      if (res.error) console.warn("[cloud] like:", res.error.message);
    },
    async unlike(artId) {
      var ok = await readyPromise;
      if (!ok || !client) return;
      var res = await client.rpc("decrement_like", { p_art: artId });
      if (res.error) console.warn("[cloud] unlike:", res.error.message);
    },
  };

  if (!configured) { resolveReady(false); return; }

  // Load the Supabase library on demand (only when cloud is configured)
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  s.onload = function () {
    try {
      client = window.supabase.createClient(cfg.url, cfg.anonKey);
      resolveReady(true);
    } catch (e) {
      console.warn("[cloud] init failed:", e);
      window.Cloud.enabled = false;
      resolveReady(false);
    }
  };
  s.onerror = function () {
    console.warn("[cloud] could not load Supabase library — using local storage.");
    window.Cloud.enabled = false;
    resolveReady(false);
  };
  document.head.appendChild(s);
})();
