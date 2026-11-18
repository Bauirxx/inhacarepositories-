-- ============================================================================
-- INHACA CONNECT · Migration 0011 — Reforço de integridade
-- ============================================================================

-- Mensagens: o remetente só pode editar o conteúdo/apagar; nunca mover a
-- mensagem para outra conversa nem mudar o remetente. Mensagens apagadas
-- não podem ser "ressuscitadas".
create or replace function public.protect_message_fields()
returns trigger
language plpgsql
as $$
begin
  new.conversation_id := old.conversation_id;
  new.sender_id := old.sender_id;
  new.created_at := old.created_at;
  if old.is_deleted then
    new.is_deleted := true;
    new.content := '';
    new.image_url := null;
  end if;
  return new;
end;
$$;

create trigger messages_protect_fields
  before update on public.messages
  for each row execute function public.protect_message_fields();

-- Pedidos de ajuda: o autor não pode ser alterado.
create or replace function public.protect_help_request_fields()
returns trigger
language plpgsql
as $$
begin
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger help_requests_protect_fields
  before update on public.help_requests
  for each row execute function public.protect_help_request_fields();

-- Avaliações: o autor e o estabelecimento não podem ser alterados.
create or replace function public.protect_review_fields()
returns trigger
language plpgsql
as $$
begin
  new.author_id := old.author_id;
  new.business_id := old.business_id;
  return new;
end;
$$;

create trigger reviews_protect_fields
  before update on public.reviews
  for each row execute function public.protect_review_fields();

-- Publicações só podem associar estabelecimentos aprovados ou próprios.
create or replace function public.check_post_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.business_id is not null and not exists (
    select 1 from public.businesses b
     where b.id = new.business_id and (b.status = 'approved' or b.owner_id = new.author_id)
  ) then
    new.business_id := null;
  end if;
  return new;
end;
$$;

create trigger posts_check_business
  before insert or update of business_id on public.posts
  for each row execute function public.check_post_business();
