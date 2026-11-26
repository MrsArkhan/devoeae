// Avisa no Discord (#new-videos) quando sai vídeo novo no TikTok @devoe.ae.
// O link do webhook fica guardado só no KV (TT_KV, chave "dc_hook"), nunca no código.
// Quem chama: o GitHub Actions a cada 10 min (/api/tt-notify) e o /api/tiktok quando o cache vence.
import { getToken } from "./_tt.js";

const USER = "devoe.ae";
const HOOK_HASH = "694b8dafba730f5a4800ff8f012fe2755c1a6582221fdd0e266a952ca4dacc4a";
const AVATAR = "https://cdn.discordapp.com/icons/1251384560005156864/784f37c93b4b35ce507481320ab333b0.png?size=256";
const MIN_GAP = 60 * 1000;                   // no máximo uma checagem por minuto
const cleanTitle = d => (d || "").split(/\s\|/)[0].replace(/#\S+/g, "").replace(/\s+/g, " ").trim();

export async function sha256(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export const hookOk = async h => typeof h === "string" && (await sha256(h)) === HOOK_HASH;

/* vídeos mais novos: API oficial primeiro, página de embed como reserva */
export async function latestVideos(env) {
  try {
    const t = await getToken(env);
    if (t) {
      const r = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time", {
        method: "POST", headers: { authorization: "Bearer " + t.access_token, "content-type": "application/json" },
        body: JSON.stringify({ max_count: 10 }) });
      const j = await r.json();
      const v = (j.data && j.data.videos) || [];
      if (v.length) return v.map(x => ({ id: String(x.id), title: cleanTitle(x.title || x.video_description), t: +x.create_time || 0 }));
    }
  } catch (_) {}
  try {
    const r = await fetch(`https://www.tiktok.com/embed/@${USER}`, { headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
      "accept-language": "en-US,en;q=0.9", accept: "text/html" } });
    const m = (await r.text()).match(/<script[^>]*id="__FRONTITY_CONNECT_STATE__"[^>]*>([\s\S]*?)<\/script>/);
    if (m) {
      const st = JSON.parse(m[1]);
      const page = st.source && st.source.data && (st.source.data[`/embed/@${USER}`] || Object.values(st.source.data).find(x => x && x.videoList));
      return ((page && page.videoList) || []).filter(v => v && v.id && !v.privateItem)
        .map(v => ({ id: String(v.id), title: cleanTitle(v.desc), t: +v.createTime || 0 }));
    }
  } catch (_) {}
  return [];
}

function message(v) {
  const name = v.title ? `**${v.title}**\n` : "";
  return {
    username: "DEVOE", avatar_url: AVATAR,
    content: `## 🔥 New edit just dropped on TikTok\n${name}-# 🇧🇷 Edit nova no TikTok — chega lá e deixa o like.\nhttps://www.tiktok.com/@${USER}/video/${v.id}`,
    allowed_mentions: { parse: [] }
  };
}

/* force=true ignora o intervalo mínimo (usado no setup) */
export async function notify(env, { force = false, init = false } = {}) {
  const kv = env.TT_KV; if (!kv) return { ok: false, why: "no kv" };
  const hook = await kv.get("dc_hook"); if (!hook) return { ok: false, why: "no hook" };
  const now = Date.now();
  if (!force) {
    const last = +(await kv.get("dc_last") || 0);
    if (now - last < MIN_GAP) return { ok: true, skipped: true };
  }
  await kv.put("dc_last", String(now));
  const vids = await latestVideos(env);
  if (!vids.length) return { ok: false, why: "no videos" };
  const seen = (await kv.get("dc_seen", "json")) || [];
  if (init || !seen.length) {                       // primeira vez: só memoriza, não manda nada antigo
    await kv.put("dc_seen", JSON.stringify(vids.map(v => v.id).slice(0, 60)));
    return { ok: true, init: true, n: vids.length };
  }
  if (!(await kv.get("dc_first_done2"))) {         // uma única vez: mostra o vídeo mais recente no canal
    const top = [...vids].sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1))[0];
    const r = await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(message(top)) });
    if (r.ok) await kv.put("dc_first_done2", "1");
    else return { ok: false, why: "discord " + r.status, detail: (await r.text()).slice(0, 300) };
  }
  const maxSeen = seen.reduce((a, b) => (BigInt(b) > BigInt(a) ? b : a), "0");
  const fresh = vids.filter(v => !seen.includes(v.id) && BigInt(v.id) > BigInt(maxSeen))
    .sort((a, b) => (BigInt(a.id) > BigInt(b.id) ? 1 : -1)).slice(-3);   // do mais antigo pro mais novo, no máx. 3
  const sent = [];
  for (const v of fresh) {
    const r = await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(message(v)) });
    if (r.ok || r.status === 204) sent.push(v.id); else break;
  }
  const all = [...new Set([...sent, ...vids.filter(v => !fresh.includes(v)).map(v => v.id), ...seen])].slice(0, 60);
  await kv.put("dc_seen", JSON.stringify(all));
  return { ok: true, sent };
}
