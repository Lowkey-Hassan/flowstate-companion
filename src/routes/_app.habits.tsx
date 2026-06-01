import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Check, RefreshCw, HeartPulse } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { useProfile, traitsOf } from "@/lib/profile";
import {
  useHabits,
  useHabitLogs,
  useReplaceHabits,
  useToggleHabit,
} from "@/lib/data";
import { useOnline } from "@/hooks/use-online";
import { buildRoutine } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/habits")({
  head: () => ({ meta: [{ title: "Habits — FlowState" }] }),
  component: HabitsPage,
});

function HabitsPage() {
  const profile = useProfile();
  const habits = useHabits();
  const logs = useHabitLogs();
  const replace = useReplaceHabits();
  const toggle = useToggleHabit();
  const online = useOnline();
  const buildFn = useServerFn(buildRoutine);

  const [type, setType] = useState<"morning" | "evening">("morning");
  const [busy, setBusy] = useState(false);
  const [badDay, setBadDay] = useState(false);

  const build = async () => {
    if (!online) {
      toast("You're offline. Your data is safe.");
      return;
    }
    setBusy(true);
    try {
      const res = await buildFn({
        data: {
          type,
          traits: traitsOf(profile.data),
          anchorTime: profile.data?.anchor_time ?? "",
        },
      });
      if (res.error || !res.habits.length) {
        toast.error("Couldn't build that routine. Try again shortly.");
      } else {
        await replace.mutateAsync(res.habits);
        toast.success("Your routine is ready. One step at a time.");
      }
    } finally {
      setBusy(false);
    }
  };

  const list = habits.data ?? [];
  const logMap = new Map((logs.data ?? []).map((l) => [l.habit_id, l]));
  const done = list.filter((h) => logMap.get(h.id)?.is_complete).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;

  return (
    <div>
      <PageTitle
        eyebrow="Rituals"
        title="Gentle structure."
        subtitle="ADHD-friendly routines with a built-in 'bad day' version — because some days, the minimum is the win."
      />

      {list.length === 0 ? (
        <div className="card-surface p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Let's design a routine that bends instead of breaking. Which part of
            day?
          </p>
          <div className="mb-5 grid grid-cols-2 gap-3">
            {(["morning", "evening"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "press rounded-lg border py-3 text-sm capitalize transition-colors",
                  type === t
                    ? "border-gold/60 bg-surface-2 text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-border-accent",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={build}
            disabled={busy}
            className="press flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {busy ? "Designing…" : "Build my routine"}
          </button>
        </div>
      ) : (
        <>
          {/* Progress + controls */}
          <div className="card-surface mb-5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-display text-2xl text-foreground">
                  {done}/{list.length}
                </div>
                <p className="text-xs text-muted-foreground">done today</p>
              </div>
              <button
                onClick={() => setBadDay((b) => !b)}
                className={cn(
                  "press flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                  badDay
                    ? "border-gold/60 bg-surface-2 text-gold"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <HeartPulse className="h-3.5 w-3.5" />
                Bad day mode
              </button>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border-accent">
              <motion.div
                className="h-full rounded-full bg-gold"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            {badDay && (
              <p className="mt-3 text-xs text-muted-foreground">
                Showing the minimum viable version of each. This still counts as
                a full day.
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            <AnimatePresence>
              {list.map((h) => {
                const complete = logMap.get(h.id)?.is_complete ?? false;
                return (
                  <motion.button
                    key={h.id}
                    layout
                    onClick={() =>
                      toggle.mutate({
                        habitId: h.id,
                        complete: !complete,
                        badDay,
                      })
                    }
                    className="card-surface flex w-full items-start gap-3 p-4 text-left"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        complete
                          ? "border-gold bg-gold text-primary-foreground"
                          : "border-border-accent",
                      )}
                    >
                      {complete && <Check className="h-3 w-3" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "text-sm text-foreground",
                          complete && "text-muted-foreground line-through",
                        )}
                      >
                        {badDay && h.mvp_fallback ? h.mvp_fallback : h.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {badDay ? "minimum version" : `${h.duration_mins} min`}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          <button
            onClick={() => replace.mutate([])}
            className="press mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Rebuild routine
          </button>
        </>
      )}
    </div>
  );
}
