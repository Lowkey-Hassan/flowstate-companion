import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, Check } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import {
  useAddFocusSession,
  useFocusSessions,
} from "@/lib/data";
import { useOnline } from "@/hooks/use-online";
import { randomReward } from "@/lib/constants";
import { focusEncouragement } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/focus")({
  head: () => ({ meta: [{ title: "Focus — FlowState" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    task: typeof search.task === "string" ? search.task : undefined,
    duration:
      typeof search.duration === "number"
        ? search.duration
        : typeof search.duration === "string"
          ? Number(search.duration)
          : undefined,
  }),
  component: FocusPage,
});

const DURATIONS = [15, 25, 45];
const RATINGS = ["Crushed it", "Did okay", "It was hard"];

type Phase = "setup" | "running" | "done";

function FocusPage() {
  const { task: initialTask, duration: initialDuration } = Route.useSearch();
  const addSession = useAddFocusSession();
  const sessions = useFocusSessions();
  const online = useOnline();
  const encourageFn = useServerFn(focusEncouragement);

  const [phase, setPhase] = useState<Phase>("setup");
  const [duration, setDuration] = useState(
    initialDuration && DURATIONS.includes(initialDuration) ? initialDuration : 25,
  );
  const [taskName, setTaskName] = useState(initialTask ?? "");
  const [remaining, setRemaining] = useState(25 * 60);
  const [paused, setPaused] = useState(false);
  const [reward, setReward] = useState("");
  const [encouragement, setEncouragement] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const weeklyCount =
    (sessions.data ?? []).filter(
      (s) => s.created_at >= new Date(Date.now() - 7 * 86400000).toISOString(),
    ).length + 1;

  useEffect(() => {
    if (phase !== "running" || paused) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          finish(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused]);

  const start = () => {
    setRemaining(duration * 60);
    setPaused(false);
    setPhase("running");
  };

  const finish = async (completed: boolean) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const actual = completed
      ? duration
      : Math.round((duration * 60 - remaining) / 60);
    setReward(randomReward());
    setPhase("done");
    addSession.mutate({
      task_name: taskName || null,
      planned_duration: duration,
      actual_duration: actual,
    });
  };

  const rate = async (rating: string) => {
    if (online) {
      try {
        const res = await encourageFn({
          data: { weeklyCount, rating },
        });
        if (res.text) setEncouragement(res.text);
      } catch {
        /* graceful */
      }
    }
  };

  const reset = () => {
    setPhase("setup");
    setTaskName("");
    setEncouragement("");
    setReward("");
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress =
    phase === "running" ? 1 - remaining / (duration * 60) : 0;

  return (
    <div>
      {phase === "setup" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <PageTitle
            eyebrow="Focus"
            title="One block at a time."
            subtitle="You don't have to finish the thing. You just have to start it for a little while."
          />

          <div className="card-surface mb-5 p-5">
            <label className="text-xs font-medium text-muted-foreground">
              What are you focusing on? (optional)
            </label>
            <input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="The one thing"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-surface-2 px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-gold/60"
            />
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
            How long?
          </p>
          <div className="mb-6 grid grid-cols-3 gap-3">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  "press rounded-xl border py-5 text-center transition-colors",
                  duration === d
                    ? "border-gold/60 bg-surface-2"
                    : "border-border bg-surface hover:border-border-accent",
                )}
              >
                <div className="font-display text-2xl text-foreground">{d}</div>
                <div className="text-xs text-muted-foreground">min</div>
              </button>
            ))}
          </div>

          <button
            onClick={start}
            className="press flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Play className="h-4 w-4" />
            Begin
          </button>
        </motion.div>
      )}

      {phase === "running" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex min-h-[60vh] flex-col items-center justify-center"
        >
          {taskName && (
            <p className="mb-8 max-w-sm text-center text-sm text-muted-foreground">
              {taskName}
            </p>
          )}
          <div className="relative flex h-64 w-64 items-center justify-center">
            <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="var(--border-accent)"
                strokeWidth="2"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="var(--gold)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - progress)}
                transition={{ ease: "linear" }}
              />
            </svg>
            <div className="text-center">
              <div className="font-mono text-5xl tabular-nums text-foreground">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {paused ? "Paused" : "In flow"}
              </p>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-3">
            <button
              onClick={() => setPaused((p) => !p)}
              className="press flex h-12 w-12 items-center justify-center rounded-full border border-border-accent text-foreground transition-colors hover:border-gold"
            >
              {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
            <button
              onClick={() => finish(false)}
              className="press flex h-12 items-center gap-2 rounded-full border border-border-accent px-5 text-sm text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
              End early
            </button>
          </div>
          <p className="mt-6 max-w-xs text-center text-xs text-muted-foreground">
            Ending early still counts. Showing up is the win.
          </p>
        </motion.div>
      )}

      {phase === "done" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[60vh] flex-col items-center justify-center text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15"
          >
            <Check className="h-7 w-7 text-gold" />
          </motion.div>
          <h2 className="font-display text-3xl tracking-tight text-foreground">
            {reward}
          </h2>

          <AnimatePresence>
            {encouragement && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 max-w-sm text-sm text-muted-foreground"
              >
                {encouragement}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="mt-8 w-full max-w-xs">
            <p className="mb-3 text-xs text-muted-foreground">How did it go?</p>
            <div className="space-y-2">
              {RATINGS.map((r) => (
                <button
                  key={r}
                  onClick={() => rate(r)}
                  className="press w-full rounded-lg border border-border bg-surface py-3 text-sm text-foreground transition-colors hover:border-gold/60"
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={reset}
              className="press mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
