# Testes

## Automáticos

```bash
npm run check   # tipos + ESLint + Vitest
npm run build   # build de produção
```

Os testes unitários (`tests/`) cobrem: normalização de telefones e ligações WhatsApp, slugs, proteção contra
redirecionamentos abertos e URLs perigosas, conversão de fuso horário da ilha, esquemas Zod (registo, negócios,
publicações, eventos, produtos, mensagens, denúncias), regras RBAC e o renderizador Markdown (proteção XSS).

## Base de dados e RLS

```bash
npm run db:validate   # aplica todas as migrations + seed num PostgreSQL real (PGlite/WASM) e testa ~87 regras RLS
npm run test:rls      # mesmo tipo de testes contra um Supabase local (Docker) — ver variáveis no topo do script
```

`db:validate` não precisa de Docker: substitui os esquemas `auth`/`storage` e o PostGIS por stubs mínimos e
verifica, como utilizadores diferentes, aprovação de negócios, contadores, privacidade das mensagens, bloqueios,
grupos, storage, suspensões, denúncias, auditoria, rate limiting e pesquisa.

## Responsividade automática

```bash
npm run build && npm start                      # noutro terminal
BASE_URL=http://localhost:3000 npm run test:responsive
```

Abre as páginas públicas em 360, 390, 768, 1024, 1440 px e em horizontal (844×390), falha se houver scroll
horizontal e guarda capturas em `responsive-screenshots/`.

## Testes de permissões (manual, com dois utilizadores)

- [ ] Visitante sem sessão: `/dashboard`, `/admin`, `/comunidade/chat` redirecionam para `/entrar`.
- [ ] Utilizador comum: `/admin` redireciona para `/`; não consegue aprovar o próprio estabelecimento (estado mantém-se `pending`).
- [ ] Utilizador A não abre `/comunidade/mensagens/<conversa de B e C>` (404).
- [ ] Utilizador bloqueado não consegue enviar mensagem privada.
- [ ] Moderador acede a `/admin` mas não a `/admin/utilizadores` (apenas admin).
- [ ] Conta suspensa não consegue publicar, comentar nem enviar mensagens.

## Responsividade (todas as páginas)

Testar em DevTools e dispositivos reais, nas larguras **360, 390, 414, 768, 1024, 1280, 1440 e 1920 px**, em
orientação vertical e horizontal:

- [ ] Sem scroll horizontal; nenhum elemento cortado ou sobreposto.
- [ ] Barra de navegação inferior visível < 768 px e escondida em ecrãs maiores.
- [ ] Botões e ligações com alvo de toque ≥ 44 px.
- [ ] Formulários utilizáveis com teclado virtual (inputs com 16 px, sem zoom no iOS).
- [ ] Mapa: filtros roláveis, alternância Mapa/Lista em telemóvel, ficha do estabelecimento sem tapar controlos.
- [ ] Chat: altura total do ecrã, compositor fixo em baixo, scroll para a última mensagem.
- [ ] Painel admin: menu lateral em desktop, gaveta em telemóvel; tabelas convertem-se em cartões.

Navegadores: Chrome Android, Safari iOS, Samsung Internet, Chrome/Edge/Firefox/Safari desktop.

## Desempenho

- Lighthouse (modo mobile, rede "Slow 4G") nas páginas `/`, `/servicos`, `/feed`, `/mapa`.
- Confirmar imagens em AVIF/WebP e carregamento lazy abaixo da dobra.
