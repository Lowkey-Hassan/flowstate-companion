import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type Profile = Tables<"user_profile">;

async function fetchOrCreateProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  // Create a blank profile on first sign-in.
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;
  const { data: created, error: insertErr } = await supabase
    .from("user_profile")
    .insert({ user_id: userId, timezone: tz })
    .select("*")
    .single();

  if (insertErr) throw insertErr;
  return created;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchOrCreateProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"user_profile">) => {
      const { data, error } = await supabase
        .from("user_profile")
        .update(patch)
        .eq("user_id", user!.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["profile", user?.id], data);
    },
  });
}

export function traitsOf(profile?: Profile | null): string[] {
  if (!profile?.mind_traits) return [];
  const raw = profile.mind_traits;
  if (Array.isArray(raw)) return raw.map((t) => String(t));
  return [];
}
