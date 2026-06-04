import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Zap, Trash2, Check, RotateCcw, Sparkle } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import {
  useTasks,
  useUpdateTask,
  useDeleteTask,
  useSaveOrderedTasks,
  type Task,
  type Priority,
  type Ease,
} from "@/lib/data";
import { useOnline } from "@/hooks/use-online";
import { extractTasks } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({ meta: [{ title: "Tasks — FlowState" }] }),
  component: TasksPage,
});

/* ---------------- Sorting ---------------- */
function getQuadrantScore(priority: Priority, ease: Ease): number {
  if (priority === "HIGH" && ease === "EASY") return 1; // Do FIRST
  if (priority === "HIGH" && ease === "HARD") return 2; // Do SECOND
  if (priority === "LOW" && ease === "HARD") return 3; // Do THIRD
  if (priority === "LOW" && ease === "EASY") return 4; // Do LAST
  return 5;
}

// Time bucket: quick tasks float up, long tasks sink.
// < 30 min → 1 (top), 30–60 min → 2 (middle), > 60 min → 3 (end)
function getTimeBucket(minutes: number): number {
  if (minutes < 30) return 1;
  if (minutes <= 60) return 2;
  return 3;
}

type RatingItem = {
  id: string;
  dbId?: string;
  title: string;
  estimatedMinutes: number;
  microStep: string;
  priority?: Priority;
  ease?: Ease;
};

function taskToItem(t: Task): RatingItem {
  return {
    id: t.id,
    dbId: t.id,
    title: t.title,
    estimatedMinutes: t.time_estimate_mins,
    microStep: t.micro_first_step ?? "",
    priority: (t.priority as Priority) ?? undefined,
    ease: (t.ease as Ease) ?? undefined,
  };
}

function accentColor(it: RatingItem): string {
  if (!it.priority || !it.ease) return "#252525";
  const s = getQuadrantScore(it.priority, it.ease);
  if (s === 1) return "#C9A84C";
  if (s === 2) return "#8A6E2F";
  return "#2A2A2A";
}

