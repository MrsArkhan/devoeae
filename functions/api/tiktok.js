// Últimos vídeos do TikTok @devoe.ae para as notificações do site.
// Lê a página pública de embed do perfil (tiktok.com/embed/@devoe.ae) e devolve os mais novos.
// Fica em cache por 15 min para não consultar o TikTok a cada visita.
import { notify } from "../_dc.js";
const USER = "devoe.ae";
const fmt = n => { n = +n || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "K";
  return String(n); };
const title = d => (d || "").split(/\s\|/)[0].replace(/#\S+/g, "").replace(/\s+/g, " ").trim() || "Novo vídeo";

export async function onRequestGet(ctx) {
  const cache = caches.default, key = new Request(new URL("/api/tiktok?v=1", ctx.request.url).toString());
  const hit = await cache.match(key); if (hit) return hit;
  let items = [], ok = false;
  try {
    const r = await fetch(`https://www.tiktok.com/embed/@${USER}`, { headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
      "accept-language": "pt-BR,pt;q=0.9,en;q=0.8", "accept": "text/html" } });
    const html = await r.text();
    const m = html.match(/<script[^>]*id="__FRONTITY_CONNECT_STATE__"[^>]*>([\s\S]*?)<\/script>/);
    if (m) {
      const st = JSON.parse(m[1]);
      const page = st && st.source && st.source.data && (st.source.data[`/embed/@${USER}`] || Object.values(st.source.data).find(x => x && x.videoList));
      const list = (page && page.videoList) || [];
      items = list.filter(v => v && v.id && !v.privateItem)
        .sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1))           // id maior = mais novo (ignora os fixados)
        .slice(0, 6)
        .map(v => ({ id: String(v.id), title: title(v.desc), views: fmt(v.playCount), cover: v.coverUrl || v.originCoverUrl || "" }));
      ok = items.length > 0;
    }
  } catch (_) {}
  const res = new Response(JSON.stringify({ ok, items, at: Date.now() }), { headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": ok ? "public, max-age=900" : "public, max-age=60",
    "access-control-allow-origin": "*" } });
  if (ok) ctx.waitUntil(cache.put(key, res.clone()));
  ctx.waitUntil(notify(ctx.env).catch(() => {}));   // aproveita a visita para checar vídeo novo e avisar no Discord
  return res;
}
