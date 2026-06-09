import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { WordCloud } from "./WordCloud";
import type { ThoughtEntry } from "@/lib/data";
import { wordCloudOf } from "@/lib/data";
import { toneColor, formatEntryTime } from "@/lib/thoughtbook";
import { cn } from "@/lib/utils";

const BULLET_COLORS = ["#C9A84C", "#5DCAA5", "#E24B4A", "#AFA9EC"];

function useTypewriter(text: string, enabled: boolean) {
  const [shown, setShown] = useState(enabled ? "" : text);
  // Stream characters when enabled.
  useState(() => {
    if (!enabled || !text) {
      setShown(text);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  });
  return shown;
}

export function ThoughtEntryView({
  entry,
  animateReveal = false,
  onToggleSave,
  onDelete,
}: {
  entry: ThoughtEntry;
  animateReveal?: boolean;
  onToggleSave?: (next: boolean) => void;
  onDelete?: () => void;
}) {
  const cloud = wordCloudOf(entry);
  const crystallized = useTypewriter(entry.crystallized ?? "", animateReveal);
  const tones = entry.tones ?? [];
  const breakdown = entry.breakdown ?? [];

  const copyCrystallized = () => {
    if (!entry.crystallized) return;
    navigator.clipboard?.writeText(entry.crystallized);
    toast.success("Copied");
  };

  const confirmDelete = () => {
    if (window.confirm("Remove this thought from your book?")) onDelete?.();
  };

  return (
    <motion.div
      initial={animateReveal ? { opacity: 0, y: -20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="divide-y divide-[#1A1A1A]"
    >
      {/* Section A — Word cloud */}
      {cloud.length > 0 && (
        <section className="pb-5">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Word cloud
          </p>
          <WordCloud words={cloud} />
        </section>
      )}

      {/* Section B — Crystallized thought */}
      {entry.crystallized && (
        <section className="pb-5 pt-6">
          <p className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-gold">
            <span>✦ Crystallized thought</span>
            <button
              aria-label={entry.is_saved ? "Remove bookmark" : "Bookmark thought"}
              onClick={() => onToggleSave?.(!entry.is_saved)}
            >
              <motion.span
                whileTap={{ scale: 1.3 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                <Bookmark
                  className={cn(
                    "h-4 w-4 transition-colors",
                    entry.is_saved
                      ? "fill-gold text-gold"
                      : "text-muted-foreground hover:text-gold",
                  )}
                />
              </motion.span>
            </button>
          </p>
          <p
            className="mt-4 font-display italic"
            style={{
              fontSize: 20,
              color: "#F0EDE6",
              lineHeight: 1.6,
              borderLeft: "2px solid #C9A84C44",
              paddingLeft: 16,
              marginLeft: 4,
            }}
          >
            {crystallized}
          </p>
        </section>
      )}

      {/* Section C — Tones */}
      {tones.length > 0 && (
        <section className="pb-5 pt-5">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Emotional tone
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tones.map((t, i) => {
              const c = toneColor(t);
              return (
                <motion.span
                  key={t + i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    background: `${c}15`,
                    border: `1px solid ${c}33`,
                    color: c,
                    borderRadius: 20,
                    padding: "3px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </motion.span>
              );
            })}
          </div>
        </section>
      )}

      {/* Section D — Breakdown */}
      {breakdown.length > 0 && (
        <section className="pb-5 pt-5">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            What you're actually saying
          </p>
          <ul className="mt-3 space-y-2.5">
            {breakdown.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className="mt-1.5 inline-block shrink-0"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: BULLET_COLORS[i % BULLET_COLORS.length],
                  }}
                />
                <span style={{ fontSize: 13, color: "#D4C8B8", lineHeight: 1.6 }}>
                  {b}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Section E — Hidden question */}
      {entry.hidden_question && (
        <section className="pb-5 pt-5">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            The question hiding in this thought
          </p>
          <div
            className="mt-3"
            style={{
              background: "#1A1500",
              border: "1px solid #C9A84C22",
              borderRadius: 10,
              padding: "14px 18px",
            }}
          >
            <p
              className="font-display italic"
              style={{ fontSize: 16, color: "#C9A84C", lineHeight: 1.5 }}
            >
              {entry.hidden_question}
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4">
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#3D3A37" }}>
          {formatEntryTime(entry.created_at)}
        </span>
        <div className="flex items-center gap-1">
          {onDelete && (
            <button
              aria-label="Delete entry"
              onClick={confirmDelete}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            aria-label="Copy crystallized thought"
            onClick={copyCrystallized}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
