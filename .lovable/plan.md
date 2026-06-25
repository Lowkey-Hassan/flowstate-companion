# 5-Slide Investor Deck (PDF)

A polished, downloadable **5-page landscape PDF** that presents all 10 deliverable types from your image, grouped into 5 themed slides. Built in FlowState's "Minimal Luxury" look (charcoal background, gold accents) so it feels on-brand when you present to investors.

## Slide grouping (all 10 items, titles only)

```
Slide 1 — DISCOVER          Research Findings · Market Insights · Competitive Analysis
Slide 2 — DEFINE THE FLOW   User Flows · Process Flows
Slide 3 — STRUCTURE         Architecture Diagrams · Wireframes
Slide 4 — DESIGN            Mockups · Storyboards
Slide 5 — BRING IT TO LIFE  Additional Visuals (full-bleed closing slide)
```

Each slide shows: a small uppercase category kicker, the deliverable title(s) set large, a thin gold divider, and a discreet slide number + "FlowState" footer. No body copy — titles only, as you asked.

## Visual direction

- **Format:** 16:9 landscape, 1920×1080-proportioned pages, print/share ready.
- **Palette:** deep charcoal background (`#14110E`), warm gold accent (`#C9A84C`), soft cream text (`#F5F0E6`), muted gray for kickers.
- **Type:** large serif/elegant display for the deliverable names, clean sans for kickers and footer — high contrast, generous whitespace.
- **Motif:** a single thin gold rule and a large faint slide number watermark repeated on every slide for cohesion.
- **Slide 1** doubles as a soft cover (slightly larger heading + subtle "Deliverables" eyebrow).

## How it's built

- Generate the PDF with Python (`reportlab`) using a reusable slide-drawing function so all 5 pages share consistent margins, footer, and accent styling.
- Output saved to `/mnt/documents/flowstate-deck.pdf` and surfaced as a downloadable artifact.
- **QA pass:** render each page to an image with `pdftoppm` and visually inspect all 5 for overflow, contrast, alignment, and spacing; fix and re-render until clean before delivering.

## Note

This is a standalone deliverable file — it won't change your FlowState app or codebase. If you'd later prefer an editable PowerPoint (`.pptx`) or an in-app slides screen instead, that's an easy switch.