/* ---------------- Page ---------------- */
function TasksPage() {
  const navigate = useNavigate();
  const tasks = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const saveOrdered = useSaveOrderedTasks();
  const online = useOnline();
  const extractFn = useServerFn(extractTasks);

  const [dump, setDump] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [items, setItems] = useState<RatingItem[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);

  const [bannerVisible, setBannerVisible] = useState(false);

  const ordered = useMemo(
    () =>
      (tasks.data ?? [])
        .filter((t) => t.display_order != null && !t.is_complete)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [tasks.data],
  );

  useEffect(() => {
    if (!bannerVisible) return;
    const t = setTimeout(() => setBannerVisible(false), 8000);
    return () => clearTimeout(t);
  }, [bannerVisible]);

  const runExtract = async () => {
    if (!dump.trim() || extracting) return;
    if (!online) {
      setExtractError("You're offline. Your data is safe.");
      return;
    }
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await extractFn({ data: { brainDump: dump } });
      if (res.error || !res.tasks?.length) {
        setExtractError(
          "I couldn't quite parse that — try rephrasing or breaking it into separate lines.",
        );
        return;
      }
      const existing = ordered.map(taskToItem);
      const fresh: RatingItem[] = res.tasks.map(
        (t: { id: string; title: string; estimatedMinutes: number; microStep: string }) => ({
          id: t.id,
          title: t.title,
          estimatedMinutes: t.estimatedMinutes,
          microStep: t.microStep,
        }),
      );
      const combined = [...existing, ...fresh];
      setDump("");

      if (combined.length === 1) {
        const only = combined[0];
        await saveOrdered.mutateAsync([
          {
            dbId: only.dbId,
            title: only.title,
            estimatedMinutes: only.estimatedMinutes,
            microStep: only.microStep,
            priority: "HIGH",
            ease: "EASY",
            quadrant_score: 1,
            display_order: 0,
          },
        ]);
        setBannerVisible(true);
        return;
      }

      setItems(combined);
      setPanelOpen(true);
    } catch {
      setExtractError("Something went wrong parsing that. Try again?");
    } finally {
      setExtracting(false);
    }
  };

  const reRate = () => {
    setItems(ordered.map(taskToItem));
    setPanelOpen(true);
  };

  const setRating = (id: string, field: "priority" | "ease", value: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    );
  };

  const ratedCount = items.filter((it) => it.priority && it.ease).length;
  const allRated = items.length > 0 && ratedCount === items.length;

  const orderDay = async () => {
    if (!allRated) return;
    const scored = items
      .map((it) => ({
        it,
        score: getQuadrantScore(it.priority!, it.ease!),
        timeBucket: getTimeBucket(it.estimatedMinutes),
      }))
      .sort((a, b) =>
        a.score !== b.score
          ? a.score - b.score
          : a.timeBucket !== b.timeBucket
            ? a.timeBucket - b.timeBucket
            : a.it.estimatedMinutes - b.it.estimatedMinutes,
      )
      .map((row, i) => ({
        dbId: row.it.dbId,
        title: row.it.title,
        estimatedMinutes: row.it.estimatedMinutes,
        microStep: row.it.microStep,
        priority: row.it.priority!,
        ease: row.it.ease!,
        quadrant_score: row.score,
        display_order: i,
      }));
    await saveOrdered.mutateAsync(scored);
    setPanelOpen(false);
    setItems([]);
    setConfirmClose(false);
    setBannerVisible(true);
  };

  const requestClose = () => {
    if (items.some((it) => it.priority || it.ease)) {
      setConfirmClose(true);
    } else {
      doClose();
    }
  };

  const doClose = () => {
    setPanelOpen(false);
    setItems([]);
    setConfirmClose(false);
  };

  const startFocus = (t: Task) =>
    navigate({ to: "/focus", search: { task: t.title, duration: 25 } });

  const completeTask = (t: Task) =>
    updateTask.mutate({
      id: t.id,
      patch: {
        is_complete: true,
        completed_at: new Date().toISOString(),
        display_order: null,
      },
    });

  const allHigh =
    ordered.length > 1 && ordered.every((t) => t.priority === "HIGH");
  const hasLowerGroup = ordered.some((t) => (t.quadrant_score ?? 0) >= 3);
  const hasTopGroup = ordered.some((t) => (t.quadrant_score ?? 5) <= 2);
  const showDivider = hasLowerGroup && hasTopGroup;
  let dividerShown = false;

  return (
    <div>
      <PageTitle
        eyebrow="Tasks"
        title="Get it out of your head."
        subtitle="Dump everything swirling around. I'll untangle it, then help you rate and order it into a numbered battle plan."
      />

      {/* Brain dump */}
      <div className="card-surface mb-6 p-4">
        <textarea
          value={dump}
          onChange={(e) => setDump(e.target.value)}
          rows={4}
          disabled={extracting}
          placeholder="Reply to landlord, book dentist, that work thing I keep avoiding, buy a birthday gift…"
          className="w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            No structure needed. Messy is perfect.
          </span>
          <button
            onClick={runExtract}
            disabled={extracting || !dump.trim()}
            className="press flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {extracting ? (
              <>
                <span className="h-2 w-2 animate-gold-dot rounded-full bg-primary-foreground" />
                Untangling your thoughts…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Break it down →
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {extractError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex items-center justify-between gap-3 overflow-hidden"
            >
              <p className="text-xs text-destructive">{extractError}</p>
              <button
                onClick={runExtract}
                className="press shrink-0 rounded-md border border-border-accent px-3 py-1.5 text-xs text-foreground hover:border-gold"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ordered output / banner */}
      <AnimatePresence>
        {bannerVisible && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="mb-5 flex items-start gap-2.5 rounded-[10px] border px-4 py-3"
            style={{ background: "#1A1500", borderColor: "#C9A84C55" }}
          >
            <Sparkle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#C9A84C" }} />
            <p className="text-[13px]" style={{ color: "#C9A84C" }}>
              {ordered.length === 1
                ? "Just one task. That's all you need to focus on."
                : "Your day is ordered. Start with #01 — it's the highest impact for the least effort."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {ordered.length === 1 && !bannerVisible && (
        <p className="mb-3 text-xs text-muted-foreground">
          Just one task. That's all you need to focus on.
        </p>
      )}

      {allHigh && (
        <p className="mb-3 text-xs text-muted-foreground">
          Everything here is high priority. You're not wrong — just pick #01 and
          start.
        </p>
      )}

      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {ordered.map((t, i) => {
            const insertDivider =
              showDivider && !dividerShown && (t.quadrant_score ?? 0) >= 3;
            if (insertDivider) dividerShown = true;
            return (
              <div key={t.id}>
                {insertDivider && (
                  <div className="my-4 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[11px] uppercase tracking-[0.12em] text-tertiary-fg">
                      Below: lower priority
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <OrderedCard
                  task={t}
                  index={i}
                  onStart={() => startFocus(t)}
                  onComplete={() => completeTask(t)}
                  onDelete={() => deleteTask.mutate(t.id)}
                />
              </div>
            );
          })}
        </AnimatePresence>

        {ordered.length === 0 && (
          <div className="card-surface flex flex-col items-center gap-2 py-12 text-center">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nothing ordered yet. Brain-dump above and I'll build your plan.
            </p>
          </div>
        )}
      </div>

      {ordered.length > 0 && (
        <button
          onClick={reRate}
          className="press mt-5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Re-rate these tasks
        </button>
      )}

      {/* Phase 2 — Rating panel */}
      <AnimatePresence>
        {panelOpen && (
          <RatingPanel
            items={items}
            ratedCount={ratedCount}
            allRated={allRated}
            saving={saveOrdered.isPending}
            onRate={setRating}
            onOrder={orderDay}
            onClose={requestClose}
            confirmClose={confirmClose}
            onConfirmDiscard={doClose}
            onCancelClose={() => setConfirmClose(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Ordered card ---------------- */
function OrderedCard({
  task,
  index,
  onStart,
  onComplete,
  onDelete,
}: {
  task: Task;
  index: number;
  onStart: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const num = String(index + 1).padStart(2, "0");
  const badgeGold = index < 2;
  const showMicro = index < 2 && task.micro_first_step;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.08 }}
      className="group flex items-start gap-3 rounded-xl border p-4"
      style={{ background: "#111111", borderColor: "#1F1E1C" }}
    >
      <div
        className={cn(
          "font-mono text-2xl leading-none tabular-nums",
          index === 0 && "animate-badge-glow rounded-md",
        )}
        style={{ color: badgeGold ? "#C9A84C" : "#3D3A37", padding: index === 0 ? "2px 4px" : 0 }}
      >
        {num}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-medium text-foreground">{task.title}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={onStart}
              className="press flex items-center gap-1 rounded-md border border-border-accent px-2.5 py-1 text-xs text-foreground transition-colors hover:border-gold hover:text-gold"
            >
              <Zap className="h-3 w-3" />
              Start
            </button>
            <button
              onClick={onComplete}
              className="press flex h-7 w-7 items-center justify-center rounded-md border border-border-accent text-muted-foreground transition-colors hover:border-gold hover:text-gold"
              title="Mark done"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px]">
          <span className="text-muted-foreground">~{task.time_estimate_mins} min</span>
          <span className="text-tertiary-fg">·</span>
          {task.priority === "HIGH" ? (
            <span
              className="rounded-full px-2 py-px text-[11px]"
              style={{
                background: "#C9A84C22",
                color: "#C9A84C",
                border: "1px solid #C9A84C44",
              }}
            >
              HIGH PRIORITY
            </span>
          ) : (
            <span
              className="rounded-full px-2 py-px text-[11px]"
              style={{ background: "#1A1A1A", color: "#7A7570" }}
            >
              LOW PRIORITY
            </span>
          )}
          <span className="text-tertiary-fg">·</span>
          <span style={{ color: task.ease === "EASY" ? "#4CAF7D" : "#7A7570" }}>
            {task.ease === "EASY" ? "EASY" : "HARD"}
          </span>
        </div>

        {showMicro && (
          <p className="mt-1.5 text-[12px] italic" style={{ color: "#C9A84C" }}>
            ▸ First: {task.micro_first_step}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ---------------- Pill toggle ---------------- */
function Pill({
  label,
  active,
  variant,
  onClick,
}: {
  label: string;
  active: boolean;
  variant: "gold" | "neutral";
  onClick: () => void;
}) {
  const style: React.CSSProperties = active
    ? variant === "gold"
      ? { background: "#C9A84C", borderColor: "#C9A84C", color: "#0A0A0A", fontWeight: 600 }
      : { background: "#252525", borderColor: "#333", color: "#F0EDE6", fontWeight: 600 }
    : { background: "#1A1A1A", borderColor: "#252525", color: "#7A7570" };
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.08 }}
      onClick={onClick}
      className="rounded-md border px-4 py-1.5 text-xs font-medium"
      style={style}
    >
      {label}
    </motion.button>
  );
}

/* ---------------- Rating panel ---------------- */
function RatingPanel({
  items,
  ratedCount,
  allRated,
  saving,
  onRate,
  onOrder,
  onClose,
  confirmClose,
  onConfirmDiscard,
  onCancelClose,
}: {
  items: RatingItem[];
  ratedCount: number;
  allRated: boolean;
  saving: boolean;
  onRate: (id: string, field: "priority" | "ease", value: string) => void;
  onOrder: () => void;
  onClose: () => void;
  confirmClose: boolean;
  onConfirmDiscard: () => void;
  onCancelClose: () => void;
}) {
  const pct = items.length ? (ratedCount / items.length) * 100 : 0;
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: "#00000088", backdropFilter: "blur(4px)" }}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%", transition: { ease: "easeIn", duration: 0.25 } }}
        transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
        className="fixed inset-x-0 bottom-0 top-0 z-50 mx-auto flex max-w-2xl flex-col"
        style={{ background: "#0F0F0F" }}
      >
        {/* drag indicator */}
        <div className="flex justify-center pt-2.5">
          <div
            style={{ width: 32, height: 3, background: "#C9A84C44", borderRadius: 999 }}
          />
        </div>

        {/* header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between"
          style={{ background: "#0F0F0F", padding: "16px 24px 12px" }}
        >
          <button
            onClick={onClose}
            className="press flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="font-display text-[20px]" style={{ color: "#F0EDE6" }}>
              Rate your tasks
            </h2>
          </div>
          <span
            className="rounded-full border px-2.5 py-1 text-[11px]"
            style={{ borderColor: "#1F1E1C", color: "#7A7570" }}
          >
            {items.length} tasks
          </span>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <p className="mb-4 text-[13px]" style={{ color: "#7A7570" }}>
            For each task — how urgent is it, and how hard will it be?
          </p>

          {items.length > 8 && (
            <p
              className="mb-3 rounded-lg border px-3 py-2 text-[12px]"
              style={{ borderColor: "#C9A84C44", color: "#C9A84C", background: "#1A1500" }}
            >
              That's a lot. Consider: which of these actually matter today?
            </p>
          )}

          {/* legend */}
          <div
            className="mb-4 flex items-center gap-4 rounded-lg border px-4 py-3"
            style={{ background: "#1A1A1A", borderColor: "#1F1E1C" }}
          >
            <LegendSq color="#C9A84C" label="High · Easy — Do First" />
            <LegendSq color="#8A6E2F" label="High · Hard — Do Second" />
            <LegendSq color="#252525" label="Low — Do Later" />
          </div>

          <div className="space-y-2.5">
            {items.map((it) => {
              const rated = !!(it.priority && it.ease);
              return (
                <div
                  key={it.id}
                  className="relative rounded-xl border"
                  style={{
                    background: "#111111",
                    borderColor: "#1F1E1C",
                    borderLeft: `4px solid ${accentColor(it)}`,
                    padding: "16px 20px",
                    transition: "border-color 200ms ease",
                  }}
                >
                  <AnimatePresence>
                    {rated && (
                      <motion.svg
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-3 top-3 h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <motion.path
                          d="M4 12l5 5L20 6"
                          stroke="#C9A84C"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      </motion.svg>
                    )}
                  </AnimatePresence>

                  <p className="pr-6 text-[15px] font-medium" style={{ color: "#F0EDE6" }}>
                    {it.title}
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: "#7A7570" }}>
                    ~{it.estimatedMinutes} min · First: {it.microStep}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
                    <div>
                      <p
                        className="mb-1.5 text-[11px] uppercase"
                        style={{ color: "#7A7570", letterSpacing: "0.06em" }}
                      >
                        Priority
                      </p>
                      <div className="flex gap-2">
                        <Pill
                          label="HIGH"
                          active={it.priority === "HIGH"}
                          variant="gold"
                          onClick={() => onRate(it.id, "priority", "HIGH")}
                        />
                        <Pill
                          label="LOW"
                          active={it.priority === "LOW"}
                          variant="neutral"
                          onClick={() => onRate(it.id, "priority", "LOW")}
                        />
                      </div>
                    </div>
                    <div>
                      <p
                        className="mb-1.5 text-[11px] uppercase"
                        style={{ color: "#7A7570", letterSpacing: "0.06em" }}
                      >
                        Ease
                      </p>
                      <div className="flex gap-2">
                        <Pill
                          label="EASY"
                          active={it.ease === "EASY"}
                          variant="gold"
                          onClick={() => onRate(it.id, "ease", "EASY")}
                        />
                        <Pill
                          label="HARD"
                          active={it.ease === "HARD"}
                          variant="neutral"
                          onClick={() => onRate(it.id, "ease", "HARD")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* sticky footer */}
        <div
          className="sticky bottom-0 z-10 border-t px-6 pb-6 pt-4"
          style={{ background: "#0F0F0F", borderColor: "#1F1E1C" }}
        >
          <div className="mb-3">
            <p className="mb-1.5 text-[12px]" style={{ color: "#7A7570" }}>
              {ratedCount} of {items.length} tasks rated
            </p>
            <div
              className="h-[3px] w-full overflow-hidden rounded-sm"
              style={{ background: "#0F0F0F", border: "1px solid #1F1E1C" }}
            >
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${pct}%`,
                  background: "#C9A84C",
                  transition: "width 300ms ease",
                }}
              />
            </div>
          </div>
          <button
            onClick={onOrder}
            disabled={!allRated || saving}
            className="press w-full rounded-lg py-3.5 text-[15px] font-semibold"
            style={{
              background: allRated && !saving ? "#C9A84C" : "#1F1E1C",
              color: allRated && !saving ? "#0A0A0A" : "#3D3A37",
              cursor: allRated && !saving ? "pointer" : "not-allowed",
              transition: "background 200ms ease, color 200ms ease",
            }}
          >
            {saving ? "Ordering…" : "Order my day →"}
          </button>
        </div>

        {/* confirm close */}
        <AnimatePresence>
          {confirmClose && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center p-6"
              style={{ background: "#000000bb" }}
            >
              <div
                className="w-full max-w-xs rounded-xl border p-5 text-center"
                style={{ background: "#111111", borderColor: "#1F1E1C" }}
              >
                <p className="text-sm" style={{ color: "#F0EDE6" }}>
                  Leave without ordering?
                </p>
                <p className="mt-1 text-xs" style={{ color: "#7A7570" }}>
                  Your ratings won't be saved.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={onCancelClose}
                    className="press flex-1 rounded-lg border border-border-accent py-2.5 text-sm text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirmDiscard}
                    className="press flex-1 rounded-lg py-2.5 text-sm font-semibold"
                    style={{ background: "#c25050", color: "#F0EDE6" }}
                  >
                    Yes, discard
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

function LegendSq({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        style={{ width: 16, height: 16, borderRadius: 4, background: color, flexShrink: 0 }}
      />
      <span className="text-[11px]" style={{ color: "#7A7570" }}>
        {label}
      </span>
    </div>
  );
}
