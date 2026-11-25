// Autorização (uma vez) da conta @devoe.ae no TikTok. Abra https://devoe.com.br/api/tiktok-auth e clique em Autorizar.
import { REDIRECT, SCOPES, exchangeCode } from "../_tt.js";
const page = (title, msg, ok) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0A0A0A;color:#ddd;font:16px system-ui;text-align:center;padding:20px">
<div><div style="font:900 italic 28px system-ui;color:#fff">DEVOE<b style="color:#D9A900">.</b></div><h1 style="color:${ok ? "#F2C94C" : "#ff6b6b"};font-size:22px">${title}</h1><p>${msg}</p><p><a style="color:#F2C94C" href="/">Voltar ao site</a></p></div></body>`,
  { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

export async function onRequestGet({ request, env }) {
  if (!env.TT_CLIENT_KEY || !env.TT_CLIENT_SECRET || !env.TT_KV) return page("Falta configurar", "As chaves do TikTok ou o KV ainda não foram configurados no Cloudflare.", false);
  const url = new URL(request.url), code = url.searchParams.get("code"), state = url.searchParams.get("state");
  const cookie = (request.headers.get("cookie") || "").match(/tt_state=([\w-]+)/);
  if (!code) {
    if (url.searchParams.get("error")) return page("Autorização cancelada", url.searchParams.get("error_description") || "Tente de novo.", false);
    const st = crypto.randomUUID();
    const go = new URL("https://www.tiktok.com/v2/auth/authorize/");
    go.search = new URLSearchParams({ client_key: env.TT_CLIENT_KEY, scope: SCOPES, response_type: "code", redirect_uri: REDIRECT, state: st }).toString();
    return new Response(null, { status: 302, headers: { location: go.toString(), "set-cookie": `tt_state=${st}; Path=/api/tiktok-auth; Max-Age=600; HttpOnly; Secure; SameSite=Lax` } });
  }
  if (!cookie || cookie[1] !== state) return page("Link expirado", "Abra de novo devoe.com.br/api/tiktok-auth e autorize.", false);
  try {
    const t = await exchangeCode(env, code);
    const owner = await env.TT_KV.get("tt_owner");
    if (owner && owner !== t.open_id) return page("Conta não permitida", "Só a conta dona do site pode ser ligada aqui.", false);
    if (!owner) await env.TT_KV.put("tt_owner", t.open_id);
    await env.TT_KV.put("tt_token", JSON.stringify(t)); await env.TT_KV.delete("tt_stats");
    const ok = (t.scope || "").includes("video.list");
    return page(ok ? "TikTok conectado! ✓" : "Conectado, mas sem permissão de vídeos",
      ok ? "Pronto. O site já vai mostrar as visualizações do TikTok ao vivo (atualiza a cada hora)." : "Confira se o escopo video.list está marcado no app do TikTok e autorize de novo.", ok);
  } catch (e) { return page("Não deu certo", "Erro do TikTok: " + String(e.message || e), false); }
}
