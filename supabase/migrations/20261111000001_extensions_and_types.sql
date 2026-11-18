-- ============================================================================
-- INHACA CONNECT · Migration 0001 — Extensões, tipos e utilitários
-- ============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_trgm with schema extensions;
-- PostGIS (disponível no Supabase). Usado para consultas de proximidade.
create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------------
create type public.app_role as enum (
  'visitor', 'resident', 'business_owner', 'seller', 'event_organizer', 'moderator', 'admin'
);
create type public.content_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.post_category as enum (
  'noticia', 'aviso', 'evento', 'emprego', 'turismo', 'comercio', 'transporte', 'comunidade', 'outro'
);
create type public.media_type as enum ('image', 'video');
create type public.conversation_type as enum ('general', 'group', 'direct');
create type public.notification_type as enum (
  'comment', 'reply', 'reaction', 'message', 'follow',
  'business_status', 'event_status', 'product_status', 'report_resolved', 'system'
);
create type public.report_target as enum (
  'post', 'comment', 'message', 'business', 'product', 'event', 'profile', 'help_request'
);
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.help_request_type as enum (
  'transporte', 'produto', 'servico', 'assistencia', 'emprego', 'outro'
);
create type public.help_request_status as enum ('open', 'resolved', 'closed');
create type public.product_status as enum ('active', 'sold_out', 'suspended', 'archived');
create type public.attendee_status as enum ('going', 'interested');
create type public.ad_placement as enum ('home', 'feed', 'directory', 'sidebar');
create type public.event_category as enum (
  'festa', 'cultura', 'desporto', 'turismo', 'comunidade', 'religioso', 'mercado', 'outro'
);

-- ---------------------------------------------------------------------------
-- Utilitários genéricos
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Conversão segura de texto para uuid (devolve null em vez de erro).
create or replace function public.try_uuid(_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return _value::uuid;
exception when others then
  return null;
end;
$$;

-- Flag de sessão usada por funções internas (security definer) para contornar
-- os triggers de proteção de campos administrativos (contadores, ratings...).
create or replace function public.bypass_protection()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('app.bypass_protect', true), '') = 'on';
$$;
