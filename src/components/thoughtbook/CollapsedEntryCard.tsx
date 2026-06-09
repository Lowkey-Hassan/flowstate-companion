import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ThoughtEntryView } from "./ThoughtEntryView";
import type { ThoughtEntry } from "@/lib/data";
import { toneColor, formatEntryTime, truncate } from "@/lib/thoughtbook";

export function CollapsedEntryCard({
  entry,
  onToggleSave,
  onDelete,
}: {
  entry: ThoughtEntry;
  onToggleSave?: (next: boolean) => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const tones = entry.tones ?? [];

  return (
    <div
      style={{
        background: "#111111",
        border: "1px solid #1F1E1C",
        borderRadius: 12,
        padding: open ? "16px 18px" : "14px 18px",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="block w-full text-left"
      >
        <p style={{ fontSize: 14, color: "#D4C8B8", fontStyle: "italic", lineHeight: 1.5 }}>
          {entry.crystallized
            ? `"${truncate(entry.crystallized, 70)}"`
            : truncate(entry.raw_thought, 70)}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="flex flex-wrap items-center gap-1.5">
            {tones.slice(0, 3).map((t, i) => (
              <span
                key={t + i}
                className="flex items-center gap-1 capitalize"
                style={{ fontSize: 11, color: "#7A7570" }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: toneColor(t),
                    display: "inline-block",
                  }}
                />
                {t}
              </span>
            ))}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#3D3A37" }}>
            {formatEntryTime(entry.created_at)}
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-[#1A1A1A] pt-4">
              <ThoughtEntryView
                entry={entry}
                onToggleSave={onToggleSave}
                onDelete={onDelete}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
