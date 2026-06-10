import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, BookOpen, ArrowLeft, BrainCircuit, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { PageTitle } from "@/components/PageTitle";
import { WordCloud } from "@/components/thoughtbook/WordCloud";
import { ThoughtEntryView } from "@/components/thoughtbook/ThoughtEntryView";
import { CollapsedEntryCard } from "@/components/thoughtbook/CollapsedEntryCard";
import {
  useThoughtEntries,
  useAddThoughtEntry,
  useUpdateThoughtEntry,
  useDeleteThoughtEntry,
  useThoughtChapters,
  useSaveChapters,
  type ThoughtEntry,
  type DetectedChapter,
} from "@/lib/data";
import { useProfile, traitsOf } from "@/lib/profile";
import { useOnline } from "@/hooks/use-online";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { analyzeThought, detectChapters } from "@/lib/ai.functions";
import { buildMasterCloud, formatNowTime, romanNumeral } from "@/lib/thoughtbook";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/thoughtbook")({
  head: () => ({ meta: [{ title: "ThoughtBook — FlowState" }] }),
  component: ThoughtBookPage,
});

const AUTOSAVE_KEY = "flowstate-thought-draft";
const MIN_PROCESS_MS = 1500;

/* ------------------------------------------------------------------ */

function ThoughtBookPage() {
  const entriesQ = useThoughtEntries();
  const chaptersQ = useThoughtChapters();
  const addEntry = useAddThoughtEntry();
  const updateEntry = useUpdateThoughtEntry();
  const deleteEntry = useDeleteThoughtEntry();
  const saveChapters = useSaveChapters();
  const profile = useProfile();
  const online = useOnline();

  const analyzeFn = useServerFn(analyzeThought);
  const detectFn = useServerFn(detectChapters);

  const entries = entriesQ.data ?? [];
  const chapters = chaptersQ.data ?? [];

  /* ---------- Draft ---------- */
  const [draft, setDraft] = useState(() => {
    try {
      return localStorage.getItem(AUTOSAVE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, draftRef.current);
      } catch {}
    }, 3000);
    return () => clearInterval(id);
  }, []);

  /* ---------- Crystallize flow ---------- */
  const [phase, setPhase] = useState<"idle" | "processing" | "result">("idle");
  const [latestEntry, setLatestEntry] = useState<ThoughtEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const crystallize = async () => {
    const raw = draft.trim();
    if (!raw) return;
    if (!online) {
      setError("offline");
      return;
    }
    setError(null);
    setPhase("processing");
    const start = performance.now();

    try {
      const name = profile.data?.name ?? undefined;
      const traits = traitsOf(profile.data);
      const res = await analyzeFn({ data: { thought: raw, name, traits } });

      if ((res as any).error) {
        const msg = (res as any).error as string;
        if (msg === "RATE_LIMIT") setError("rate-limit");
        else if (msg === "CREDITS") setError("credits");
        else setError("generic");
        setPhase("idle");
        return;
      }

      const created = await addEntry.mutateAsync({
        raw_thought: raw,
        crystallized: res.crystallized || null,
        hidden_question: res.hiddenQuestion || null,
        tones: res.tones ?? [],
        breakdown: res.breakdown ?? [],
        word_cloud_data: (res.wordCloudData ?? []) as any,
      });

      // Minimum processing time for feel
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, MIN_PROCESS_MS - elapsed);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

      setLatestEntry(created);
      setDraft("");
      try {
        localStorage.removeItem(AUTOSAVE_KEY);
      } catch {}
      setPhase("result");
    } catch (e: any) {
      console.error(e);
      setError("generic");
      setPhase("idle");
    }
  };

  /* ---------- Chapters ---------- */
  const [detecting, setDetecting] = useState(false);
  const [view, setView] = useState<"timeline" | "chapters" | "mind">("timeline");

  const runDetectChapters = async () => {
    if (!online || entries.length < 2) return;
    setDetecting(true);
    try {
      const payload = entries
        .filter((e) => !!e.crystallized)
        .map((e) => ({
          id: e.id,
          crystallized: e.crystallized!,
          tones: e.tones ?? [],
        }));
      const res = await detectFn({ data: { entries: payload } });
      const detected: DetectedChapter[] = (res.chapters ?? []).map((c: any) => ({
        name: String(c.name ?? ""),
        theme: String(c.theme ?? ""),
        entryIds: Array.isArray(c.entryIds) ? c.entryIds.map(String) : [],
      }));
      await saveChapters.mutateAsync(detected);
      setView("chapters");
      toast("Chapters assembled");
    } catch (e: any) {
      console.error(e);
      toast.error("Couldn't assemble chapters. Try again in a moment.");
    } finally {
      setDetecting(false);
    }
  };

  /* ---------- Helpers ---------- */
  const entriesByChapter = (chapterId: string) =>
    entries.filter((e) => e.chapter_id === chapterId);

  const unsavedEntries = entries.filter((e) => !e.chapter_id);

  const masterCloud = buildMasterCloud(entries);

  /* ---------- Render ---------- */
  const hasEntries = entries.length > 0;

  return (
    <div>
      <PageTitle
        eyebrow="Private space"
        title="ThoughtBook"
        subtitle="Dump what’s in your head. I’ll find the shape beneath it."
      />

      {/* -------- Input card -------- */}
      {phase !== "result" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <div
            className={cn(
              "rounded-xl border p-4 transition-colors md:p-5",
              phase === "processing"
                ? "border-gold/30 bg-surface"
                : "border-border bg-surface",
            )}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={phase === "processing"}
              rows={6}
              placeholder="Just start typing. Whatever is looping in your head right now — no filter, no structure."
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-tertiary-fg">
                {draft.length > 0 ? `${draft.length} characters` : "Autosaving every 3 seconds"}
              </span>
              <button
                onClick={crystallize}
                disabled={phase === "processing" || !draft.trim()}
                className="press flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {phase === "processing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {phase === "processing" ? "Crystallizing…" : "Crystallize"}
              </button>
            </div>
          </div>

          {/* Errors */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error === "offline" && "You're offline right now. Your thought is safe — try again when you're back."}
                  {error === "rate-limit" && "I'm a little busy right now. Give me a few seconds and try again."}
                  {error === "credits" && "The AI service is temporarily unavailable. Your thought was saved — I'll analyze it when service returns."}
                  {error === "generic" && "Something went wrong while crystallizing. Your raw thought was saved so you won't lose it."}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* -------- Result card -------- */}
      <AnimatePresence>
        {phase === "result" && latestEntry && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="mb-10"
          >
            <div className="rounded-xl border border-border bg-surface p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-gold">
                  Crystallized thought
                </p>
                <button
                  onClick={() => {
                    setPhase("idle");
                    setLatestEntry(null);
                  }}
                  className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Close
                </button>
              </div>
              <ThoughtEntryView
                entry={latestEntry}
                animateReveal
                onToggleSave={(next) =>
                  updateEntry.mutate({ id: latestEntry.id, patch: { is_saved: next } })
                }
                onDelete={() => {
                  deleteEntry.mutate(latestEntry.id);
                  setPhase("idle");
                  setLatestEntry(null);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------- Tabs -------- */}
      {hasEntries && (
        <div className="mb-5 flex items-center gap-1">
          {([
            { key: "timeline", label: "Timeline" },
            { key: "chapters", label: "Chapters" },
            { key: "mind", label: "Your Mind" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                view === t.key
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* -------- Timeline -------- */}
      {view === "timeline" && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <CollapsedEntryCard
              key={entry.id}
              entry={entry}
              onToggleSave={(next) =>
                updateEntry.mutate({ id: entry.id, patch: { is_saved: next } })
              }
              onDelete={() => deleteEntry.mutate(entry.id)}
            />
          ))}
          {!hasEntries && (
            <EmptyState
              icon={<BookOpen className="h-6 w-6 text-muted-foreground" />}
              title="Your book is waiting for its first thought"
              subtitle="There’s no wrong way to start. Messy, angry, scattered — it all belongs here."
            />
          )}
        </div>
      )}

      {/* -------- Chapters -------- */}
      {view === "chapters" && (
        <div className="space-y-8">
          {chapters.length === 0 && entries.length >= 5 && (
            <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                You have {entries.length} thoughts. Ready to see the chapters?
              </p>
              <button
                onClick={runDetectChapters}
                disabled={detecting}
                className="press inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {detecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {detecting ? "Assembling…" : "Detect chapters"}
              </button>
            </div>
          )}

          {chapters.length === 0 && entries.length < 5 && (
            <EmptyState
              icon={<BookOpen className="h-6 w-6 text-muted-foreground" />}
              title="Chapters appear after a few entries"
              subtitle="Write a few more thoughts and I'll start grouping them into themes."
            />
          )}

          {chapters.map((ch, i) => (
            <div key={ch.id}>
              <div className="mb-3 flex items-baseline gap-3">
                <span
                  className="font-mono text-xs text-gold"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {romanNumeral(i + 1)}
                </span>
                <h3 className="font-display text-xl text-foreground">{ch.name}</h3>
              </div>
              {ch.theme && (
                <p className="mb-4 text-sm text-muted-foreground">{ch.theme}</p>
              )}
              <div className="space-y-3">
                {entriesByChapter(ch.id).map((entry) => (
                  <CollapsedEntryCard
                    key={entry.id}
                    entry={entry}
                    onToggleSave={(next) =>
                      updateEntry.mutate({ id: entry.id, patch: { is_saved: next } })
                    }
                    onDelete={() => deleteEntry.mutate(entry.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {unsavedEntries.length > 0 && (
            <div className="pt-4">
              <h3 className="mb-3 font-display text-lg text-foreground">Loose thoughts</h3>
              <div className="space-y-3">
                {unsavedEntries.map((entry) => (
                  <CollapsedEntryCard
                    key={entry.id}
                    entry={entry}
                    onToggleSave={(next) =>
                      updateEntry.mutate({ id: entry.id, patch: { is_saved: next } })
                    }
                    onDelete={() => deleteEntry.mutate(entry.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------- Your Mind -------- */}
      {view === "mind" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {masterCloud.length > 0 ? (
            <div className="rounded-xl border border-border bg-surface p-5 md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-gold" />
                <h3 className="font-display text-xl text-foreground">Your Mind</h3>
              </div>
              <p className="mb-6 text-sm text-muted-foreground">
                The words that keep showing up — sized by how central they are to everything you've written.
              </p>
          <WordCloud
            words={masterCloud.map((w) => ({
              word: w.word,
              importance: w.masterImportance,
              category: w.dominantCategory,
            }))}
            minHeight={220}
            stagger={0.03}
          />
            </div>
          ) : (
            <EmptyState
              icon={<BrainCircuit className="h-6 w-6 text-muted-foreground" />}
              title="Not enough words yet"
              subtitle="Crystallize a few more thoughts and a map of your mind will appear here."
            />
          )}
        </motion.div>
      )}

      {/* -------- Back to writing from result -------- */}
      {phase === "result" && (
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setPhase("idle");
              setLatestEntry(null);
            }}
            className="press inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Add another thought
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface py-12 text-center">
      <div className="mb-3">{icon}</div>
      <p className="max-w-xs text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
