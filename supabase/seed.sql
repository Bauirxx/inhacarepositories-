-- ============================================================================
-- INHACA CONNECT · Seed inicial
-- Contém apenas dados estruturais (categorias, grupos, conversa geral,
-- definições e conteúdo editorial inicial do guia). NÃO contém estabelecimentos,
-- publicações ou utilizadores fictícios: esses dados devem ser registados pelos
-- prestadores e pela administração.
-- ============================================================================

-- Categorias de estabelecimentos
insert into public.business_categories (slug, name, icon, sort_order) values
  ('hoteis-resorts', 'Hotéis e resorts', 'bed-double', 1),
  ('alojamento-local', 'Alojamento local e casas', 'home', 2),
  ('restaurantes-bares', 'Restaurantes e bares', 'utensils', 3),
  ('praias', 'Praias', 'waves', 4),
  ('transportes', 'Transportes e barcos', 'ship', 5),
  ('guias-turisticos', 'Guias e atividades', 'compass', 6),
  ('comercio-local', 'Comércio local', 'shopping-bag', 7),
  ('saude', 'Serviços de saúde', 'heart-pulse', 8),
  ('pontos-turisticos', 'Pontos turísticos', 'landmark', 9),
  ('servicos-comunitarios', 'Serviços comunitários', 'users', 10)
on conflict (slug) do nothing;

-- Categorias de produtos
insert into public.product_categories (slug, name, icon, sort_order) values
  ('peixe-marisco', 'Peixe e marisco', 'fish', 1),
  ('produtos-agricolas', 'Produtos agrícolas', 'leaf', 2),
  ('artesanato', 'Artesanato', 'palette', 3),
  ('alimentacao', 'Alimentação', 'cooking-pot', 4),
  ('vestuario', 'Vestuário', 'shirt', 5),
  ('equipamentos', 'Equipamentos', 'wrench', 6),
  ('outros', 'Outros produtos', 'package', 7)
on conflict (slug) do nothing;

-- Conversa geral (chat da ilha)
insert into public.conversations (type, title)
select 'general', 'Chat geral da ilha'
where not exists (select 1 from public.conversations where type = 'general');

-- Grupos temáticos por omissão (o trigger cria a conversa associada)
insert into public.groups (slug, name, description, topic, icon, is_default) values
  ('transportes', 'Transportes', 'Barcos, horários, boleias e avisos sobre a travessia Maputo–Inhaca.', 'transportes', 'ship', true),
  ('comercio', 'Comércio', 'Compra, venda e troca de produtos e serviços na ilha.', 'comercio', 'shopping-bag', true),
  ('turismo', 'Turismo', 'Dicas, experiências e perguntas de visitantes e operadores.', 'turismo', 'compass', true),
  ('emprego', 'Emprego', 'Ofertas e procura de trabalho na Inhaca.', 'emprego', 'briefcase', true),
  ('cultura', 'Cultura', 'Música, tradições, festas e iniciativas culturais.', 'cultura', 'music', true),
  ('desporto', 'Desporto', 'Futebol, pesca desportiva, mergulho e outras atividades.', 'desporto', 'trophy', true),
  ('ajuda-comunitaria', 'Ajuda comunitária', 'Entreajuda entre habitantes: pedidos, doações e apoio.', 'ajuda', 'heart-handshake', true)
on conflict (slug) do nothing;

-- Definições do site
insert into public.site_settings (key, value) values
  ('site_name', '"INHACA CONNECT"'),
  ('tagline', '"A ilha conectada. Uma comunidade, um destino."'),
  ('hero_title', '"Descubra a Ilha de Inhaca"'),
  ('hero_subtitle', '"Praias, natureza, negócios locais e uma comunidade ligada. Tudo o que precisa de saber sobre a ilha, num só lugar."'),
  ('hero_image_url', '"/images/placeholders/hero-inhaca.svg"'),
  ('contact_email', '""'),
  ('contact_whatsapp', '""'),
  ('facebook_url', '""'),
  ('instagram_url', '""'),
  ('emergency_info', '"Em caso de emergência contacte o Centro de Saúde da Inhaca ou as autoridades locais. Atualize esta informação no painel administrativo."'),
  ('announcement', '""')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Guia turístico — conteúdo editorial inicial
