import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, CheckSquare, ArrowRight, Puzzle, BookOpen } from "lucide-react";
import { useProfile, useUpdateProfile, traitsOf } from "@/lib/profile";
import {
  useTasks,
  useChessGames,
  useDailyLogs,
  todayStr,
} from "@/lib/data";
import { useOnline } from "@/hooks/use-online";
import { partOfDay } from "@/lib/constants";
import { getGreeting } from "@/lib/ai.functions";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Today — FlowState" }] }),
  component: Home,
});

function Home() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const tasks = useTasks();
  const chess = useChessGames();
  const logs = useDailyLogs();
  const online = useOnline();
  const greetingFn = useServerFn(getGreeting);

  const name = profile.data?.name;
  const part = partOfDay();
  const today = todayStr();

  // --- Daily contributors (1% progress ring) ---
  const chessToday = (chess.data ?? []).some(
    (g) => g.created_at.slice(0, 10) === today && g.duration_seconds >= 300,
  );
  const tasksToday = (tasks.data ?? []).some(
    (t) => t.is_complete && (t.completed_at ?? "").slice(0, 10) === today,
  );
  const journalToday = (logs.data ?? []).some((l) => l.date === today);

  const progress =
    (chessToday ? 34 : 0) + (tasksToday ? 33 : 0) + (journalToday ? 33 : 0);
  const activeToday = chessToday || tasksToday || journalToday;

  // Streak maintenance — only counts a day with real activity.
  useEffect(() => {
    const p = profile.data;
    if (!p || !activeToday) return;
    if (p.last_active_date === today) return;
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);
    const next =
      p.last_active_date === yesterday ? (p.streak_count || 0) + 1 : 1;
    updateProfile.mutate({ last_active_date: today, streak_count: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.data?.id, activeToday]);

  const greeting = useQuery({
    queryKey: ["greeting", part, profile.data?.id],
    enabled: !!profile.data && online,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const res = await greetingFn({
        data: { partOfDay: part, traits: traitsOf(profile.data) },
      });
      return res.text || "";
    },
  });

  const openTasks = (tasks.data ?? []).filter((t) => !t.is_complete).length;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-9"
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
          Good {part}
        </p>
        <h1 className="mt-1.5 font-display text-4xl tracking-tight text-foreground md:text-5xl">
          {name ? name : "Welcome back"}.
        </h1>
        <p className="mt-3 min-h-[1.25rem] max-w-xl text-sm text-muted-foreground">
          {greeting.data
            ? greeting.data
            : online
              ? "Taking a breath with you…"
              : "You're offline. Your data is safe."}
        </p>
      </motion.div>

      {/* Streak + 1% ring */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="card-surface mb-4 flex items-center gap-5 p-5"
      >
        <ProgressRing value={progress} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-gold" />
            <span className="font-display text-2xl text-foreground">
              {profile.data?.streak_count ?? 0}
            </span>
            <span className="text-sm text-muted-foreground">
              day{(profile.data?.streak_count ?? 0) === 1 ? "" : "s"} showing up
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Today's 1%: {progress}% complete. Not perfect — present.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            <Contributor on={chessToday} label="Chess" />
            <Contributor on={tasksToday} label="Tasks" />
            <Contributor on={journalToday} label="Journal" />
          </div>
        </div>
      </motion.div>

      {/* Primary action */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Link
          to="/focus"
          className="press group mb-4 flex items-center justify-between rounded-xl border border-gold/30 bg-gradient-to-br from-surface-2 to-surface p-5 transition-colors hover:border-gold/60"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
              <Puzzle className="h-5 w-5 text-gold" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Play a chess game
              </div>
              <div className="text-xs text-muted-foreground">
                Every move is a decision. Sit down and think clearly.
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>

      {/* Snapshot grid */}
      <div className="grid grid-cols-2 gap-4">
        <SnapshotCard
          to="/tasks"
          icon={<CheckSquare className="h-4 w-4 text-gold" />}
          value={openTasks}
          label={openTasks === 1 ? "task waiting" : "tasks waiting"}
          delay={0.15}
        />
        <SnapshotCard
          to="/journal"
          icon={<BookOpen className="h-4 w-4 text-gold" />}
          value={journalToday ? "Done" : "—"}
          label="check-in today"
          delay={0.2}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4"
      >
        <Link
          to="/journal"
          className="card-surface card-interactive flex items-center justify-between p-5"
        >
          <div>
            <div className="text-sm font-medium text-foreground">
              How's your mind today?
            </div>
            <div className="text-xs text-muted-foreground">
              A 20-second check-in. No streak to protect — just notice.
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </motion.div>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--border-accent)"
          strokeWidth="4"
        />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 0.6 }}
        />
      </svg>
      <span className="absolute font-mono text-xs text-foreground">
        {value}%
      </span>
    </div>
  );
}

function Contributor({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={
        on
          ? "rounded-full border border-gold/50 bg-surface-2 px-2 py-0.5 text-gold"
          : "rounded-full border border-border px-2 py-0.5 text-muted-foreground"
      }
    >
      {on ? "✓ " : ""}
      {label}
    </span>
  );
}

function SnapshotCard({
  to,
  icon,
  value,
  label,
  delay,
}: {
  to: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link
        to={to}
        className="card-surface card-interactive flex h-full flex-col justify-between gap-6 p-5"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2">
          {icon}
        </div>
        <div>
          <div className="font-display text-2xl text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </Link>
    </motion.div>
  );
}
