import express from "express";
import rateLimit from "express-rate-limit";
import dns from "node:dns/promises";
import net from "node:net";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";

const app = express();
app.set("trust proxy", 1);
app.use(rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }));

const MAX_BYTES = 500 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function publicAddress(address) {
  try {
    const parsed = ipaddr.parse(address);
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

async function checkedUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error("Geçersiz URL"); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Yalnızca HTTP/HTTPS desteklenir");
  if (u.username || u.password || u.port && !["80", "443"].includes(u.port)) throw new Error("Bu adres kabul edilmiyor");
  if (u.hostname === "localhost" || u.hostname.endsWith(".local") || net.isIP(u.hostname) && !publicAddress(u.hostname)) {
    throw new Error("Yerel veya özel ağ adresleri engellendi");
  }
  const records = await dns.lookup(u.hostname, { all: true, verbatim: true });
  if (!records.length || records.some(r => !publicAddress(r.address))) throw new Error("Güvenli olmayan sunucu adresi");
  return { u, records };
}

function requestPinned(u, records) {
  return new Promise((resolve, reject) => {
    const transport = u.protocol === "https:" ? https : http;
    let selected = records[0].address;
    const req = transport.get(u, {
      headers: { "User-Agent": "AuthorizedMediaDownloader/1.0", "Accept": "video/*,application/octet-stream;q=0.9" },
      lookup: (_hostname, _options, callback) => callback(null, selected, net.isIP(selected))
    }, resolve);
    req.setTimeout(20_000, () => req.destroy(new Error("Bağlantı zaman aşımına uğradı")));
    req.on("error", reject);
  });
}

app.get("/api/download", async (req, res) => {
  try {
    let raw = String(req.query.url || "");
    let response;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const { u, records } = await checkedUrl(raw);
      response = await requestPinned(u, records);
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        const location = response.headers.location;
        if (!location || hop === MAX_REDIRECTS) throw new Error("Yönlendirme sınırı aşıldı");
        raw = new URL(location, u).href;
        continue;
      }
      break;
    }
    if (!response || response.statusCode !== 200) {
      if (response) response.resume();
      throw new Error("Video sunucusu dosyayı vermedi");
    }
    const type = String(response.headers["content-type"] || "").split(";")[0].toLowerCase();
    if (!(type.startsWith("video/") || type === "application/octet-stream")) {
      response.resume();
      throw new Error("Bağlantı doğrudan video dosyası değil");
    }
    const length = Number(response.headers["content-length"] || 0);
    if (length > MAX_BYTES) {
      response.resume();
      throw new Error("Dosya sınırı 500 MB");
    }
    const name = (new URL(raw).pathname.split("/").pop() || "video.mp4").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Disposition", 'attachment; filename="' + (name || "video.mp4") + '"');
    res.setHeader("X-Content-Type-Options", "nosniff");
    let sent = 0;
    response.on("data", chunk => {
      sent += chunk.length;
      if (sent > MAX_BYTES) {
        response.destroy();
        if (!res.headersSent) res.status(413).end("Dosya 500 MB sınırını aşıyor");
        else res.destroy();
      }
    });
    response.pipe(res);
  } catch (err) {
    if (!res.headersSent) res.status(400).json({ error: err.message || "İndirme başarısız" });
    else res.destroy();
  }
});

app.get("/", (_req, res) => res.type("text").send("Video İndirici API çalışıyor."));
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log("API listening on " + port));
