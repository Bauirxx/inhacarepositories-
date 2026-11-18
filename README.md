# INHACA CONNECT

**A ilha conectada. Uma comunidade, um destino.**

Plataforma web comunitária, turística e comercial da Ilha de Inhaca (Moçambique): guia turístico, mapa interativo,
diretório de negócios, feed comunitário, chat em tempo real, agenda de acontecimentos, mercado local, área
empresarial e painel administrativo.

Repositório: https://github.com/Bauirxx/inhacarepositories-

---

## Stack

| Camada | Tecnologia |
|---|---|
| Aplicação | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Interface | Tailwind CSS 4, shadcn/ui (Radix), Lucide Icons |
| Backend | Supabase: PostgreSQL + PostGIS, Auth, Realtime, Storage |
| Mapas | MapLibre GL JS + OpenStreetMap (tiles vetoriais OpenFreeMap por omissão) |
| Validação | Zod + React Hook Form |
| Testes | Vitest |
| Deployment | Vercel (domínio gratuito `*.vercel.app`) |

## Funcionalidades

- **Público (sem conta):** página inicial, guia "Descobrir Inhaca", mapa, diretório, feed, agenda (lista e calendário), mercado, perfis, pesquisa global.
- **Utilizadores registados:** publicar no feed (texto, fotografias, vídeo), gostar, comentar e responder, partilhar, guardar, denunciar; seguir pessoas; avaliar estabelecimentos; confirmar presença em eventos.
- **Comunidade:** chat geral, grupos temáticos, mensagens privadas com fotografias, histórico paginado, indicadores de não lidas, notificações em tempo real, bloqueio de utilizadores, denúncia de mensagens, **Ajuda Comunitária**.
- **Área empresarial (`/dashboard`):** registo e gestão de estabelecimentos (logótipo, galeria, contactos, WhatsApp, localização no mapa, horários, serviços, preços, comodidades), pedido de verificação com documento, produtos do mercado, eventos.
- **Administração (`/admin`):** indicadores, aprovação de estabelecimentos e eventos, validação de coordenadas, verificações, moderação de publicações, produtos, comentários e chat, denúncias, gestão de utilizadores e papéis (RBAC), suspensão de contas, grupos, guia turístico, publicidade, configurações e auditoria.
- **PWA:** instalável, service worker com cache de páginas públicas e página offline.
- **SEO:** metadados por página, Open Graph, JSON-LD (WebSite, LocalBusiness, Event), sitemap e robots.

## Papéis (RBAC)

`visitor` · `resident` · `business_owner` · `seller` · `event_organizer` · `moderator` · `admin`.
Um utilizador pode ter vários papéis. `business_owner`, `seller` e `event_organizer` são atribuídos automaticamente
quando o utilizador submete o primeiro estabelecimento, produto ou evento; `resident` é escolhido pelo próprio;
`moderator` e `admin` só por administradores. A autorização é aplicada em três camadas: interface, Server Actions e
políticas RLS na base de dados (a camada que realmente decide).

---

## Desenvolvimento local

Requisitos: Node.js 20.9+ (recomendado 22), npm, conta Supabase (ou Docker + Supabase CLI para correr localmente).

```bash
npm install
cp .env.example .env.local   # preencher as variáveis
npm run dev                  # http://localhost:3000
```

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Sim (produção) | URL pública, sem barra final. Ex.: `https://inhaca-connect.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sim | Chave pública (`sb_publishable_…`) ou, em projetos antigos, a `anon key` (pode usar `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SECRET_KEY` | Recomendada | Chave secreta (`sb_secret_…` ou `service_role`). **Só servidor.** Usada para bloquear o login de contas suspensas |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Não | Estilo MapLibre. Por omissão `https://tiles.openfreemap.org/styles/liberty` (gratuito, sem chave) |

A chave secreta nunca é exposta ao browser: só é lida em `src/lib/supabase/admin.ts`, protegido pelo pacote `server-only`.

### Scripts

