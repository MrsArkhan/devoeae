# DEVOE — devoe.com.br

Portfólio da DEVOE (Aígo Silva). Site estático hospedado no **Cloudflare Pages**, publicado automaticamente a cada alteração neste repositório (branch `main`).

## Onde fica cada coisa
| Arquivo / pasta | O que é |
|---|---|
| `index.html` | O site inteiro (HTML + CSS + JS). No topo do script fica o objeto `CONFIG` com edições, vídeos do YouTube, packs, textos etc. |
| `admin.html` | Painel do instrutor (devoe.com.br/admin) — alunos da área ASCOM, bloqueios, histórico de logins. |
| `assets/i/` | Imagens do site. |
| `videos/` | Edições em destaque: `edit-<id>.mp4` (vídeo completo), `edit-<id>.jpg` (capa), `cut-<id>.mp4` (recorte de 6,8 s usado na prévia automática). |
| `downloads/` | Arquivos da área ASCOM (brasões, packs). |
| `audio/fundo.mp3` | Música de fundo. |
| `termos.html`, `privacidade.html` | Termos de Serviço e Política de Privacidade (exigidos pelo TikTok). |
| `functions/` | Funções do Cloudflare (rodam no servidor). |

## Funções (pasta `functions/`)
- `/api/tiktok` — 3 vídeos mais novos do TikTok para as notificações (página pública de embed, cache 15 min).
- `/api/stats` — números ao vivo: seguidores/curtidas e soma das views de todos os vídeos do TikTok (API oficial), inscritos e views do YouTube.
- `/api/tiktok-auth` — autorização da conta @devoe.ae no TikTok. **Vale 1 ano**; se os números do TikTok pararem de atualizar, abra https://devoe.com.br/api/tiktok-auth e autorize de novo.
- `/__/*` — ponte do login Google (Firebase) para o domínio devoe.com.br.

## Contas e serviços (todos no nome do dono)
- **GitHub**: MrsArkhan/devoeae — código.
- **Cloudflare** (craftg757@gmail.com): projeto Pages `devoeae`, domínio, KV `devoe-kv` (ligado como `TT_KV`) e variáveis `TT_CLIENT_KEY` / `TT_CLIENT_SECRET`.
- **Firebase** projeto `devoe-469a6`: login Google da área ASCOM e banco Firestore (`users`, `logins`, `requests`). Admin: craftg757@gmail.com.
- **TikTok for Developers**: app "DEVOE Site" (Sandbox "DEVOE teste") com Login Kit e escopos `user.info.basic`, `user.info.stats`, `video.list`.

## Manutenção
- **Domínio devoe.com.br**: renovar anualmente no registro.br.
- **Código ASCOM**: `CONFIG.ascomCode` no `index.html`.
- **Trocar uma edição em destaque**: em `CONFIG.edits` (id do TikTok, título, views) + arquivos em `videos/` + o id em `EDIT_IDS` de `functions/_tt.js`.
