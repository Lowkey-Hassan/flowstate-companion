import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export const todayStr = () => new Date().toISOString().slice(0, 10);

/* ---------------- Tasks ---------------- */
export type Task = Tables<"tasks">;

export function useTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useAddTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Omit<TablesInsert<"tasks">, "user_id">) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...t, user_id: user!.id })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
  });
}

export function useUpdateTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Task>;
    }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
  });
}

export function useDeleteTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
  });
}

export type Priority = "HIGH" | "LOW";
export type Ease = "EASY" | "HARD";

export type RatedTask = {
  dbId?: string;
  title: string;
  estimatedMinutes: number;
  microStep: string;
  priority: Priority;
  ease: Ease;
  quadrant_score: number;
  display_order: number;
};

export function useSaveOrderedTasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tasks: RatedTask[]) => {
      for (const t of tasks) {
        const payload = {
          title: t.title,
          time_estimate_mins: t.estimatedMinutes,
          micro_first_step: t.microStep,
          priority: t.priority,
          ease: t.ease,
          quadrant_score: t.quadrant_score,
          display_order: t.display_order,
          energy_level: t.ease === "HARD" ? "high" : "low",
          tab: "today",
          is_complete: false,
        };
        if (t.dbId) {
          const { error } = await supabase
            .from("tasks")
            .update(payload)
            .eq("id", t.dbId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("tasks")
            .insert({ ...payload, user_id: user!.id });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
  });
}


/* ---------------- Focus sessions ---------------- */
export type FocusSession = Tables<"focus_sessions">;

export function useFocusSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["focus", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("focus_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FocusSession[];
    },
  });
}

export function useAddFocusSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Omit<TablesInsert<"focus_sessions">, "user_id">) => {
      const { data, error } = await supabase
        .from("focus_sessions")
        .insert({ ...s, user_id: user!.id })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focus", user?.id] }),
  });
}

/* ---------------- Chess games ---------------- */
export type ChessGame = Tables<"chess_games">;

export function useChessGames(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chess_games", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chess_games")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as ChessGame[];
    },
  });
}

export function useAddChessGame() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: Omit<TablesInsert<"chess_games">, "user_id">) => {
      const { data, error } = await supabase
        .from("chess_games")
        .insert({ ...g, user_id: user!.id })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["chess_games", user?.id] }),
  });
}

/* ---------------- Daily logs ---------------- */
export type DailyLog = Tables<"daily_logs">;

export function useDailyLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["daily_logs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .order("date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as DailyLog[];
    },
  });
}

export function useUpsertDailyLog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: Partial<DailyLog> & { date: string }) => {
      const { error } = await supabase.from("daily_logs").upsert(
        { ...log, user_id: user!.id },
        { onConflict: "user_id,date" },
      );
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["daily_logs", user?.id] }),
  });
}

/* ---------------- Coach ---------------- */
export type CoachMessage = Tables<"coach_messages">;

export function useCoachMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CoachMessage[];
    },
  });
}

export function useAddCoachMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: { role: string; content: string }) => {
      const { data, error } = await supabase
        .from("coach_messages")
        .insert({ ...m, user_id: user!.id })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach", user?.id] }),
  });
}

/* ---------------- ThoughtBook ---------------- */
export type CloudWord = {
  word: string;
  importance: number;
  category: string;
};

export type ThoughtEntry = Tables<"thought_entries">;
export type ThoughtChapter = Tables<"thought_chapters">;

export function wordCloudOf(entry: ThoughtEntry): CloudWord[] {
  const raw = entry.word_cloud_data;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((w: any) => ({
      word: String(w?.word ?? ""),
      importance: Number(w?.importance ?? 5),
      category: String(w?.category ?? "context"),
    }))
    .filter((w) => w.word);
}

export function useThoughtEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["thoughts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thought_entries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ThoughtEntry[];
    },
  });
}

export function useThoughtChapters() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["thought_chapters", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thought_chapters")
        .select("*")
        .order("chapter_number", { ascending: true });
      if (error) throw error;
      return data as ThoughtChapter[];
    },
  });
}

export type NewThoughtEntry = {
  raw_thought: string;
  crystallized?: string | null;
  hidden_question?: string | null;
  tones?: string[];
  breakdown?: string[];
  word_cloud_data?: CloudWord[];
};

export function useAddThoughtEntry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: NewThoughtEntry) => {
      const { data, error } = await supabase
        .from("thought_entries")
        .insert({
          user_id: user!.id,
          raw_thought: entry.raw_thought,
          crystallized: entry.crystallized ?? null,
          hidden_question: entry.hidden_question ?? null,
          tones: entry.tones ?? [],
          breakdown: entry.breakdown ?? [],
          word_cloud_data: (entry.word_cloud_data ?? []) as any,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as ThoughtEntry;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thoughts", user?.id] }),
  });
}

export function useUpdateThoughtEntry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<ThoughtEntry>;
    }) => {
      const { error } = await supabase
        .from("thought_entries")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thoughts", user?.id] }),
  });
}

export function useDeleteThoughtEntry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("thought_entries")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thoughts", user?.id] }),
  });
}

export type DetectedChapter = {
  name: string;
  theme: string;
  entryIds: string[];
};

export function useSaveChapters() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chapters: DetectedChapter[]) => {
      // Clear previous chapter assignments + chapters, then rebuild.
      await supabase
        .from("thought_entries")
        .update({ chapter_id: null })
        .eq("user_id", user!.id);
      await supabase.from("thought_chapters").delete().eq("user_id", user!.id);

      let n = 1;
      for (const ch of chapters) {
        const { data: created, error } = await supabase
          .from("thought_chapters")
          .insert({
            user_id: user!.id,
            chapter_number: n,
            name: ch.name,
            theme: ch.theme,
            entry_count: ch.entryIds.length,
          })
          .select("*")
          .single();
        if (error) throw error;
        if (ch.entryIds.length) {
          const { error: upErr } = await supabase
            .from("thought_entries")
            .update({ chapter_id: created.id })
            .in("id", ch.entryIds)
            .eq("user_id", user!.id);
          if (upErr) throw upErr;
        }
        n += 1;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thoughts", user?.id] });
      qc.invalidateQueries({ queryKey: ["thought_chapters", user?.id] });
    },
  });
}
