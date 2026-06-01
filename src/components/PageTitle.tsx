import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PageTitle({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-8 flex items-end justify-between gap-4"
    >
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.18em] text-gold">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </motion.div>
  );
}
