/* Image download proxy (Vercel serverless function).

   Browsers ignore the <a download> attribute for cross-origin URLs, so a
   favorite image (e.g. i.pinimg.com) can't be saved directly. This streams the
   image bytes from same-origin with an attachment header, so the download
   actually saves to the device. */
module.exports = async (req, res) => {
  var url = (req.query && req.query.url) || "";
  if (Array.isArray(url)) url = url[0];
  if (!url && req.url) { try { url = new URL(req.url, "http://x").searchParams.get("url") || ""; } catch (e) {} }
  if (!url || !/^https?:\/\//i.test(url)) { res.status(400).send("bad url"); return; }

  try {
    var r = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LinroseBot/1.0)", "Accept": "image/*,*/*" },
    });
    if (!r.ok) { res.status(502).send("fetch failed"); return; }
    var type = r.headers.get("content-type") || "image/jpeg";
    if (!/^image\//i.test(type)) { res.status(415).send("not an image"); return; }
    var buf = Buffer.from(await r.arrayBuffer());
    var ext = (type.split("/")[1] || "jpg").split(";")[0].replace("jpeg", "jpg");
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Disposition", 'attachment; filename="linrose-image.' + ext + '"');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).send("error");
  }
};
