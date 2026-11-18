# Segurança

| Risco (OWASP) | Medida |
|---|---|
| Controlo de acesso (A01) | RLS em todas as tabelas; funções `has_role`/`is_admin`/`is_moderator` (`security definer`); Server Actions verificam sessão, conta não suspensa e papéis; `proxy.ts` redireciona rotas privadas; triggers impedem alteração de campos reservados. |
| Falhas criptográficas (A02) | HTTPS (Vercel + HSTS); sessões em cookies geridos pelo `@supabase/ssr`; palavras-passe tratadas exclusivamente pelo Supabase Auth. |
| Injeção (A03) | Apenas consultas parametrizadas (PostgREST/supabase-js); nenhum SQL dinâmico concatenado; termos de pesquisa saneados; IDs validados com Zod (`uuid`). |
| XSS | React escapa todo o texto; o guia usa um renderizador Markdown que gera elementos React (sem HTML bruto); URLs externas limitadas a `http(s)`; JSON-LD com `<` escapado. |
| CSRF | Server Actions do Next.js validam a origem do pedido; cookies `SameSite=Lax`; não existem endpoints GET com efeitos. |
| Redirecionamento aberto | `safeInternalPath` aceita apenas caminhos internos no parâmetro `next`. |
| Design inseguro / abuso (A04) | Rate limiting persistente por utilizador e ação (publicações, comentários, mensagens, denúncias, avaliações, registos). |
| Configuração (A05) | Cabeçalhos: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS; `poweredByHeader` desligado. |
| Componentes (A06) | Dependências recentes; correr `npm audit` regularmente. |
| Identificação/autenticação (A07) | Supabase Auth com confirmação de email, recuperação por ligação única, rotação de refresh tokens, mensagens que não revelam se um email existe. |
| Integridade (A08) | Validação Zod no servidor para todos os dados recebidos; tipos MIME e tamanhos limitados nos buckets. |
| Registo e monitorização (A09) | `audit_logs` para todas as ações de moderação e administração, consultáveis em `/admin/auditoria`. |
| SSRF (A10) | `next/image` limitado a domínios Supabase; sem fetch de URLs fornecidas por utilizadores no servidor. |

## Credenciais

- Apenas variáveis `NEXT_PUBLIC_*` chegam ao browser (URL e chave pública do Supabase, estilo do mapa).
- `SUPABASE_SECRET_KEY` só é lida em `src/lib/supabase/admin.ts`, que importa `server-only` (o build falha se for importado no cliente).
- `.env*` está no `.gitignore` (exceto `.env.example`, sem segredos).

## Uploads

- Buckets públicos: `avatars`, `post-media`, `business-media`, `product-media`, `event-media` — escrita apenas na pasta do próprio utilizador.
- Buckets privados: `chat-media` (só participantes da conversa, via URL assinado) e `documents` (dono e staff).
- Tipos permitidos por bucket (JPEG/PNG/WebP; MP4/WebM/MOV no feed; PDF em documentos) e limites de tamanho no servidor de Storage.
- Imagens recomprimidas no browser antes do envio (remove metadados EXIF como a localização GPS).

## Mensagens privadas

`can_access_conversation` garante que só membros (ou qualquer utilizador ativo, no chat geral) leem e escrevem.
Bloqueios impedem iniciar conversas e enviar mensagens diretas, e escondem mensagens de utilizadores bloqueados.
A moderação só vê mensagens no contexto de denúncias e do painel.

## Contas suspensas

`profiles.is_banned` bloqueia todas as escritas via RLS (`is_active_user`). Com a chave secreta configurada, o
utilizador também é banido no Supabase Auth (não consegue iniciar sessão).

## Backups

Ativar backups no Supabase (diários incluídos nos planos pagos; PITR opcional) e/ou `npx supabase db dump` agendado.
