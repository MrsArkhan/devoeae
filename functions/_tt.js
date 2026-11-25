// Integração oficial TikTok (Login Kit + video.list) — usada por /api/tiktok-auth e /api/stats.
// Precisa no Cloudflare Pages: variáveis TT_CLIENT_KEY e TT_CLIENT_SECRET + KV namespace ligado como TT_KV.
export const REDIRECT = "https://devoe.com.br/api/tiktok-auth";
export const SCOPES = "user.info.basic,user.info.stats,video.list";

async function tokenReq(env, body) {
  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
    body: new URLSearchParams({ client_key: env.TT_CLIENT_KEY, client_secret: env.TT_CLIENT_SECRET, ...body }) });
  const j = await r.json();
  if (!j.access_token) throw new Error(j.error_description || j.error || "token");
  const now = Date.now();
  return { access_token: j.access_token, refresh_token: j.refresh_token, open_id: j.open_id, scope: j.scope,
    exp: now + (j.expires_in - 300) * 1000, rexp: now + (j.refresh_expires_in || 0) * 1000 };
}
export const exchangeCode = (env, code) => tokenReq(env, { code, grant_type: "authorization_code", redirect_uri: REDIRECT });

export async function getToken(env) {
  if (!env.TT_KV || !env.TT_CLIENT_KEY || !env.TT_CLIENT_SECRET) return null;
  const t = await env.TT_KV.get("tt_token", "json"); if (!t) return null;
  if (Date.now() < t.exp) return t;
  const n = await tokenReq(env, { grant_type: "refresh_token", refresh_token: t.refresh_token });
  await env.TT_KV.put("tt_token", JSON.stringify(n)); return n;
}

/* soma as visualizações de todos os vídeos (cache de 1 h no KV) */
export async function ttOfficial(env) {
  const t = await getToken(env); if (!t) return null;
  const cached = await env.TT_KV.get("tt_stats", "json");
  if (cached && Date.now() - cached.at < 3600e3) return cached;
  const H = { authorization: `Bearer ${t.access_token}`, "content-type": "application/json" };
  const u = await (await fetch("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count", { headers: H })).json();
  let views = 0, n = 0, cursor = undefined, more = true, pages = 0;
  while (more && pages < 80) {
    const r = await (await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,view_count", { method: "POST", headers: H,
      body: JSON.stringify(cursor ? { max_count: 20, cursor } : { max_count: 20 }) })).json();
    const d = r.data || {}; (d.videos || []).forEach(v => { views += +v.view_count || 0; n++; });
    more = !!d.has_more; cursor = d.cursor; pages++;
  }
  const uu = (u.data && u.data.user) || {};
  const out = { at: Date.now(), ttViews: views, ttVideosCounted: n, ttFollowers: uu.follower_count ?? null, ttLikes: uu.likes_count ?? null, ttVideos: uu.video_count ?? null, complete: !more };
  if (n) await env.TT_KV.put("tt_stats", JSON.stringify(out));
  return n ? out : cached || null;
}
