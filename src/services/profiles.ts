import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole, Profile } from "@/types";

export interface PublicProfile extends Profile {
  roles: AppRole[];
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_followed_by_me?: boolean;
  is_blocked_by_me?: boolean;
}

export async function getProfileByUsername(
  supabase: SupabaseClient,
  username: string,
  viewerId?: string | null,
): Promise<PublicProfile | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) return null;
  const p = profile as Profile;

  const [roles, followers, following, posts, followedByMe, blockedByMe] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", p.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", p.id).eq("is_hidden", false),
    viewerId
      ? supabase.from("follows").select("follower_id").eq("follower_id", viewerId).eq("following_id", p.id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewerId
      ? supabase.from("user_blocks").select("blocker_id").eq("blocker_id", viewerId).eq("blocked_id", p.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...p,
    roles: (roles.data ?? []).map((r: { role: AppRole }) => r.role),
    followers_count: followers.count ?? 0,
    following_count: following.count ?? 0,
    posts_count: posts.count ?? 0,
    is_followed_by_me: Boolean(followedByMe.data),
    is_blocked_by_me: Boolean(blockedByMe.data),
  };
}

export async function searchProfiles(supabase: SupabaseClient, q: string, limit = 10): Promise<Profile[]> {
  const term = q.replace(/[%_,]/g, " ").trim();
  if (term.length < 2) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_banned", false)
    .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
    .limit(limit);
  return (data ?? []) as Profile[];
}

export async function isUsernameAvailable(
  supabase: SupabaseClient,
  username: string,
  excludeUserId?: string,
): Promise<boolean> {
  let query = supabase.from("profiles").select("id").eq("username", username.toLowerCase());
  if (excludeUserId) query = query.neq("id", excludeUserId);
  const { data } = await query.maybeSingle();
  return !data;
}
