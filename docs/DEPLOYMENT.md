# Deployment — Vercel + Supabase

## 1. Supabase

1. Criar um projeto em https://supabase.com (região próxima de Moçambique, ex.: `eu-central` ou `af-south` se disponível).
2. Aplicar o esquema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
   ou executar cada ficheiro de `supabase/migrations/` por ordem no SQL Editor.
3. Executar `supabase/seed.sql` no SQL Editor.
4. Em **Project Settings → API**, copiar o Project URL, a chave pública (publishable/anon) e a chave secreta (secret/service_role).
5. Em **Authentication → URL Configuration** definir *Site URL* e *Redirect URLs* (ver passo 3 da Vercel).
6. (Recomendado) Em **Authentication → SMTP Settings** configurar um SMTP próprio: o SMTP de teste do Supabase tem limites muito baixos de envio de emails.
7. (Recomendado) Ativar **backups** (Point-in-Time Recovery nos planos pagos; nos planos gratuitos, exportar periodicamente com `npx supabase db dump`).

## 2. Vercel

1. Em https://vercel.com → **Add New → Project** → importar `Bauirxx/inhacarepositories-`.
2. Framework: Next.js (detetado). Build command: `npm run build`. Node.js: 22.x.
3. **Environment Variables** (Production e Preview):

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave pública |
   | `SUPABASE_SECRET_KEY` | chave secreta (**não** marcar como pública) |
   | `NEXT_PUBLIC_SITE_URL` | `https://<projeto>.vercel.app` (Production) |
   | `NEXT_PUBLIC_MAP_STYLE_URL` | opcional |

   Em Preview, `NEXT_PUBLIC_SITE_URL` pode ficar vazio: a app usa `VERCEL_URL` automaticamente.
4. **Deploy**. HTTPS é automático no domínio `*.vercel.app`.
5. Voltar ao Supabase e definir:
   - Site URL: `https://<projeto>.vercel.app`
   - Redirect URLs: `https://<projeto>.vercel.app/auth/callback`, `https://*-<conta>.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`
6. Deploy automático: cada push para `main` publica em produção; pull requests geram previews.

## 3. Verificação pós-deploy

- [ ] `/` carrega com o hero, categorias e secções vazias ou com dados.
- [ ] `/robots.txt`, `/sitemap.xml` e `/manifest.webmanifest` respondem.
- [ ] Registo → email de confirmação → `/auth/callback` → `/dashboard`.
- [ ] Promover o primeiro admin (README) e abrir `/admin`.
- [ ] Registar um estabelecimento com localização → aprovar em `/admin/negocios` → aparece em `/servicos` e `/mapa`.
- [ ] Publicar no feed com fotografia; gostar, comentar, guardar.
- [ ] Abrir `/comunidade/chat` em dois browsers e confirmar mensagens em tempo real.
- [ ] Em telemóvel: instalar como app (PWA) e confirmar a navegação inferior.

## 4. Domínio personalizado (fase futura)

Vercel → Project → Settings → Domains → adicionar o domínio e configurar DNS. Atualizar `NEXT_PUBLIC_SITE_URL` e as
URLs de autenticação no Supabase.