```bash
npm run dev         # servidor de desenvolvimento
npm run build       # build de produção
npm run start       # servir o build
npm run lint        # ESLint
npm run typecheck   # tipos de rotas + TypeScript
npm run test        # testes unitários (Vitest)
npm run check       # typecheck + lint + testes + validação SQL/RLS
npm run db:validate # migrations + seed + testes RLS num PostgreSQL em WASM (sem Docker)
npm run test:responsive # scroll horizontal e capturas em várias larguras (servidor a correr)
npm run icons       # regenerar ícones PWA e imagem Open Graph
```

---

## Base de dados (Supabase)

As migrations estão em `supabase/migrations/` (versionadas por data) e o seed em `supabase/seed.sql`.

**Opção A — projeto na nuvem (recomendado):**

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push          # aplica as migrations
```

Depois execute o conteúdo de `supabase/seed.sql` no **SQL Editor** do painel (categorias, grupos, chat geral,
definições e páginas iniciais do guia).

**Opção B — sem CLI:** cole e execute, por ordem, cada ficheiro de `supabase/migrations/` no SQL Editor e, no fim, `seed.sql`.

**Opção C — local com Docker:** `npx supabase start` (aplica migrations e seed automaticamente) e use as chaves impressas no terminal.

### Primeiro administrador

1. Registe-se na aplicação e confirme o email.
2. No SQL Editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'o-seu-email@exemplo.com'
on conflict do nothing;
```

### Configuração de Auth no Supabase

- **Authentication → URL Configuration**
  - *Site URL*: `https://<o-seu-projeto>.vercel.app`
  - *Redirect URLs*: `https://<o-seu-projeto>.vercel.app/auth/callback`, `http://localhost:3000/auth/callback` e, para previews, `https://*-<a-sua-conta>.vercel.app/auth/callback`
- **Authentication → Providers → Email**: ativo, com "Confirm email" ligado.
- **Realtime**: as tabelas `messages` e `notifications` são adicionadas à publicação pela migration 0009.
- **Storage**: os buckets e políticas são criados pela migration 0008.

---

## Deployment na Vercel

Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para o passo a passo completo. Resumo:

1. Importar o repositório GitHub na Vercel (framework detetado: Next.js).
2. Definir as variáveis de ambiente (Production e Preview).
3. Deploy. Cada push para `main` faz deploy automático de produção; outros ramos geram previews.
4. Atualizar *Site URL* e *Redirect URLs* no Supabase com o domínio `*.vercel.app` atribuído.
5. Verificar: página inicial, registo/confirmação de email, login, publicação no feed, mapa e chat.

---

## Estrutura

```text
src/
  app/
    (site)/        páginas públicas com cabeçalho, rodapé e navegação inferior
    (app)/         mapa e chat em ecrã inteiro
    (auth)/        entrar, registar, recuperar e redefinir palavra-passe
    dashboard/     área pessoal e empresarial
    admin/         painel administrativo
    auth/callback  troca de código (PKCE) da confirmação de email
  components/      ui (shadcn), layout, feed, map, business, chat, events, marketplace, admin…
  features/        Server Actions por domínio (lógica de negócio + validação + autorização)
  services/        consultas de leitura ao Supabase por domínio
  lib/             supabase (clientes), validations (Zod), permissions, utils, auth, rate limit
  config/          configuração do site e rótulos
  types/           tipos de domínio
  proxy.ts         renovação da sessão e proteção de rotas (antigo middleware)
supabase/
  migrations/      esquema, RLS, funções, triggers, storage, realtime
  seed.sql         dados estruturais (sem dados fictícios)
tests/             testes unitários
docs/              arquitetura, segurança, deployment
```

## Conteúdos e fotografias

A plataforma **não inclui dados fictícios** apresentados como reais: estabelecimentos, coordenadas, eventos e
produtos são registados pelos prestadores e aprovados pela administração. O texto inicial do guia turístico é um
ponto de partida assinalado como tal e editável no painel. A imagem da página inicial é uma **ilustração** marcada
"Imagem ilustrativa" e deve ser substituída por uma fotografia real em *Admin → Configurações*.

## Documentação

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — arquitetura e decisões técnicas
- [docs/SECURITY.md](docs/SECURITY.md) — modelo de segurança (OWASP, RLS, RBAC)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — deployment na Vercel e configuração do Supabase
- [docs/TESTING.md](docs/TESTING.md) — testes automáticos e checklist de testes manuais/responsividade
