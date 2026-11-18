/**
 * Tipos de domínio do INHACA CONNECT.
 * Espelham o esquema PostgreSQL em supabase/migrations.
 */

export type AppRole =
  | "visitor"
  | "resident"
  | "business_owner"
  | "seller"
  | "event_organizer"
  | "moderator"
  | "admin";

export type ContentStatus = "pending" | "approved" | "rejected" | "suspended";

export type PostCategory =
  | "noticia"
  | "aviso"
  | "evento"
  | "emprego"
  | "turismo"
  | "comercio"
  | "transporte"
  | "comunidade"
  | "outro";

export type MediaType = "image" | "video";
export type ConversationType = "general" | "group" | "direct";
export type NotificationType =
  | "comment"
  | "reply"
  | "reaction"
  | "message"
  | "follow"
  | "business_status"
  | "event_status"
  | "product_status"
  | "report_resolved"
  | "system";
export type ReportTarget =
  | "post"
  | "comment"
  | "message"
  | "business"
  | "product"
  | "event"
  | "profile"
  | "help_request";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type HelpRequestType =
  | "transporte"
  | "produto"
  | "servico"
  | "assistencia"
  | "emprego"
  | "outro";
export type HelpRequestStatus = "open" | "resolved" | "closed";
export type ProductStatus = "active" | "sold_out" | "suspended" | "archived";
export type AttendeeStatus = "going" | "interested";
export type AdPlacement = "home" | "feed" | "directory" | "sidebar";
export type EventCategory =
  | "festa"
  | "cultura"
  | "desporto"
  | "turismo"
  | "comunidade"
  | "religioso"
  | "mercado"
  | "outro";

export interface ProfileSummary {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export interface Profile extends ProfileSummary {
  bio: string | null;
  phone: string | null;
  whatsapp: string | null;
  location: string | null;
  website: string | null;
  is_resident: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  created_at: string;
}

export interface BusinessCategory {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}
export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type OpeningHours = Partial<Record<WeekDay, DayHours>>;

export interface BusinessService {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: string | null;
  sort_order: number;
}

export interface BusinessMedia {
  id: string;
  business_id: string;
  url: string;
  type: MediaType;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  category_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: OpeningHours;
  price_info: string | null;
  amenities: string[];
  status: ContentStatus;
  rejection_reason: string | null;
  is_verified: boolean;
  is_featured: boolean;
  approved_at: string | null;
  views_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  category?: BusinessCategory | null;
  owner?: ProfileSummary | null;
  media?: BusinessMedia[];
  services?: BusinessService[];
}

export interface BusinessVerification {
  id: string;
  business_id: string;
  requested_by: string;
  status: ContentStatus;
  notes: string | null;
  document_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  business?: Pick<Business, "id" | "name" | "slug"> | null;
}

export interface Review {
  id: string;
  business_id: string;
  author_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  author?: ProfileSummary | null;
}

export interface PostMedia {
  id: string;
  post_id: string;
  url: string;
  type: MediaType;
  width: number | null;
  height: number | null;
  sort_order: number;
}

export interface Post {
  id: string;
  author_id: string;
  category: PostCategory;
  content: string;
  location: string | null;
  business_id: string | null;
  event_id: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_pinned: boolean;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
  author?: ProfileSummary | null;
  media?: PostMedia[];
  /** Preenchido para o utilizador atual. */
  liked_by_me?: boolean;
  saved_by_me?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  author?: ProfileSummary | null;
  replies?: Comment[];
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description: string | null;
  category: EventCategory;
  cover_url: string | null;
  starts_at: string;
  ends_at: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  business_id: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  price_info: string | null;
  status: ContentStatus;
  rejection_reason: string | null;
  is_featured: boolean;
  attendees_count: number;
  created_at: string;
  updated_at: string;
  organizer?: ProfileSummary | null;
  my_status?: AttendeeStatus | null;
}

export interface ProductCategory {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  unit: string | null;
  is_negotiable: boolean;
  images: string[];
  location: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  status: ProductStatus;
  is_featured: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
  category?: ProductCategory | null;
  seller?: ProfileSummary | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  created_by: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  id: string;
  type: ConversationType;
  title: string | null;
  group_slug: string | null;
  group_icon: string | null;
  other_user: ProfileSummary | null;
  last_message: {
    id: string;
    content: string | null;
    image_url: string | null;
    sender_id: string;
    created_at: string;
  } | null;
  unread_count: number;
  last_message_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  is_deleted: boolean;
  created_at: string;
  sender?: ProfileSummary | null;
}

export interface Group {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  topic: string | null;
  icon: string | null;
  cover_url: string | null;
  conversation_id: string;
  created_by: string | null;
  is_default: boolean;
  members_count: number;
  created_at: string;
  is_member?: boolean;
}

export interface HelpRequest {
  id: string;
  author_id: string;
  type: HelpRequestType;
  title: string;
  description: string;
  location: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  status: HelpRequestStatus;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  author?: ProfileSummary | null;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  reporter?: ProfileSummary | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: ProfileSummary | null;
}

export interface Advertisement {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  placement: AdPlacement;
  advertiser_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  clicks_count: number;
  impressions_count: number;
  created_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: ProfileSummary | null;
}

export interface GuidePage {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  icon: string | null;
  sort_order: number;
  is_published: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSetting {
  key: string;
  value: unknown;
  updated_at: string;
}

export interface SearchResult {
  kind: "business" | "post" | "event" | "product" | "guide" | "profile";
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  href: string;
}

export interface AdminStats {
  users_total: number;
  users_last_30d: number;
  businesses_total: number;
  businesses_pending: number;
  businesses_approved: number;
  posts_total: number;
  posts_last_7d: number;
  events_total: number;
  events_pending: number;
  events_upcoming: number;
  products_total: number;
  products_active: number;
  reports_open: number;
  messages_last_7d: number;
  help_requests_open: number;
}

/** Utilizador autenticado com perfil e papéis carregados no servidor. */
export interface CurrentUser {
  id: string;
  email: string | null;
  profile: Profile;
  roles: AppRole[];
}
