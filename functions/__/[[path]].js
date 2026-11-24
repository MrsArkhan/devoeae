// Ponte do login do Google: devoe.com.br/__/... -> Firebase Auth
// Permite que a tela de login mostre "devoe.com.br" no lugar do domínio do Firebase.
const ORIGIN = "https://devoe-469a6.firebaseapp.com";

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const target = ORIGIN + url.pathname + url.search;
  const headers = new Headers(request.headers);
  headers.delete("host");
  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.arrayBuffer();
  const res = await fetch(target, init);
  const out = new Response(res.body, res);
  // redirecionamentos internos do Firebase continuam no seu domínio
  const loc = out.headers.get("location");
  if (loc && loc.startsWith(ORIGIN)) out.headers.set("location", loc.replace(ORIGIN, url.origin));
  return out;
}
