// GET  /api/tt-notify            → checa se tem vídeo novo no TikTok e avisa no Discord (chamado pelo GitHub Actions)
// POST /api/tt-notify {setup}    → guarda o webhook do Discord no KV (só aceita o webhook certo, conferido por hash)
import { notify, hookOk } from "../_dc.js";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: {
  "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } });

export async function onRequestGet(ctx) {
  try { return json(await notify(ctx.env)); } catch (e) { return json({ ok: false, why: String(e && e.message || e) }, 500); }
}

export async function onRequestPost(ctx) {
  let b = {}; try { b = JSON.parse(await ctx.request.text()); } catch (_) {}
  if (!b.setup || !(await hookOk(b.setup))) return json({ ok: false }, 403);
  await ctx.env.TT_KV.put("dc_hook", b.setup);
  return json(await notify(ctx.env, { force: true, init: true }));
}
