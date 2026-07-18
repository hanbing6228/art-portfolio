/* Server-side image grabber (Vercel serverless function).

   Pinterest & similar sites show browser-based CORS proxies a login wall, but
   still serve og:image to social-media crawlers (that's how a pin previews when
   shared to Facebook / iMessage). We fetch server-side with a crawler
   User-Agent, follow the pin.it redirect, and pull og:image out of the HTML.
   Same-origin (linrose.vercel.app/api/grab), so the browser has no CORS issue.
   Free, no API key. */
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  var url = (req.query && req.query.url) || "";
  if (Array.isArray(url)) url = url[0];
  if (!url && req.url) { try { url = new URL(req.url, "http://x").searchParams.get("url") || ""; } catch (e) {} }
  if (!url || !/^https?:\/\//i.test(url)) { res.status(400).json({ error: "bad url" }); return; }

  function pick(html, re) { var m = html.match(re); return m ? m[1] : null; }

  try {
    var r = await fetch(url, {
      redirect: "follow",
      headers: {
        // pose as the Facebook link crawler — sites serve it clean og: tags
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en",
      },
    });
    var html = await r.text();

    var image =
      pick(html, /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
      pick(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      pick(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (!image) {
      var m = html.match(/https?:\/\/i\.pinimg\.com\/[^\s"'<>\\]+\.(?:jpg|jpeg|png|webp)/i);
      if (m) image = m[0];
    }
    if (image) {
      image = image.replace(/&amp;/g, "&");
      // bump small Pinterest thumbnails up to a nicer size
      image = image.replace(/\/(?:\d{2,3}x\d{0,3}|\d{2,3}x)\//, "/736x/");
    }

    var title =
      pick(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      pick(html, /<title[^>]*>([^<]+)<\/title>/i);
    if (title) title = title.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 120);

    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).json({ image: image || null, title: title || null, finalUrl: r.url || url });
  } catch (e) {
    res.status(200).json({ image: null, title: null, error: String((e && e.message) || e) });
  }
};
