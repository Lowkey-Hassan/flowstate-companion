import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Sparkles, Flame, Search } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { useDailyLogs, useUpsertDailyLog, todayStr, type DailyLog } from "@/lib/data";
import { useProfile } from "@/lib/profile";
import { useOnline } from "@/hooks/use-online";
import { SLEEP_OPTIONS, MOOD_TO_WEATHER, streakStory } from "@/lib/constants";
import { weeklyLetter, correlationDiscoveries, peakProfile } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/journal")({
  head: () => ({ meta: [{ title: "Journal — FlowState" }] }),
  component: JournalPage,
});

const FOCUS_LABELS = ["Foggy", "Scattered", "Okay", "Sharp", "Laser"];
const MED_OPTIONS = ["Yes", "No", "N/A"];

function JournalPage() {
  const profile = useProfile();
  const logs = useDailyLogs();
  const upsert = useUpsertDailyLog();
  const online = useOnline();

  const letterFn = useServerFn(weeklyLetter);
  const correlationFn = useServerFn(correlationDiscoveries);
  const peakFn = useServerFn(peakProfile);

  const today = todayStr();
  const all = logs.data ?? [];
  const todayLog = all.find((l) => l.date === today);
  const entryCount = all.length;

  const [sleep, setSleep] = useState<string | null>(todayLog?.sleep_hours ?? null);
  const [mood, setMood] = useState<number | null>(todayLog?.mood_score ?? null);
  const [focus, setFocus] = useState<number | null>(todayLog?.focus_score ?? null);
  const [med, setMed] = useState<string | null>(todayLog?.medication_taken ?? null);
  const [note, setNote] = useState(todayLog?.note ?? "");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(!todayLog);

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
    setEditing(false);
    toast("Logged. Noticing is the practice.");
    setTimeout(() => setSaved(false), 2000);
  };

  /* ---- Mechanic 5: Peak You ---- */
  const [peakLines, setPeakLines] = useState<string[]>([]);
  const [peakDate, setPeakDate] = useState<string | null>(null);
  useEffect(() => {
    if (entryCount < 14 || !online) return;
    let cancelled = false;
    (async () => {
      const res = await peakFn({
        data: {
          logs: all.slice(0, 60).map((l) => ({
            date: l.date,
            sleep: l.sleep_hours,
            mood: l.mood_score,
            focus: l.focus_score,
            meds: l.medication_taken,
          })),
        },
      });
      if (!cancelled && res.lines?.length) {
        setPeakLines(res.lines);
        setPeakDate(today);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryCount >= 14, online]);

  /* ---- Mechanic 2: Weekly letter (streamed) ---- */
  const [letter, setLetter] = useState("");
  const [letterBusy, setLetterBusy] = useState(false);
  const streamRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const streamLetter = (full: string) => {
    if (streamRef.current) clearInterval(streamRef.current);
    let i = 0;
    setLetter("");
    streamRef.current = setInterval(() => {
      i++;
      setLetter(full.slice(0, i));
      if (i >= full.length && streamRef.current) clearInterval(streamRef.current);
    }, 20);
  };

  const getLetter = async () => {
    if (!online) {
      toast("You're offline. Your data is safe.");
      return;
    }
    setLetterBusy(true);
    try {
      const res = await letterFn({
        data: {
          logs: all.slice(0, 7).map((l) => ({
            date: l.date,
            sleep: l.sleep_hours,
            mood: l.mood_score,
            focus: l.focus_score,
            meds: l.medication_taken,
            note: l.note,
          })),
          name: profile.data?.name ?? "",
        },
      });
      if (res.text) streamLetter(res.text);
      else toast.error("Couldn't write your letter. Try again shortly.");
    } finally {
      setLetterBusy(false);
    }
  };

  // Auto-fetch on Mondays
  useEffect(() => {
    if (new Date().getDay() === 1 && all.length >= 3 && online && !letter) {
      getLetter();
    }
    return () => {
      if (streamRef.current) clearInterval(streamRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all.length, online]);

  /* ---- Mechanic 3: Correlation discoveries ---- */
  const [discoveries, setDiscoveries] = useState<{ discovery: string; detail: string }[]>([]);
  useEffect(() => {
    if (entryCount < 10 || !online) return;
    let cancelled = false;
    (async () => {
      const res = await correlationFn({
        data: {
          logs: all.slice(0, 30).map((l) => ({
            date: l.date,
            sleep: l.sleep_hours,
            mood: l.mood_score,
            focus: l.focus_score,
            meds: l.medication_taken,
          })),
        },
      });
      if (!cancelled && res.items?.length) setDiscoveries(res.items);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryCount >= 10, online]);

  const streak = profile.data?.streak_count ?? 0;

  // 7-day weather strip
  const last7 = useMemo(() => {
    const map = new Map(all.map((l) => [l.date, l]));
    const days: (DailyLog | null)[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.push(map.get(d) ?? null);
    }
    return days;
  }, [all]);

  return (
    <div>
      <PageTitle
        eyebrow="Check-in"
        title="How's your mind today?"
        subtitle="A 20-second snapshot. Over time, patterns appear — and patterns are power."
      />

      {/* Mechanic 5 — Peak You */}
      {entryCount >= 14 && peakLines.length > 0 && (
        <div className="mb-6 rounded-[14px] border border-gold/40 bg-[#0F0F0F] px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-gold">✦ Peak You</span>
            {peakDate && (
              <span className="text-[10px] text-[#3D3A37]">
                Updated{" "}
                {new Date(peakDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {peakLines.map((l, i) => (
              <p key={i} className="text-sm leading-relaxed text-[#D4C8B8]">
                {l}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Daily log input OR today summary */}
      {!editing && todayLog ? (
        <TodaySummary log={todayLog} onEdit={() => setEditing(true)} />
      ) : (
        <>
          <Section label="Mood">
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((score) => {
                const w = MOOD_TO_WEATHER[score];
                const Icon = w.icon;
                const on = mood === score;
                return (
                  <button
                    key={score}
                    onClick={() => setMood(score)}
                    className={cn(
                      "press flex flex-col items-center gap-1.5 rounded-lg border py-3 transition-colors",
                      on ? "border-gold/60 bg-surface-2" : "border-border bg-surface hover:border-border-accent",
                    )}
                    style={on ? { background: w.bg } : undefined}
                  >
                    <Icon className="h-5 w-5" style={{ color: w.color }} />
                    <span className="text-[10px] leading-tight text-muted-foreground">{w.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

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
        </>
      )}

      {/* Mechanic 2 — This Week in Words */}
      <div className="mt-8">
        {letter ? (
          <div className="rounded-xl border border-gold/40 bg-[#1A1500] px-6 py-5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-gold">This week in words</p>
            <p className="font-display text-[15px] italic leading-[1.8] text-[#F0EDE6]">{letter}</p>
          </div>
        ) : (
          <button
            onClick={getLetter}
            disabled={letterBusy || all.length < 3}
            className="press flex w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-surface py-3.5 text-sm text-foreground transition-colors hover:border-gold/60 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-gold" />
            {letterBusy
              ? "Writing…"
              : all.length < 3
                ? "Log a few more days for your weekly letter"
                : "Get my week in words"}
          </button>
        )}
      </div>

      {/* Mechanic 4 — Streak story */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-surface px-5 py-4">
        <Flame className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <p className="font-display text-[15px] italic text-[#F0EDE6]">{streakStory(streak)}</p>
      </div>

      {/* Mechanic 1 — 7-day weather forecast */}
      <div className="mt-8">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Last 7 days
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {last7.map((log, i) => {
            const date = new Date(Date.now() - (6 - i) * 86400000);
            const dayLabel = date.toLocaleDateString(undefined, { weekday: "narrow" });
            const w = log?.mood_score ? MOOD_TO_WEATHER[log.mood_score] : null;
            const Icon = w?.icon;
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface py-2.5"
              >
                {Icon && w ? (
                  <Icon className="h-5 w-5" style={{ color: w.color }} />
                ) : (
                  <span className="text-base text-[#3D3A37]">—</span>
                )}
                <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mechanic 3 — Correlation discoveries */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-gold" />
          <h2 className="font-display text-xl text-foreground">Discoveries</h2>
        </div>
        {entryCount < 10 ? (
          <div className="rounded-xl border border-border bg-surface px-5 py-4 text-sm text-muted-foreground">
            Discoveries emerge after 10 logs. You have {entryCount} so far.
          </div>
        ) : discoveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {online ? "Looking for patterns…" : "You're offline. Your data is safe."}
          </p>
        ) : (
          <>
            <div className="space-y-2.5">
              {discoveries.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-gold/30 bg-[#111111] px-5 py-4"
                >
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium text-gold">
                    <span>🔍</span>
                    {d.discovery}
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#D4C8B8]">{d.detail}</p>
                </motion.div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Based on your last 30 days of logs</p>
          </>
        )}
      </div>

      {/* Trends */}
      {all.length >= 3 && <Trends logs={all} />}
    </div>
  );
}

function TodaySummary({ log, onEdit }: { log: DailyLog; onEdit: () => void }) {
  const w = log.mood_score ? MOOD_TO_WEATHER[log.mood_score] : null;
  const Icon = w?.icon;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface px-5 py-4">
      {Icon && w ? (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: w.bg }}
        >
          <Icon className="h-6 w-6" style={{ color: w.color }} />
        </div>
      ) : null}
      <div className="flex-1">
        <div className="text-sm font-medium text-foreground">
          {w ? w.label : "Logged"} · Focus {log.focus_score ?? "—"}/5
        </div>
        {log.note && <p className="mt-0.5 text-xs text-muted-foreground">{log.note}</p>}
      </div>
      <button
        onClick={onEdit}
        className="press rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Edit
      </button>
    </div>
  );
}

function Trends({ logs }: { logs: DailyLog[] }) {
  // chronological, last 14
  const data = [...logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
  const maxFocus = 5;
  return (
    <div className="mt-8">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        Focus &amp; mood trend
      </p>
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-end gap-1.5" style={{ height: 90 }}>
          {data.map((l, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t bg-gold/60"
                style={{ height: `${((l.focus_score ?? 0) / maxFocus) * 70}px` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          {data.map((l, i) => {
            const w = l.mood_score ? MOOD_TO_WEATHER[l.mood_score] : null;
            const Icon = w?.icon;
            return (
              <div key={i} className="flex flex-1 justify-center">
                {Icon && w ? (
                  <Icon className="h-3.5 w-3.5" style={{ color: w.color }} />
                ) : (
                  <span className="text-[10px] text-[#3D3A37]">·</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
