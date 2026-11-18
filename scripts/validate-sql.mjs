// Valida as migrations e o seed num PostgreSQL real (PGlite/WASM), sem Docker.
// Os esquemas próprios do Supabase (auth, storage) e o PostGIS são substituídos por
// stubs mínimos; o objetivo é detetar erros de SQL e verificar as políticas RLS.
//
// Uso: node scripts/validate-sql.mjs
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const db = new PGlite({ extensions: { pg_trgm } });

const STUBS = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema extensions; create schema auth; create schema storage;
grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;
create extension pg_trgm with schema extensions;

create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;

create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant all on storage.objects to authenticated;

-- PostGIS (stubs)
create domain extensions.geography as text;
create function extensions.ST_MakePoint(x float8, y float8) returns text language sql immutable as $$ select x::text || ' ' || y::text $$;
create function extensions.ST_SetSRID(g text, srid int) returns text language sql immutable as $$ select g $$;
create function extensions.ST_Distance(a text, b text) returns float8 language sql immutable as $$
  select sqrt(power(split_part(a,' ',1)::float8 - split_part(b,' ',1)::float8, 2) + power(split_part(a,' ',2)::float8 - split_part(b,' ',2)::float8, 2)) * 111000 $$;
create function extensions.ST_DWithin(a text, b text, d float8) returns boolean language sql immutable as $$ select extensions.ST_Distance(a, b) <= d $$;
grant execute on all functions in schema extensions to anon, authenticated;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

function adapt(sql) {
  return sql
    .replace(/create extension if not exists "pgcrypto"[^;]*;/i, "")
    .replace(/create extension if not exists "uuid-ossp"[^;]*;/i, "")
    .replace(/create extension if not exists pg_trgm[^;]*;/i, "")
    .replace(/create extension if not exists postgis[^;]*;/i, "")
    .replace(/extensions\.geography\(point, 4326\)/g, "extensions.geography")
    .replace(/using gist \(location\)/g, "(location)");
}