-- Este texto é um ponto de partida geral e deve ser revisto, completado e
-- validado pela administração no painel (Admin > Guia).
-- ---------------------------------------------------------------------------
insert into public.guide_pages (slug, title, excerpt, icon, sort_order, is_published, content) values
(
  'historia',
  'História da ilha',
  'Das comunidades piscatórias à investigação marinha: um breve percurso pela história da Inhaca.',
  'scroll',
  1,
  true,
  $md$
> Conteúdo inicial de referência. Confirme datas e factos com fontes locais e atualize no painel administrativo.

A Ilha de Inhaca situa-se na entrada da Baía de Maputo, a cerca de três dezenas de quilómetros da cidade de Maputo, de que faz parte administrativamente (distrito municipal de KaNyaka). Com cerca de 12 km de comprimento e 7 km de largura, é há séculos habitada por comunidades que vivem da pesca, da agricultura de subsistência e, mais recentemente, do turismo.

## Um lugar de encontro

A posição estratégica da ilha, à entrada da baía, fez dela um ponto de referência para a navegação e um local de contacto entre as populações locais e navegadores de várias origens. O nome "Inhaca" está associado, segundo a tradição oral, a uma linhagem de chefes locais.

## Ciência e conservação

Na década de 1950 foi instalada na ilha a Estação de Biologia Marítima, hoje ligada à Universidade Eduardo Mondlane, uma das instituições de investigação marinha mais antigas da região. A riqueza dos recifes de coral, dos mangais e das dunas levou à criação de áreas de proteção que ajudam a preservar a biodiversidade que hoje atrai visitantes.

## Hoje

A Inhaca combina a vida comunitária das suas aldeias com uma oferta turística em crescimento: alojamentos, restaurantes, guias locais e operadores de atividades marítimas. Esta plataforma pretende dar visibilidade a essa comunidade e aos seus negócios.
$md$
),
(
  'cultura',
  'Cultura e tradições',
  'Língua, música, gastronomia e o quotidiano das comunidades da ilha.',
  'music',
  2,
  true,
  $md$
> Conteúdo inicial de referência. Convidamos a comunidade a enriquecer esta página através do painel administrativo.

As comunidades da Inhaca partilham a identidade do sul de Moçambique. Além do português, a língua ronga faz parte do dia a dia de muitas famílias.

## Vida comunitária

A pesca artesanal, a construção de barcos, a agricultura em pequena escala e o artesanato marcam o quotidiano. As celebrações religiosas, as festas comunitárias e os eventos desportivos reúnem habitantes de toda a ilha.

## Música e dança

A música e a dança acompanham as festas e cerimónias. Acompanhe a [agenda](/agenda) para saber quando acontecem.

## Respeito pela comunidade

Os visitantes são bem-vindos. Peça autorização antes de fotografar pessoas, respeite os espaços das aldeias e privilegie os negócios locais.
$md$
),
(
  'praias',
  'Praias e pontos turísticos',
  'Praias de areia branca, pontas rochosas, o farol e a vizinha Ilha dos Portugueses.',
  'waves',
  3,
  true,
  $md$
> Conteúdo inicial de referência. Os estabelecimentos e pontos de interesse georreferenciados estão disponíveis no [mapa interativo](/mapa).

A Inhaca oferece praias com características muito diferentes, da costa abrigada da baía às praias abertas ao oceano Índico.

## Praias

- **Praia da vila** — junto ao centro da ilha, de acesso fácil, com restaurantes e alojamentos próximos.
- **Ponta Torres** — na costa sul, conhecida pelas suas paisagens e pelas águas calmas em determinadas marés.
- **Cabo de Santa Maria** — extremo sul da ilha, com dunas e praias extensas.
- **Praia do Farol** — na zona norte, perto do farol da ilha.

## Pontos de interesse

- **Farol da Inhaca** — um dos marcos históricos da ilha, com vistas sobre a baía e o oceano.
- **Ilha dos Portugueses** — pequena ilha desabitada, de areia branca, visitada em passeios de barco a partir da Inhaca.
- **Mangais e recifes** — zonas de grande biodiversidade, ideais para observação de aves e snorkeling com guias locais.

Consulte o [diretório de serviços](/servicos) para encontrar guias e operadores de passeios.
$md$
),
(
  'natureza',
  'Natureza e biodiversidade',
  'Recifes de coral, mangais, dunas, tartarugas e aves: um ecossistema a proteger.',
  'leaf',
  4,
  true,
  $md$
> Conteúdo inicial de referência. Atualize com informação das entidades de conservação locais.

A Inhaca é conhecida pela diversidade dos seus habitats: recifes de coral, pradarias marinhas, mangais, florestas de dunas e zonas húmidas.

## O que pode observar

- Recifes de coral entre os mais meridionais do continente africano.
- Mangais que protegem a costa e servem de berçário para peixes e crustáceos.
- Aves migratórias e residentes em várias zonas da ilha.
- Tartarugas marinhas, golfinhos e, em certas épocas, baleias ao largo.

## Boas práticas

- Não pise nem recolha corais e conchas.
- Não deixe lixo nas praias; leve-o consigo.
- Respeite as áreas protegidas e as indicações dos guias.
- Prefira operadores locais que seguem práticas responsáveis.
$md$
),
(
  'gastronomia',
  'Gastronomia',
  'Peixe fresco, camarão, caranguejo, matapa e xima: os sabores da ilha.',
  'utensils',
  5,
  true,
  $md$
> Conteúdo inicial de referência. Os restaurantes registados aparecem no [diretório](/servicos?categoria=restaurantes-bares).

A cozinha da Inhaca vive do mar e da terra. O peixe grelhado, o camarão, a lula e o caranguejo são servidos com arroz, xima ou matapa, muitas vezes com coco e piripíri.

## Pratos a experimentar

- **Peixe grelhado** do dia, com molho de limão e alho.
- **Caril de caranguejo** ou camarão com leite de coco.
- **Matapa** — folhas de mandioca cozinhadas com amendoim e coco.
- **Xima** — papa de farinha de milho que acompanha a maioria dos pratos.

## Onde comprar

No [mercado local](/mercado) pode encontrar peixe e marisco fresco, produtos agrícolas e alimentação preparada por vendedores da ilha.
$md$
),
(
  'experiencias',
  'Experiências e atividades',
  'Snorkeling, mergulho, passeios de barco, caminhadas e observação de aves.',
  'compass',
  6,
  true,
  $md$
> Conteúdo inicial de referência. As atividades disponíveis dependem dos operadores locais e das condições do mar.

## No mar

- Snorkeling e mergulho nos recifes, acompanhados por guias.
- Passeios de barco à Ilha dos Portugueses.
- Pesca artesanal com pescadores locais.
- Observação de golfinhos e, na época, de baleias.

## Em terra

- Caminhadas pelas dunas, mangais e trilhos da ilha.
- Visita ao farol e aos miradouros.
- Observação de aves nas zonas húmidas.
- Visita às aldeias e ao artesanato local.

Encontre guias e operadores no [diretório de serviços](/servicos?categoria=guias-turisticos) e verifique os próximos eventos na [agenda](/agenda).
$md$
),
(
  'como-chegar',
  'Como chegar e transportes',
  'Barco a partir de Maputo, lanchas rápidas, avião e transporte dentro da ilha.',
  'ship',
  7,
  true,
  $md$
> Conteúdo inicial de referência. Horários e preços mudam com frequência: confirme com os operadores registados no [diretório](/servicos?categoria=transportes) e no grupo [Transportes](/comunidade/grupos/transportes).

## A partir de Maputo

- **Barco regular** — ligação entre Maputo e a Inhaca, com duração que varia conforme a embarcação e as condições do mar.
- **Lanchas rápidas** — operadas por empresas privadas e alojamentos, com viagens mais curtas.
- **Dhow e barcos tradicionais** — uma experiência mais lenta, dependente das marés e do vento.
- **Avião** — existem voos de pequena dimensão para a pista da ilha, mediante disponibilidade.

## Dentro da ilha

Os transportes na ilha são feitos sobretudo em veículos todo-o-terreno, motorizadas, bicicletas e a pé. Os alojamentos costumam organizar transfers a partir do cais.

## Dicas

- Reserve o transporte com antecedência em épocas altas e fins de semana prolongados.
- Leve proteção solar, água e dinheiro em numerário.
- Confirme as condições do mar antes de viajar.
$md$
),
(
  'informacoes-visitantes',
  'Informações para visitantes',
  'Saúde, segurança, dinheiro, comunicações e conselhos práticos.',
  'info',
  8,
  true,
  $md$
> Conteúdo inicial de referência. A administração deve rever e atualizar regularmente.

## Dinheiro

A moeda é o metical (MZN). Nem todos os estabelecimentos aceitam cartão; leve numerário e considere o pagamento por M-Pesa ou e-Mola quando disponível.

## Comunicações

A cobertura de rede móvel existe em grande parte da ilha, mas pode ser irregular. Esta aplicação funciona de forma básica sem ligação para conteúdos já visitados.

## Saúde e segurança

- Existe um centro de saúde na ilha; para situações graves é necessária evacuação para Maputo.
- Use proteção solar e hidrate-se.
- Tenha atenção às marés e às correntes; pergunte aos locais antes de nadar em zonas desconhecidas.
- Guarde os contactos de emergência disponíveis no rodapé desta plataforma.

## O que levar

Protetor solar, chapéu, repelente, calçado para rochas, lanterna e medicamentos pessoais.

## Respeito e sustentabilidade

Apoie os negócios locais, respeite as comunidades e não deixe lixo. A ilha é um ecossistema frágil que depende de todos.
$md$
)
on conflict (slug) do nothing;
