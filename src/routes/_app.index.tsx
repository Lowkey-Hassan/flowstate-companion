import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, Flame, CheckSquare, Repeat, ArrowRight } from "lucide-react";
import { useProfile, useUpdateProfile, traitsOf } from "@/lib/profile";
import {
  useTasks,
  useHabits,
  useHabitLogs,
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
  const habits = useHabits();
  const logs = useHabitLogs();
  const online = useOnline();
  const greetingFn = useServerFn(getGreeting);

  const name = profile.data?.name;
  const part = partOfDay();

  // Streak maintenance — once per day.
  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    const today = todayStr();
    if (p.last_active_date === today) return;
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);
    const next =
      p.last_active_date === yesterday ? (p.streak_count || 0) + 1 : 1;
    updateProfile.mutate({ last_active_date: today, streak_count: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.data?.id]);

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
  const habitCount = habits.data?.length ?? 0;
  const habitsDone =
    logs.data?.filter((l) => l.is_complete).length ?? 0;

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

      {/* Streak */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="card-surface mb-4 flex items-center gap-4 p-5"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
          <Flame className="h-5 w-5 text-gold" />
        </div>
        <div>
          <div className="font-display text-2xl text-foreground">
            {profile.data?.streak_count ?? 0}
            <span className="ml-1.5 text-sm font-sans text-muted-foreground">
              day{(profile.data?.streak_count ?? 0) === 1 ? "" : "s"} showing up
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Not perfect. Present. That's the whole game.
          </p>
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
              <Zap className="h-5 w-5 text-gold" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Start a focus session
              </div>
              <div className="text-xs text-muted-foreground">
                One block. That's all you need to decide right now.
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
          to="/habits"
          icon={<Repeat className="h-4 w-4 text-gold" />}
          value={`${habitsDone}/${habitCount}`}
          label="rituals today"
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
              How's your brain today?
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