let passed = 0;
let failed = 0;
const check = (name, ok, extra = "") => {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${ok ? "" : " " + extra}`);
};

async function as(userId, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false); set role ${userId ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
async function tryq(sql, params) {
  try {
    const r = await db.query(sql, params);
    return { rows: r.rows, error: null };
  } catch (e) {
    return { rows: [], error: e };
  }
}
const one = async (sql, params) => (await db.query(sql, params)).rows[0];

console.log("Migrations");
await db.exec(STUBS);
const dir = path.join(root, "supabase", "migrations");
for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
  try {
    await db.exec(adapt(await readFile(path.join(dir, file), "utf8")));
    check(file, true);
  } catch (e) {
    check(file, false, `→ ${e.message}`);
    console.log(`\n${passed} passaram · ${failed} falharam`);
    process.exit(1);
  }
}
try {
  await db.exec(await readFile(path.join(root, "supabase", "seed.sql"), "utf8"));
  check("seed.sql", true);
} catch (e) {
  check("seed.sql", false, `→ ${e.message}`);
}
// Executar o seed duas vezes deve ser idempotente.
try {
  await db.exec(await readFile(path.join(root, "supabase", "seed.sql"), "utf8"));
  check("seed.sql idempotente", true);
} catch (e) {
  check("seed.sql idempotente", false, `→ ${e.message}`);
}
const counts = await one(
  `select (select count(*) from business_categories)::int c, (select count(*) from groups)::int g, (select count(*) from guide_pages)::int p, (select count(*) from conversations where type='general')::int gen`,
);
check("seed: categorias, grupos, guia e chat geral", counts.c === 10 && counts.g === 7 && counts.p === 8 && counts.gen === 1, JSON.stringify(counts));

console.log("Utilizadores e papéis");
const mk = async (name, resident = false) =>
  (
    await one(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [
      `${name}@t.local`,
      { full_name: `Teste ${name}`, username: name, is_resident: resident },
    ])
  ).id;
const alice = await mk("alice", true);
const bob = await mk("bob");
const carol = await mk("carol");
const mod = await mk("modx");
await db.query(`insert into user_roles (user_id, role) values ($1, 'moderator')`, [mod]);
const roles = (await db.query(`select role from user_roles where user_id = $1 order by role`, [alice])).rows.map((r) => r.role);
check("trigger cria perfil e papéis (visitor + resident)", roles.join() === "visitor,resident" || roles.sort().join() === "resident,visitor", roles.join());
const dup = await mk("alice2");
check("nome de utilizador gerado", Boolean((await one(`select username from profiles where id=$1`, [dup])).username));

await as(alice, () => tryq(`update profiles set is_banned = true, bio = 'olá' where id = $1`, [alice]));
const ap = await one(`select is_banned, bio from profiles where id=$1`, [alice]);
check("utilizador edita o perfil mas não se auto-suspende", ap.is_banned === false && ap.bio === "olá");
const selfAdmin = await as(alice, () => tryq(`insert into user_roles (user_id, role) values ($1, 'admin')`, [alice]));
check("utilizador não se promove a admin", Boolean(selfAdmin.error));

console.log("Estabelecimentos");
const cat = (await one(`select id from business_categories limit 1`)).id;
const ins = await as(alice, () =>
  tryq(
    `insert into businesses (owner_id, category_id, name, slug, status, is_featured, latitude, longitude) values ($1,$2,'Casa Teste','casa-teste','approved',true,-26,32.92) returning id, status, is_featured, location`,
    [alice, cat],
  ),
);
check("prestador submete estabelecimento", !ins.error, ins.error?.message);
const biz = ins.rows[0];
check("estado forçado a pending, sem destaque", biz?.status === "pending" && biz?.is_featured === false);
check("coluna geográfica sincronizada", Boolean(biz?.location));
check("papel business_owner atribuído", Boolean(await one(`select 1 from user_roles where user_id=$1 and role='business_owner'`, [alice])));
const anonSee = await as(null, () => tryq(`select id from businesses where id=$1`, [biz.id]));
check("visitante não vê pendente", anonSee.rows.length === 0, anonSee.error?.message);
await as(alice, () => tryq(`update businesses set status='approved', views_count=999 where id=$1`, [biz.id]));
let b = await one(`select status, views_count from businesses where id=$1`, [biz.id]);
check("dono não aprova nem altera contadores", b.status === "pending" && b.views_count === 0);
await as(bob, () => tryq(`update businesses set name='Hack' where id=$1`, [biz.id]));
check("terceiro não edita", (await one(`select name from businesses where id=$1`, [biz.id])).name === "Casa Teste");
await as(mod, () => tryq(`update businesses set status='approved' where id=$1`, [biz.id]));
b = await one(`select status, approved_at from businesses where id=$1`, [biz.id]);
check("moderador aprova (approved_at definido)", b.status === "approved" && Boolean(b.approved_at));
const anonSee2 = await as(null, () => tryq(`select id from businesses where id=$1`, [biz.id]));
check("aprovado fica público", anonSee2.rows.length === 1);
check("notificação de aprovação ao dono", Boolean(await one(`select 1 from notifications where user_id=$1 and type='business_status'`, [alice])));
await as(alice, () => tryq(`select increment_business_views($1)`, [biz.id]));
check("contador de visualizações", (await one(`select views_count from businesses where id=$1`, [biz.id])).views_count === 1);

console.log("Avaliações");
const selfRev = await as(alice, () => tryq(`insert into reviews (business_id, author_id, rating) values ($1,$2,5)`, [biz.id, alice]));
check("dono não se avalia", Boolean(selfRev.error));
const rev = await as(bob, () => tryq(`insert into reviews (business_id, author_id, rating) values ($1,$2,4)`, [biz.id, bob]));
check("utilizador avalia", !rev.error, rev.error?.message);
b = await one(`select rating_avg, rating_count from businesses where id=$1`, [biz.id]);
check("média recalculada", Number(b.rating_avg) === 4 && b.rating_count === 1, JSON.stringify(b));

console.log("Feed");
const p = await as(bob, () => tryq(`insert into posts (author_id, content, is_pinned) values ($1,'Olá ilha',true) returning id, is_pinned`, [bob]));
check("publicação criada sem fixação", !p.error && p.rows[0].is_pinned === false, p.error?.message);
const post = p.rows[0].id;
await as(carol, () => tryq(`insert into post_reactions (post_id, user_id) values ($1,$2)`, [post, carol]));
await as(carol, () => tryq(`insert into comments (post_id, author_id, content) values ($1,$2,'Bom dia')`, [post, carol]));
let c = await one(`select likes_count, comments_count from posts where id=$1`, [post]);
check("contadores de gostos e comentários", c.likes_count === 1 && c.comments_count === 1, JSON.stringify(c));
check("autor notificado do comentário", Boolean(await one(`select 1 from notifications where user_id=$1 and type='comment'`, [bob])));
const fake = await as(carol, () => tryq(`insert into post_reactions (post_id, user_id) values ($1,$2)`, [post, bob]));
check("não gosta em nome de outro", Boolean(fake.error));
await as(carol, () => tryq(`update posts set content='x' where id=$1`, [post]));
check("só o autor edita", (await one(`select content from posts where id=$1`, [post])).content === "Olá ilha");
await as(mod, () => tryq(`update posts set is_hidden=true where id=$1`, [post]));
check("ocultada deixa de ser pública", (await as(null, () => tryq(`select id from posts where id=$1`, [post]))).rows.length === 0);
check("autor ainda vê a sua publicação oculta", (await as(bob, () => tryq(`select id from posts where id=$1`, [post]))).rows.length === 1);

console.log("Mensagens privadas");
const conv = await as(alice, () => tryq(`select get_or_create_direct_conversation($1) id`, [bob]));
check("conversa privada criada", !conv.error, conv.error?.message);
const convId = conv.rows[0]?.id;
const again = await as(bob, () => tryq(`select get_or_create_direct_conversation($1) id`, [alice]));
check("conversa reutilizada", again.rows[0]?.id === convId);
const send = await as(alice, () => tryq(`insert into messages (conversation_id, sender_id, content) values ($1,$2,'Segredo')`, [convId, alice]));
check("participante envia", !send.error, send.error?.message);
check("destinatário lê", (await as(bob, () => tryq(`select id from messages where conversation_id=$1`, [convId]))).rows.length === 1);
check("não participante não lê", (await as(carol, () => tryq(`select id from messages where conversation_id=$1`, [convId]))).rows.length === 0);
check("não participante não envia", Boolean((await as(carol, () => tryq(`insert into messages (conversation_id, sender_id, content) values ($1,$2,'x')`, [convId, carol]))).error));
check("não envia em nome de outro", Boolean((await as(bob, () => tryq(`insert into messages (conversation_id, sender_id, content) values ($1,$2,'x')`, [convId, alice]))).error));
const unread = await as(bob, () => tryq(`select my_unread_messages_count() n`));
check("não lidas = 1", Number(unread.rows[0]?.n) === 1, unread.error?.message ?? JSON.stringify(unread.rows));
await as(bob, () => tryq(`select mark_conversation_read($1)`, [convId]));
check("marcar como lida", Number((await as(bob, () => tryq(`select my_unread_messages_count() n`))).rows[0].n) === 0);
const list = await as(bob, () => tryq(`select * from my_conversations()`));
check("lista de conversas com outro utilizador", !list.error && list.rows.some((r) => r.id === convId && r.other_user?.id === alice), list.error?.message);
check("notificação de mensagem", Boolean(await one(`select 1 from notifications where user_id=$1 and type='message'`, [bob])));
const msgId = (await one(`select id from messages where conversation_id=$1`, [convId])).id;
await as(alice, () => tryq(`update messages set is_deleted=true, content='', image_url=null where id=$1`, [msgId]));
await as(alice, () => tryq(`update messages set is_deleted=false, content='voltei' where id=$1`, [msgId]));
const m = await one(`select is_deleted, content from messages where id=$1`, [msgId]);
check("mensagem apagada não é ressuscitada", m.is_deleted === true && m.content === "");

console.log("Bloqueios");
await as(bob, () => tryq(`insert into user_blocks (blocker_id, blocked_id) values ($1,$2)`, [bob, alice]));
check("bloqueado não envia", Boolean((await as(alice, () => tryq(`insert into messages (conversation_id, sender_id, content) values ($1,$2,'olá?')`, [convId, alice]))).error));
check("bloqueado não inicia conversa", Boolean((await as(alice, () => tryq(`select get_or_create_direct_conversation($1)`, [bob]))).error));

console.log("Grupos e chat geral");
const g = await one(`select id, conversation_id from groups where slug='transportes'`);
check("grupo tem conversa associada", Boolean(g.conversation_id));
check("não membro não escreve", Boolean((await as(carol, () => tryq(`insert into messages (conversation_id, sender_id, content) values ($1,$2,'x')`, [g.conversation_id, carol]))).error));
await as(carol, () => tryq(`insert into group_members (group_id, user_id) values ($1,$2)`, [g.id, carol]));
const gm = await as(carol, () => tryq(`insert into messages (conversation_id, sender_id, content) values ($1,$2,'Olá grupo')`, [g.conversation_id, carol]));
check("membro escreve após aderir", !gm.error, gm.error?.message);
check("contador de membros", (await one(`select members_count from groups where id=$1`, [g.id])).members_count === 1);
const gen = (await one(`select general_conversation_id() id`)).id;
check("utilizador ativo escreve no chat geral", !(await as(bob, () => tryq(`insert into messages (conversation_id, sender_id, content) values ($1,$2,'Olá')`, [gen, bob]))).error);
check("visitante não lê o chat geral", (await as(null, () => tryq(`select id from messages where conversation_id=$1`, [gen]))).rows.length === 0);

console.log("Storage");
check("upload na própria pasta", !(await as(bob, () => tryq(`insert into storage.objects (bucket_id, name) values ('post-media', $1)`, [`${bob}/a.webp`]))).error);
check("upload na pasta de outro bloqueado", Boolean((await as(bob, () => tryq(`insert into storage.objects (bucket_id, name) values ('post-media', $1)`, [`${alice}/a.webp`]))).error));
check("chat-media só para participantes", Boolean((await as(carol, () => tryq(`insert into storage.objects (bucket_id, name) values ('chat-media', $1)`, [`${convId}/x.webp`]))).error));
check("chat-media aceite para participante", !(await as(bob, () => tryq(`insert into storage.objects (bucket_id, name) values ('chat-media', $1)`, [`${convId}/x.webp`]))).error);

console.log("Eventos e produtos");
const ev = await as(carol, () =>
  tryq(`insert into events (organizer_id, title, slug, starts_at, status) values ($1,'Festa','festa-1', now() + interval '1 day','approved') returning id, status`, [carol]),
);
check("evento fica pendente", ev.rows[0]?.status === "pending", ev.error?.message);
check("papel event_organizer atribuído", Boolean(await one(`select 1 from user_roles where user_id=$1 and role='event_organizer'`, [carol])));
await as(mod, () => tryq(`update events set status='approved' where id=$1`, [ev.rows[0].id]));
await as(bob, () => tryq(`insert into event_attendees (event_id, user_id, status) values ($1,$2,'going')`, [ev.rows[0].id, bob]));
check("contagem de presenças", (await one(`select attendees_count from events where id=$1`, [ev.rows[0].id])).attendees_count === 1);
const pc = (await one(`select id from product_categories limit 1`)).id;
const pr = await as(carol, () => tryq(`insert into products (seller_id, category_id, title, price, is_featured) values ($1,$2,'Peixe',300,true) returning id, status, is_featured`, [carol, pc]));
check("produto ativo sem destaque forçado", pr.rows[0]?.status === "active" && pr.rows[0]?.is_featured === false, pr.error?.message);
const susp = await as(mod, () => tryq(`update products set status='suspended' where id=$1 returning status`, [pr.rows[0].id]));
check("moderador suspende produto", susp.rows[0]?.status === "suspended", susp.error?.message ?? JSON.stringify(susp.rows));
await as(carol, () => tryq(`update products set status='active' where id=$1`, [pr.rows[0].id]));
check("vendedor não levanta suspensão", (await one(`select status from products where id=$1`, [pr.rows[0].id])).status === "suspended");
check("produto suspenso não é público", (await as(null, () => tryq(`select id from products where id=$1`, [pr.rows[0].id]))).rows.length === 0);

console.log("Denúncias, administração, rate limit");
check("utilizador denuncia", !(await as(carol, () => tryq(`insert into reports (reporter_id, target_type, target_id, reason) values ($1,'post',$2,'spam')`, [carol, post]))).error);
check("denúncia duplicada aberta bloqueada", Boolean((await as(carol, () => tryq(`insert into reports (reporter_id, target_type, target_id, reason) values ($1,'post',$2,'spam')`, [carol, post]))).error));
check("denúncias de outros invisíveis", (await as(bob, () => tryq(`select id from reports`))).rows.length === 0);
check("staff vê denúncias", (await as(mod, () => tryq(`select id from reports`))).rows.length === 1);
check("admin_stats negado a utilizador comum", Boolean((await as(bob, () => tryq(`select admin_stats()`))).error));
const st = await as(mod, () => tryq(`select admin_stats() s`));
check("admin_stats para moderador", !st.error && st.rows[0].s.users_total >= 4, st.error?.message);
check("auditoria: utilizador comum não escreve", Boolean((await as(bob, () => tryq(`insert into audit_logs (actor_id, action) values ($1,'x')`, [bob]))).error));
check("auditoria: staff escreve", !(await as(mod, () => tryq(`insert into audit_logs (actor_id, action) values ($1,'test')`, [mod]))).error);
check("auditoria: moderador não lê (só admin)", (await as(mod, () => tryq(`select id from audit_logs`))).rows.length === 0);
let allowed = 0;
for (let i = 0; i < 4; i++) {
  const r = await as(bob, () => tryq(`select check_rate_limit('t', 2, 60) ok`));
  if (r.rows[0]?.ok) allowed++;
}
check("rate limit bloqueia após o limite", allowed === 2, `allowed=${allowed}`);
await as(mod, () => tryq(`update site_settings set value='"hack"' where key='site_name'`));
check("moderador não altera configurações", (await one(`select value from site_settings where key='site_name'`)).value === "INHACA CONNECT");

console.log("Conta suspensa");
await db.query(`update profiles set is_banned=true where id=$1`, [carol]);
check("suspensa não publica", Boolean((await as(carol, () => tryq(`insert into posts (author_id, content) values ($1,'x')`, [carol]))).error));
check("suspensa não envia mensagens", Boolean((await as(carol, () => tryq(`insert into messages (conversation_id, sender_id, content) values ($1,$2,'x')`, [gen, carol]))).error));

console.log("Pesquisa e proximidade");
const s = await as(null, () => tryq(`select * from global_search('Casa', 5)`));
check("pesquisa global (anónimo)", !s.error && s.rows.some((r) => r.kind === "business"), s.error?.message);
const s2 = await as(null, () => tryq(`select * from global_search('praias', 5)`));
check("pesquisa encontra páginas do guia", s2.rows.some((r) => r.kind === "guide"), s2.error?.message);
const near = await as(null, () => tryq(`select * from businesses_nearby(-26.001, 32.921, 1000, 10)`));
check("proximidade (PostGIS stub)", !near.error && near.rows.some((r) => r.business_id === biz.id), near.error?.message);

console.log(`\n${passed} passaram · ${failed} falharam`);
process.exit(failed ? 1 : 0);
