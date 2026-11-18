-- ============================================================================
-- INHACA CONNECT · Migration 0009 — Pesquisa global, estatísticas, proximidade
-- e Realtime
-- ============================================================================

-- Pesquisa global (respeita RLS do utilizador que chama).
create or replace function public.global_search(q text, lim int default 8)
returns table (
  kind text,
  item_id uuid,
  title text,
  subtitle text,
  image_url text,
  href text
)
language sql
stable
as $$
  with term as (
    select '%' || regexp_replace(coalesce(trim(q), ''), '[%_\\]', '', 'g') || '%' as pat
  )
  (
    select 'business'::text, b.id, b.name, coalesce(c.name, ''), coalesce(b.logo_url, b.cover_url), '/servicos/' || b.slug
      from public.businesses b
      left join public.business_categories c on c.id = b.category_id, term
     where b.status = 'approved'
       and (b.name ilike term.pat or coalesce(b.short_description, '') ilike term.pat or coalesce(b.address, '') ilike term.pat)
     order by b.is_featured desc, b.rating_avg desc
     limit lim
  )
  union all
  (
    select 'event'::text, e.id, e.title, to_char(e.starts_at, 'DD/MM/YYYY HH24:MI'), e.cover_url, '/agenda/' || e.slug
      from public.events e, term
     where e.status = 'approved'
       and (e.title ilike term.pat or coalesce(e.description, '') ilike term.pat or coalesce(e.location_name, '') ilike term.pat)
     order by e.starts_at desc
     limit lim
  )
  union all
  (
    select 'product'::text, p.id, p.title,
           case when p.price is null then 'Sob consulta' else p.price::text || ' ' || p.currency end,
           p.images[1], '/mercado/' || p.id
      from public.products p, term
     where p.status in ('active', 'sold_out')
       and (p.title ilike term.pat or coalesce(p.description, '') ilike term.pat)
     order by p.created_at desc
     limit lim
  )
  union all
  (
    select 'post'::text, p.id, left(p.content, 90), pr.full_name, null::text, '/feed/' || p.id
      from public.posts p
      join public.profiles pr on pr.id = p.author_id, term
     where not p.is_hidden and p.content ilike term.pat
     order by p.created_at desc
     limit lim
  )
  union all
  (
    select 'guide'::text, g.id, g.title, g.excerpt, g.cover_url, '/descobrir/' || g.slug
      from public.guide_pages g, term
     where g.is_published and (g.title ilike term.pat or g.content ilike term.pat)
     order by g.sort_order
     limit lim
  )
  union all
  (
    select 'profile'::text, pr.id, pr.full_name, '@' || pr.username, pr.avatar_url, '/perfil/' || pr.username
      from public.profiles pr, term
     where not pr.is_banned and (pr.full_name ilike term.pat or pr.username ilike term.pat)
     order by pr.created_at desc
     limit lim
  );
$$;

-- Estabelecimentos próximos de um ponto (metros).
create or replace function public.businesses_nearby(_lat double precision, _lng double precision, _radius_m int default 3000, _lim int default 20)
returns table (business_id uuid, distance_m double precision)
language sql
stable
set search_path = public, extensions
as $$
  select b.id,
         extensions.ST_Distance(b.location, extensions.ST_SetSRID(extensions.ST_MakePoint(_lng, _lat), 4326)::extensions.geography) as distance_m
    from public.businesses b
   where b.status = 'approved'
     and b.location is not null
     and extensions.ST_DWithin(b.location, extensions.ST_SetSRID(extensions.ST_MakePoint(_lng, _lat), 4326)::extensions.geography, _radius_m)
   order by distance_m
   limit _lim;
$$;

-- Indicadores do painel administrativo.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Sem permissões' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_last_30d', (select count(*) from public.profiles where created_at >= now() - interval '30 days'),
    'businesses_total', (select count(*) from public.businesses),
    'businesses_pending', (select count(*) from public.businesses where status = 'pending'),
    'businesses_approved', (select count(*) from public.businesses where status = 'approved'),
    'posts_total', (select count(*) from public.posts where not is_hidden),
    'posts_last_7d', (select count(*) from public.posts where created_at >= now() - interval '7 days'),
    'events_total', (select count(*) from public.events),
    'events_pending', (select count(*) from public.events where status = 'pending'),
    'events_upcoming', (select count(*) from public.events where status = 'approved' and starts_at >= now()),
    'products_total', (select count(*) from public.products),
    'products_active', (select count(*) from public.products where status = 'active'),
    'reports_open', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'messages_last_7d', (select count(*) from public.messages where created_at >= now() - interval '7 days'),
    'help_requests_open', (select count(*) from public.help_requests where status = 'open')
  );
end;
$$;

-- Contagem de notificações não lidas.
create or replace function public.my_unread_notifications_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.notifications where user_id = auth.uid() and not is_read;
$$;

-- Permissões de execução
grant execute on function public.global_search(text, int) to anon, authenticated;
grant execute on function public.businesses_nearby(double precision, double precision, int, int) to anon, authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.my_unread_notifications_count() to authenticated;
grant execute on function public.my_unread_messages_count() to authenticated;
grant execute on function public.my_conversations() to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.can_access_conversation(uuid) to authenticated;
grant execute on function public.general_conversation_id() to anon, authenticated;
grant execute on function public.increment_business_views(uuid) to anon, authenticated;
grant execute on function public.increment_product_views(uuid) to anon, authenticated;
grant execute on function public.increment_post_shares(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (mensagens e notificações)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

alter table public.messages replica identity full;
