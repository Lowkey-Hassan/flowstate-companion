import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Check } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { useDailyLogs, useUpsertDailyLog, todayStr } from "@/lib/data";
import { useOnline } from "@/hooks/use-online";
import { MOOD_OPTIONS, SLEEP_OPTIONS } from "@/lib/constants";
import { journalInsights } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/journal")({
  head: () => ({ meta: [{ title: "Journal — FlowState" }] }),
  component: JournalPage,
});

const FOCUS_LABELS = ["Foggy", "Scattered", "Okay", "Sharp", "Laser"];
const MED_OPTIONS = ["Yes", "No", "N/A"];

function JournalPage() {
  const logs = useDailyLogs();
  const upsert = useUpsertDailyLog();
  const online = useOnline();
  const insightsFn = useServerFn(journalInsights);

  const today = todayStr();
  const todayLog = (logs.data ?? []).find((l) => l.date === today);

  const [sleep, setSleep] = useState<string | null>(todayLog?.sleep_hours ?? null);
  const [mood, setMood] = useState<number | null>(todayLog?.mood_score ?? null);
  const [focus, setFocus] = useState<number | null>(todayLog?.focus_score ?? null);
  const [med, setMed] = useState<string | null>(todayLog?.medication_taken ?? null);
  const [note, setNote] = useState(todayLog?.note ?? "");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await upsert.mutateAsync({
      date: today,
      sleep_hours: sleep,
      mood_score: mood,
      focus_score: focus,
      medication_taken: med,
      note: note.trim() || null,
    });
    setSaved(true);
    toast("Logged. Noticing is the practice.");
    setTimeout(() => setSaved(false), 2000);
  };

  const insights = useQuery({
    queryKey: ["insights", (logs.data ?? []).length],
    enabled: online && (logs.data ?? []).length >= 3,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const res = await insightsFn({
        data: {
          logs: (logs.data ?? []).slice(0, 30).map((l) => ({
            date: l.date,
            sleep: l.sleep_hours,
            mood: l.mood_score,
            focus: l.focus_score,
            meds: l.medication_taken,
          })),
        },
      });
      return res.points ?? [];
    },
  });

  return (
    <div>
      <PageTitle
        eyebrow="Check-in"
        title="How's your brain today?"
        subtitle="A 20-second snapshot. Over time, patterns appear — and patterns are power."
      />

      {/* Mood */}
      <Section label="Mood">
        <div className="grid grid-cols-5 gap-2">
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m.score}
              onClick={() => setMood(m.score)}
              className={cn(
                "press rounded-lg border py-3 text-center transition-colors",
                mood === m.score
                  ? "border-gold/60 bg-surface-2"
                  : "border-border bg-surface hover:border-border-accent",
              )}
            >
              <span
                className="mx-auto mb-1.5 block h-2.5 w-2.5 rounded-full"
                style={{ background: m.color }}
              />
              <span className="text-[10px] leading-tight text-muted-foreground">
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* Focus */}
      <Section label="Focus">
        <div className="grid grid-cols-5 gap-2">
          {FOCUS_LABELS.map((f, i) => (
            <button
              key={f}
              onClick={() => setFocus(i + 1)}
              className={cn(
                "press rounded-lg border py-3 text-center text-[11px] transition-colors",
                focus === i + 1
                  ? "border-gold/60 bg-surface-2 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-accent",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </Section>

      {/* Sleep */}
      <Section label="Sleep">
        <div className="flex flex-wrap gap-2">
          {SLEEP_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSleep(s)}
              className={cn(
                "press rounded-lg border px-4 py-2 text-sm transition-colors",
                sleep === s
                  ? "border-gold/60 bg-surface-2 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-accent",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      {/* Medication */}
      <Section label="Medication">
        <div className="flex gap-2">
          {MED_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setMed(m)}
              className={cn(
                "press flex-1 rounded-lg border py-2 text-sm transition-colors",
                med === m
                  ? "border-gold/60 bg-surface-2 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-accent",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </Section>

      {/* Note */}
      <Section label="Anything else? (optional)">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="A word, a feeling, a win, a mess…"
          className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-gold/60"
        />
      </Section>

      <button
        onClick={save}
        disabled={upsert.isPending}
        className="press flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saved ? <Check className="h-4 w-4" /> : null}
        {saved ? "Saved" : "Save today's check-in"}
      </button>

      {/* Insights */}
      <div className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <h2 className="font-display text-xl text-foreground">Patterns</h2>
        </div>
        {(logs.data ?? []).length < 3 ? (
          <p className="text-sm text-muted-foreground">
            Check in a few more days and I'll start surfacing what affects your
            focus and mood.
          </p>
        ) : insights.isLoading ? (
          <p className="text-sm text-muted-foreground">Looking for patterns…</p>
        ) : (insights.data ?? []).length ? (
          <div className="space-y-2.5">
            {insights.data!.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="card-surface border-l-2 border-l-gold/60 p-4 text-sm text-foreground"
              >
                {p}
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {online
              ? "No clear patterns yet — keep going."
              : "You're offline. Your data is safe."}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
