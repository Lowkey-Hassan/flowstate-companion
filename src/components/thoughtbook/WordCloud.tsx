import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CloudWord } from "@/lib/data";
import {
  CATEGORY_LABELS,
  categoryToColor,
  importanceToFontSize,
} from "@/lib/thoughtbook";

export function WordCloud({
  words,
  minHeight = 180,
  stagger = 0.04,
  showLegend = true,
}: {
  words: CloudWord[];
  minHeight?: number;
  stagger?: number;
  showLegend?: boolean;
}) {
  const isMobile = useIsMobile();
  const scale = isMobile ? 0.82 : 1;

  const categoriesPresent = Array.from(new Set(words.map((w) => w.category)));

  return (
    <div>
      <div
        className="flex flex-wrap items-center justify-center"
        style={{
          gap: "10px 14px",
          padding: "28px 20px",
          minHeight,
        }}
      >
        {words.map((w, i) => {
          const color = categoryToColor(w.category);
          return (
            <motion.span
              key={`${w.word}-${i}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * stagger }}
              style={{
                fontSize: importanceToFontSize(w.importance, scale),
                color,
                background: `${color}11`,
                padding: "4px 8px",
                borderRadius: 4,
                fontWeight: 500,
                fontFamily: "var(--font-sans)",
                lineHeight: 1.1,
                cursor: "default",
              }}
            >
              {w.word}
            </motion.span>
          );
        })}
      </div>

      {showLegend && categoriesPresent.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1">
          {categoriesPresent.map((cat) => (
            <span
              key={cat}
              className="flex items-center gap-1.5"
              style={{ fontSize: 11, color: "#7A7570" }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: categoryToColor(cat),
                  display: "inline-block",
                }}
              />
              {CATEGORY_LABELS[cat] ?? cat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
