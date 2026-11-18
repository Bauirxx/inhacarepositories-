# Arquitetura e decisões técnicas

## Visão geral

```text
Browser (mobile-first, PWA)
  │  HTML via Server Components · interações via Server Actions · Realtime via WebSocket
  ▼
Next.js 16 na Vercel
  ├─ proxy.ts ............ renova a sessão Supabase (cookies) e protege rotas privadas
  ├─ app/ ................ páginas (Server Components) por grupos de layout
  ├─ features/*/actions .. Server Actions: validação Zod → autorização → rate limit → escrita
  └─ services/* .......... leituras tipadas (usadas por páginas e actions)
  ▼
Supabase
  ├─ PostgreSQL + PostGIS  esquema normalizado, RLS em todas as tabelas, triggers
  ├─ Auth ................ email/palavra-passe, confirmação, recuperação (PKCE)
  ├─ Realtime ............ messages, notifications (RLS aplicada às subscrições)
  └─ Storage ............. buckets públicos (media) e privados (chat, documentos)
```

## Decisões

- **Server Components + Server Actions** em vez de uma API REST própria: menos código, validação e autorização
  no servidor, sem expor endpoints genéricos. O browser usa o cliente Supabase apenas para Realtime, uploads e URLs assinados.
- **RLS como fonte de verdade da autorização.** As actions verificam permissões para dar mensagens claras, mas
  mesmo que alguém chame a API do Supabase diretamente com a chave pública, as políticas impedem acessos indevidos.
- **Triggers de proteção de campos** (`protect_*_fields`): um proprietário pode editar o seu estabelecimento mas não
  consegue alterar `status`, `is_verified`, `is_featured`, contadores ou classificações. Contadores são mantidos
  por triggers `security definer` (gostos, comentários, presenças, avaliações).
- **Aprovação administrativa:** estabelecimentos e eventos entram como `pending`; editar um registo rejeitado volta a
  colocá-lo em `pending`. Produtos ficam visíveis de imediato (mercado de divulgação) e podem ser suspensos.
- **Notificações automáticas** geradas na base de dados (comentários, respostas, seguidores, mensagens privadas, mudanças de estado).
- **Rate limiting persistente** em PostgreSQL (`check_rate_limit`), porque contadores em memória não funcionam em serverless.
- **Fuso horário:** a ilha usa UTC+2 fixo. Datas são guardadas em UTC e apresentadas/introduzidas sempre na hora da
  ilha (`toIslandTime`, `islandLocalToIso`), independentemente do fuso do servidor (UTC na Vercel) ou do visitante.
- **Mapa:** MapLibre carregado dinamicamente só nas páginas que o usam; marcadores em GeoJSON com clustering
  (desempenho em telemóveis); tiles vetoriais OpenFreeMap (gratuitos, dados OpenStreetMap, sem chave). As coordenadas
  são sempre fornecidas pelos prestadores e validadas pela administração — nenhuma coordenada é inventada.
- **Worker do MapLibre:** o MapLibre 6 resolve o seu Web Worker relativamente ao próprio módulo, o que deixa de
  funcionar depois do empacotamento. `scripts/copy-maplibre-worker.mjs` (executado em `predev`/`prebuild`) copia o
  worker para `public/maplibre/` e `loadMaplibre()` chama `setWorkerUrl`. O contentor do mapa fica dentro de um
  invólucro `absolute inset-0` porque o CSS do MapLibre força `position: relative` no próprio contentor.
- **PostGIS:** coluna `location geography(point)` sincronizada por trigger, índice GiST e função `businesses_nearby`.
- **Imagens:** comprimidas no browser (WebP, máx. 1600 px) antes do upload, servidas por `next/image` (AVIF/WebP).
- **Conteúdo editorial em Markdown seguro:** um renderizador próprio que converte para elementos React (nunca
  `dangerouslySetInnerHTML`), eliminando XSS no guia.
- **PWA:** `manifest.ts` + `public/sw.js` com network-first para páginas públicas, cache-first para assets,
  exclusão de rotas autenticadas e da API Supabase, e página `/offline`.
- **Renderização dinâmica:** quase todas as páginas dependem da sessão (cabeçalho), por isso são renderizadas a pedido;
  `cacheComponents` está desativado para manter o modelo simples. O sitemap usa um cliente anónimo e é revalidado a cada hora.

## Modelo de dados (principais tabelas)

profiles · user_roles · user_blocks · follows · business_categories · businesses · business_services ·
business_media · business_verifications · reviews · posts · post_media · comments · post_reactions · saved_posts ·
events · event_attendees · product_categories · products · conversations · conversation_members · messages ·
groups · group_members · help_requests · reports · notifications · advertisements · audit_logs · guide_pages ·
site_settings · rate_limits.

Todas usam UUID, chaves estrangeiras, `created_at`/`updated_at`, restrições `check` e índices adequados
(incluindo trigramas para pesquisa).

## Limitações conhecidas / próximos passos

- Editar um estabelecimento já aprovado não o devolve à fila de aprovação; alterações de coordenadas podem ser
  revistas em *Admin → Estabelecimentos* (ligação "Validar coordenadas").
- Notificações push nativas (Web Push) não estão implementadas; as notificações são in-app e em tempo real.
- Testes end-to-end (Playwright) contra um projeto Supabase de testes são o próximo passo recomendado.
