// Números ao vivo para o site: seguidores/curtidas do TikTok e inscritos/visualizações do YouTube.
// Sem senha nem chave: lê as páginas públicas (embed do TikTok e "Sobre" do canal). Cache de 15 min.
import { ttOfficial } from "../_tt.js";
const TT = "devoe.ae", YT = "@devoeae";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const num = t => { if (!t) return null; const m = String(t).replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i); if (!m) return null;
  return Math.round(parseFloat(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase()] || 1)); };

async function tiktok() {
  const r = await fetch(`https://www.tiktok.com/embed/@${TT}`, { headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" } });
  const m = (await r.text()).match(/<script[^>]*id="__FRONTITY_CONNECT_STATE__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return {};
  const d = JSON.parse(m[1]).source.data[`/embed/@${TT}`] || {};
  const u = d.userInfo || {};
  return { ttFollowers: u.followerCount ?? null, ttLikes: u.heartCount ?? null, ttVideos: u.videoCount ?? null };
}
async function youtube() {
  const r = await fetch(`https://www.youtube.com/${YT}/about?hl=en&gl=US`, { headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9", "cookie": "SOCS=CAI; CONSENT=YES+1" } });
  const h = await r.text();
  const g = re => { const m = h.match(re); return m ? m[1] : null; };
  const subsText = g(/"subscriberCountText":"([^"]+)"/) || g(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/);
  const viewsText = g(/"viewCountText":"([^"]+)"/);
  return { ytSubs: num(subsText), ytSubsText: subsText, ytViews: viewsText ? +viewsText.replace(/[^\d]/g, "") || null : null };
}

export async function onRequestGet(ctx) {
  const cache = caches.default, key = new Request(new URL("/api/stats?v=5", ctx.request.url).toString());
  const hit = await cache.match(key); if (hit) return hit;
  const [a, b, c] = await Promise.allSettled([tiktok(), youtube(), ttOfficial(ctx.env).catch(() => null)]);
  const off = c.value || {};
  const data = { ...(a.value || {}), ...(b.value || {}), at: Date.now() };
  if (off.ttViews) { data.ttViews = off.ttViews; data.ttViewsSource = "api"; }          // total real de todos os vídeos
  if (off.ttFollowers) data.ttFollowers = off.ttFollowers;
  if (off.ttLikes) data.ttLikes = off.ttLikes;
  if (off.edits) data.edits = off.edits;
  if (off.ttVideosCounted) data.ttCounted = off.ttVideosCounted;
  if (off.ttVideos) data.ttVideos = off.ttVideos;
  const ok = !!(data.ttFollowers || data.ytSubs || data.ytViews);
  const res = new Response(JSON.stringify({ ok, ...data }), { headers: { "content-type": "application/json; charset=utf-8",
    "cache-control": ok ? "public, max-age=900" : "public, max-age=60", "access-control-allow-origin": "*" } });
  if (ok) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}
