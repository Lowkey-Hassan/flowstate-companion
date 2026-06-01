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

/* ---------------- Habits ---------------- */
export type Habit = Tables<"habits">;
export type HabitLog = Tables<"habit_logs">;

export function useHabits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habits", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Habit[];
    },
  });
}

export function useHabitLogs(date = todayStr()) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habit_logs", user?.id, date],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("date", date);
      if (error) throw error;
      return data as HabitLog[];
    },
  });
}

export function useReplaceHabits() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      habits: { name: string; duration_mins: number; mvp_fallback: string }[],
    ) => {
      await supabase.from("habits").delete().eq("user_id", user!.id);
      if (habits.length) {
        const rows = habits.map((h, i) => ({
          ...h,
          order_index: i,
          user_id: user!.id,
        }));
        const { error } = await supabase.from("habits").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits", user?.id] }),
  });
}

export function useToggleHabit() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      habitId,
      complete,
      badDay,
      date = todayStr(),
    }: {
      habitId: string;
      complete: boolean;
      badDay?: boolean;
      date?: string;
    }) => {
      const { error } = await supabase.from("habit_logs").upsert(
        {
          user_id: user!.id,
          habit_id: habitId,
          date,
          is_complete: complete,
          is_bad_day_mode: badDay ?? false,
        },
        { onConflict: "habit_id,date" },
      );
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["habit_logs", user?.id] }),
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
