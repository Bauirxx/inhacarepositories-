-- ============================================================================
-- INHACA CONNECT · Migration 0008 — Supabase Storage: buckets e políticas
-- Convenção de caminhos:
--   avatars/{user_id}/...            público
--   post-media/{user_id}/...         público
--   business-media/{user_id}/...     público
--   product-media/{user_id}/...      público
--   event-media/{user_id}/...        público
--   chat-media/{conversation_id}/... privado (participantes)
--   documents/{user_id}/...          privado (dono + staff)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-media', 'post-media', true, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('business-media', 'business-media', true, 6291456, array['image/jpeg', 'image/png', 'image/webp']),
  ('product-media', 'product-media', true, 6291456, array['image/jpeg', 'image/png', 'image/webp']),
  ('event-media', 'event-media', true, 6291456, array['image/jpeg', 'image/png', 'image/webp']),
  ('chat-media', 'chat-media', false, 6291456, array['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Buckets públicos: leitura para todos.
create policy "storage: leitura pública de media"
  on storage.objects for select
  using (bucket_id in ('avatars', 'post-media', 'business-media', 'product-media', 'event-media'));

-- Upload apenas para a pasta do próprio utilizador.
create policy "storage: upload na própria pasta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'post-media', 'business-media', 'product-media', 'event-media', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_user()
  );

create policy "storage: atualizar ficheiros próprios"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'post-media', 'business-media', 'product-media', 'event-media', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage: apagar ficheiros próprios ou staff"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'post-media', 'business-media', 'product-media', 'event-media', 'documents', 'chat-media')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator())
  );

-- Chat: apenas participantes da conversa.
create policy "storage: chat leitura por participantes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-media'
    and public.can_access_conversation(public.try_uuid((storage.foldername(name))[1]))
  );

create policy "storage: chat upload por participantes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and public.can_access_conversation(public.try_uuid((storage.foldername(name))[1]))
  );

-- Documentos de verificação: dono e staff.
create policy "storage: documentos dono e staff"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator())
  );
