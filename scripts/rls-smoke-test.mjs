// Teste de integração das políticas RLS contra um Supabase real (local ou de testes).
// NUNCA correr contra produção: cria e apaga utilizadores de teste.
//
// Uso:
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=... SUPABASE_SERVICE_KEY=... node scripts/rls-smoke-test.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error("Defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_KEY.");
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(url) && process.env.ALLOW_REMOTE !== "1") {
  console.error("Por segurança este teste só corre contra localhost (defina ALLOW_REMOTE=1 para um projeto de testes).");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
let passed = 0;
let failed = 0;
const check = (name, cond, extra = "") => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} ${extra}`);
  }
};

const stamp = Date.now().toString(36);
async function makeUser(label, meta = {}) {
  const email = `${label}-${stamp}@teste.local`;
  const password = "Teste12345";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Teste ${label}`, username: `${label}_${stamp}`.slice(0, 30), ...meta },
  });
  if (error) throw error;
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, client };
}

const created = [];
try {
  console.log("Preparação");
  const alice = await makeUser("alice", { is_resident: true });
  const bob = await makeUser("bob");
  const carol = await makeUser("carol");
  const mod = await makeUser("mod");
  created.push(alice.id, bob.id, carol.id, mod.id);
  await admin.from("user_roles").insert({ user_id: mod.id, role: "moderator" });

  console.log("Perfis e papéis");
  const { data: aliceRoles } = await admin.from("user_roles").select("role").eq("user_id", alice.id);
  check("trigger cria perfil com papéis visitor + resident", aliceRoles?.map((r) => r.role).sort().join() === "resident,visitor");
  await alice.client.from("profiles").update({ is_banned: true }).eq("id", alice.id);
  const { data: aliceProfile } = await admin.from("profiles").select("is_banned").eq("id", alice.id).single();
  check("utilizador não se consegue auto-banir/desbanir", aliceProfile.is_banned === false);
  const { error: selfAdmin } = await alice.client.from("user_roles").insert({ user_id: alice.id, role: "admin" });
  check("utilizador não se promove a admin", Boolean(selfAdmin));

  console.log("Estabelecimentos");
  const { data: cat } = await admin.from("business_categories").select("id").limit(1).single();
  const { data: biz, error: bizErr } = await alice.client
    .from("businesses")
    .insert({ owner_id: alice.id, category_id: cat.id, name: "Casa Teste", slug: `casa-${stamp}`, status: "approved", is_featured: true })
    .select("id, status, is_featured")
    .single();
  check("prestador submete estabelecimento", !bizErr, bizErr?.message);
  check("estado forçado a pending e destaque removido", biz?.status === "pending" && biz?.is_featured === false);
  const { data: ownerRole } = await admin.from("user_roles").select("role").eq("user_id", alice.id).eq("role", "business_owner");
  check("papel business_owner atribuído automaticamente", ownerRole?.length === 1);
  const { data: anonSees } = await anon.from("businesses").select("id").eq("id", biz.id);
  check("visitante não vê estabelecimento pendente", anonSees?.length === 0);
  await alice.client.from("businesses").update({ status: "approved" }).eq("id", biz.id);
  const { data: still } = await admin.from("businesses").select("status").eq("id", biz.id).single();
  check("dono não consegue aprovar o próprio estabelecimento", still.status === "pending");
  await bob.client.from("businesses").update({ name: "Hack" }).eq("id", biz.id);
  const { data: name } = await admin.from("businesses").select("name").eq("id", biz.id).single();
  check("outro utilizador não edita o estabelecimento", name.name === "Casa Teste");
  await mod.client.from("businesses").update({ status: "approved" }).eq("id", biz.id);
  const { data: approved } = await anon.from("businesses").select("id, approved_at").eq("id", biz.id);
  check("moderador aprova e fica público", approved?.length === 1 && Boolean(approved[0].approved_at));
  const { data: notif } = await admin.from("notifications").select("type").eq("user_id", alice.id).eq("type", "business_status");
  check("dono recebe notificação de aprovação", (notif?.length ?? 0) >= 1);

  console.log("Avaliações");
  const { error: selfReview } = await alice.client.from("reviews").insert({ business_id: biz.id, author_id: alice.id, rating: 5 });
  check("dono não avalia o próprio negócio", Boolean(selfReview));
  await bob.client.from("reviews").insert({ business_id: biz.id, author_id: bob.id, rating: 4 });
  const { data: rated } = await admin.from("businesses").select("rating_avg, rating_count").eq("id", biz.id).single();
  check("média de avaliações recalculada", Number(rated.rating_avg) === 4 && rated.rating_count === 1);

  console.log("Feed");
  const { data: post } = await bob.client.from("posts").insert({ author_id: bob.id, content: "Olá ilha", is_pinned: true }).select("id, is_pinned").single();
  check("publicação criada sem fixação forçada", post && post.is_pinned === false);
  await carol.client.from("post_reactions").insert({ post_id: post.id, user_id: carol.id });
  await carol.client.from("comments").insert({ post_id: post.id, author_id: carol.id, content: "Bom dia!" });
  const { data: counters } = await admin.from("posts").select("likes_count, comments_count").eq("id", post.id).single();
  check("contadores de gostos e comentários", counters.likes_count === 1 && counters.comments_count === 1);
  const { error: fakeLike } = await carol.client.from("post_reactions").insert({ post_id: post.id, user_id: bob.id });
  check("não é possível gostar em nome de outro", Boolean(fakeLike));
  await carol.client.from("posts").update({ content: "editado" }).eq("id", post.id);
  const { data: content } = await admin.from("posts").select("content").eq("id", post.id).single();
  check("só o autor edita a publicação", content.content === "Olá ilha");
  await mod.client.from("posts").update({ is_hidden: true }).eq("id", post.id);
  const { data: hidden } = await anon.from("posts").select("id").eq("id", post.id);
  check("publicação ocultada pela moderação deixa de ser pública", hidden?.length === 0);

  console.log("Mensagens privadas");
  const { data: convId, error: convErr } = await alice.client.rpc("get_or_create_direct_conversation", { _other_user_id: bob.id });
  check("conversa privada criada", !convErr && Boolean(convId), convErr?.message);
  const { error: sendErr } = await alice.client.from("messages").insert({ conversation_id: convId, sender_id: alice.id, content: "Segredo" });
  check("participante envia mensagem", !sendErr, sendErr?.message);
  const { data: bobReads } = await bob.client.from("messages").select("content").eq("conversation_id", convId);
  check("outro participante lê", bobReads?.length === 1);
  const { data: carolReads } = await carol.client.from("messages").select("content").eq("conversation_id", convId);
  check("não participante NÃO lê mensagens privadas", carolReads?.length === 0);
  const { error: carolSend } = await carol.client.from("messages").insert({ conversation_id: convId, sender_id: carol.id, content: "intrusa" });
  check("não participante NÃO envia", Boolean(carolSend));
  const { error: spoof } = await bob.client.from("messages").insert({ conversation_id: convId, sender_id: alice.id, content: "falso" });
  check("não é possível enviar em nome de outro", Boolean(spoof));
  const { data: unread } = await bob.client.rpc("my_unread_messages_count");
  check("contagem de não lidas", Number(unread) >= 1);
  const { data: msgNotif } = await admin.from("notifications").select("id").eq("user_id", bob.id).eq("type", "message");
  check("notificação de nova mensagem", (msgNotif?.length ?? 0) >= 1);

  console.log("Bloqueios");
  await bob.client.from("user_blocks").insert({ blocker_id: bob.id, blocked_id: alice.id });
  const { error: blockedSend } = await alice.client.from("messages").insert({ conversation_id: convId, sender_id: alice.id, content: "olá?" });
  check("utilizador bloqueado não envia mensagem privada", Boolean(blockedSend));

  console.log("Grupos e chat geral");
  const { data: group } = await admin.from("groups").select("id, conversation_id").eq("slug", "transportes").single();
  const { data: before } = await carol.client.from("messages").select("id").eq("conversation_id", group.conversation_id);
  const { error: notMember } = await carol.client.from("messages").insert({ conversation_id: group.conversation_id, sender_id: carol.id, content: "x" });
  check("não membro não escreve no grupo", Boolean(notMember) && before?.length === 0);
  await carol.client.from("group_members").insert({ group_id: group.id, user_id: carol.id });
  const { error: member } = await carol.client.from("messages").insert({ conversation_id: group.conversation_id, sender_id: carol.id, content: "Olá grupo" });
  check("membro escreve no grupo depois de aderir", !member, member?.message);
  const { data: general } = await carol.client.rpc("general_conversation_id");
  const { error: gen } = await carol.client.from("messages").insert({ conversation_id: general, sender_id: carol.id, content: "Olá ilha" });
  check("qualquer utilizador ativo escreve no chat geral", !gen, gen?.message);
  const { data: anonGeneral } = await anon.from("messages").select("id").eq("conversation_id", general);
  check("visitante sem sessão não lê o chat", anonGeneral?.length === 0);

  console.log("Eventos e produtos");
  const { data: ev } = await carol.client
    .from("events")
    .insert({ organizer_id: carol.id, title: "Festa teste", slug: `festa-${stamp}`, starts_at: new Date(Date.now() + 864e5).toISOString(), status: "approved" })
    .select("status")
    .single();
  check("evento submetido fica pendente", ev?.status === "pending");
  const { data: prod } = await carol.client
    .from("products")
    .insert({ seller_id: carol.id, category_id: (await admin.from("product_categories").select("id").limit(1).single()).data.id, title: "Peixe", price: 300, is_featured: true })
    .select("id, is_featured, status")
    .single();
  check("produto publicado ativo sem destaque forçado", prod?.status === "active" && prod?.is_featured === false);
  await mod.client.from("products").update({ status: "suspended" }).eq("id", prod.id);
  await carol.client.from("products").update({ status: "active" }).eq("id", prod.id);
  const { data: susp } = await admin.from("products").select("status").eq("id", prod.id).single();
  check("vendedor não levanta suspensão", susp.status === "suspended");

  console.log("Denúncias, administração e rate limit");
  const { error: rep } = await carol.client.from("reports").insert({ reporter_id: carol.id, target_type: "post", target_id: post.id, reason: "spam" });
  check("utilizador denuncia", !rep, rep?.message);
  const { data: carolReports } = await bob.client.from("reports").select("id");
  check("denúncias de outros não são visíveis", carolReports?.length === 0);
  const { error: statsErr } = await bob.client.rpc("admin_stats");
  check("estatísticas admin negadas a utilizadores comuns", Boolean(statsErr));
  const { data: stats, error: modStats } = await mod.client.rpc("admin_stats");
  check("estatísticas disponíveis para moderador", !modStats && typeof stats?.users_total === "number");
  const { error: audit } = await bob.client.from("audit_logs").insert({ actor_id: bob.id, action: "fake" });
  check("utilizador comum não escreve na auditoria", Boolean(audit));
  let allowed = 0;
  for (let i = 0; i < 4; i++) {
    const { data } = await bob.client.rpc("check_rate_limit", { _key: `t:${stamp}`, _max: 2, _window_seconds: 60 });
    if (data) allowed++;
  }
  check("rate limiting bloqueia após o limite", allowed === 2);

  console.log("Conta suspensa");
  await admin.from("profiles").update({ is_banned: true }).eq("id", carol.id);
  const { error: bannedPost } = await carol.client.from("posts").insert({ author_id: carol.id, content: "ainda aqui" });
  check("conta suspensa não publica", Boolean(bannedPost));

  console.log("Pesquisa e proximidade");
  const { data: found } = await anon.rpc("global_search", { q: "Casa Teste", lim: 5 });
  check("pesquisa global encontra estabelecimento aprovado", found?.some((r) => r.kind === "business"));
  await admin.from("businesses").update({ latitude: -26.0, longitude: 32.92 }).eq("id", biz.id);
  const { data: near } = await anon.rpc("businesses_nearby", { _lat: -26.001, _lng: 32.921, _radius_m: 1000 });
  check("PostGIS: estabelecimento próximo encontrado", near?.some((r) => r.business_id === biz.id));
} catch (err) {
  failed++;
  console.error("Erro inesperado:", err);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => undefined);
  console.log(`\n${passed} passaram · ${failed} falharam`);
  process.exit(failed ? 1 : 0);
}
