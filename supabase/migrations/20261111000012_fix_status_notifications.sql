-- ============================================================================
-- INHACA CONNECT · Migration 0012 — Correção: notificações de mudança de estado
-- A versão anterior lia new.rejection_reason também para produtos (coluna
-- inexistente), o que fazia falhar a suspensão de produtos pela moderação.
-- ============================================================================

create or replace function public.notify_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  label text;
  link text;
  ntype public.notification_type;
  reason text;
  status_text text;
  new_row jsonb := to_jsonb(new);
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if tg_table_name = 'businesses' then
    owner := (new_row->>'owner_id')::uuid;
    label := 'O estabelecimento "' || (new_row->>'name') || '"';
    link := '/dashboard/negocios/' || new.id;
    ntype := 'business_status';
  elsif tg_table_name = 'events' then
    owner := (new_row->>'organizer_id')::uuid;
    label := 'O evento "' || (new_row->>'title') || '"';
    link := '/dashboard/eventos/' || new.id;
    ntype := 'event_status';
  elsif tg_table_name = 'products' then
    owner := (new_row->>'seller_id')::uuid;
    label := 'O produto "' || (new_row->>'title') || '"';
    link := '/dashboard/produtos/' || new.id;
    ntype := 'product_status';
  else
    return new;
  end if;

  -- Só estabelecimentos e eventos têm motivo de rejeição.
  reason := new_row->>'rejection_reason';

  status_text := case new.status::text
    when 'approved' then 'foi aprovado e já está visível.'
    when 'rejected' then 'não foi aprovado.' || coalesce(' Motivo: ' || reason, '')
    when 'suspended' then 'foi suspenso pela moderação.'
    when 'pending' then 'aguarda nova aprovação.'
    when 'active' then 'está novamente disponível.'
    else null end;

  -- Mudanças feitas pelo próprio vendedor (esgotado/arquivado) não geram notificação.
  if status_text is null or owner = auth.uid() then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (owner, ntype, label || ' ' || status_text, null, link, auth.uid());
  return new;
end;
$$;
