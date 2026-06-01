import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Plus, Trash2, Check, Zap } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { useProfile, traitsOf } from "@/lib/profile";
import {
  useTasks,
  useAddTask,
  useUpdateTask,
  useDeleteTask,
  type Task,
} from "@/lib/data";
import { useOnline } from "@/hooks/use-online";
import { breakdownTasks } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({ meta: [{ title: "Tasks — FlowState" }] }),
  component: TasksPage,
});

const ENERGY: Record<string, string> = {
  low: "text-success",
  medium: "text-warning",
  high: "text-destructive",
};

function TasksPage() {
  const profile = useProfile();
  const tasks = useTasks();
  const addTask = useAddTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const online = useOnline();
  const breakdown = useServerFn(breakdownTasks);

  const [dump, setDump] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"today" | "later" | "done">("today");

  const runBreakdown = async () => {
    if (!dump.trim()) return;
    if (!online) {
      toast("You're offline. Your data is safe.");
      return;
    }
    setBusy(true);
    try {
      const res = await breakdown({
        data: { brainDump: dump, traits: traitsOf(profile.data) },
      });
      if (res.error || !res.tasks.length) {
        toast.error("Couldn't break that down right now. Try again in a moment.");
      } else {
        for (const t of res.tasks) {
          await addTask.mutateAsync({
            title: t.title,
            time_estimate_mins: Math.round(t.time_estimate_mins),
            energy_level: t.energy_level,
            micro_first_step: t.micro_first_step,
            tab: "today",
          });
        }
        toast.success(`${res.tasks.length} bite-sized steps, ready.`);
        setDump("");
      }
    } finally {
      setBusy(false);
    }
  };

  const all = tasks.data ?? [];
  const visible = all.filter((t) =>
    tab === "done" ? t.is_complete : !t.is_complete && t.tab === tab,
  );

  const toggle = (t: Task) => {
    updateTask.mutate({
      id: t.id,
      patch: {
        is_complete: !t.is_complete,
        completed_at: !t.is_complete ? new Date().toISOString() : null,
      },
    });
    if (!t.is_complete) toast("Done. That's real momentum.");
  };

  return (
    <div>
      <PageTitle
        eyebrow="Tasks"
        title="Get it out of your head."
        subtitle="Dump everything swirling around. I'll turn the chaos into small, doable steps — with the tiniest first move for each."
      />

      {/* Brain dump */}
      <div className="card-surface mb-6 p-4">
        <textarea
          value={dump}
          onChange={(e) => setDump(e.target.value)}
          rows={4}
          placeholder="Reply to landlord, book dentist, that work thing I keep avoiding, buy a birthday gift…"
          className="w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            No structure needed. Messy is perfect.
          </span>
          <button
            onClick={runBreakdown}
            disabled={busy || !dump.trim()}
            className="press flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {busy ? "Thinking…" : "Break it down"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-surface p-1">
        {(["today", "later", "done"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              tab === t
                ? "bg-surface-2 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {visible.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="card-surface group flex items-start gap-3 p-4"
            >
              <button
                onClick={() => toggle(t)}
                className={cn(
                  "press mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  t.is_complete
                    ? "border-gold bg-gold text-primary-foreground"
                    : "border-border-accent hover:border-gold",
                )}
              >
                {t.is_complete && <Check className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-sm text-foreground",
                    t.is_complete && "text-muted-foreground line-through",
                  )}
                >
                  {t.title}
                </div>
                {!t.is_complete && t.micro_first_step && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-gold">
                    <Zap className="h-3 w-3" />
                    {t.micro_first_step}
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{t.time_estimate_mins} min</span>
                  <span className={ENERGY[t.energy_level] ?? ""}>
                    {t.energy_level} energy
                  </span>
                  {!t.is_complete && tab === "today" && (
                    <button
                      onClick={() =>
                        updateTask.mutate({ id: t.id, patch: { tab: "later" } })
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      → later
                    </button>
                  )}
                  {!t.is_complete && tab === "later" && (
                    <button
                      onClick={() =>
                        updateTask.mutate({ id: t.id, patch: { tab: "today" } })
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      → today
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteTask.mutate(t.id)}
                className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {visible.length === 0 && (
          <div className="card-surface flex flex-col items-center gap-2 py-12 text-center">
            <Plus className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {tab === "done"
                ? "Nothing finished yet. That's okay."
                : "Nothing here. A clear list is a kind of peace."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
