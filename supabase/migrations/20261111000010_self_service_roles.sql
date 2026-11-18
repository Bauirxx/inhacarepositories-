-- ============================================================================
-- INHACA CONNECT · Migration 0010 — Papéis de autosserviço
-- Os utilizadores podem declarar-se habitantes (papel "resident").
-- Os papéis business_owner, seller e event_organizer são atribuídos
-- automaticamente quando submetem conteúdo. Moderator e admin apenas por admins.
-- ============================================================================

create or replace function public.set_my_resident_role(_is_resident boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária' using errcode = '42501';
  end if;
  if _is_resident then
    insert into public.user_roles (user_id, role) values (auth.uid(), 'resident') on conflict do nothing;
  else
    delete from public.user_roles where user_id = auth.uid() and role = 'resident';
  end if;
end;
$$;

grant execute on function public.set_my_resident_role(boolean) to authenticated;

-- Promove o primeiro administrador (executar manualmente no SQL Editor):
--   insert into public.user_roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'EMAIL_DO_ADMIN'
--   on conflict do nothing;
