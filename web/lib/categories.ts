import type { Posting } from "./types";

// The role buckets the feed filters by.
//
// Simplify ships a `category` field, but it's coarser than what's useful
// here: it lumps AI/ML and Data Science into a single "AI/ML/Data" bucket.
// Those are different jobs to apply for, so that one category gets split by
// title, and everything else maps straight across.

export const CATEGORIES = [
  "Software",
  "AI/ML",
  "Data Science",
  "Quant",
  "Product",
  "Hardware",
] as const;

export type Category = (typeof CATEGORIES)[number];

const DATA_SCIENCE = /data scien|data analy|data engineer|analytics|business intell|statistic/i;
const AI_ML = /machine learning|deep learning|\bml\b|\bai\b|artificial intelligence|llm|nlp|computer vision|perception|research scien/i;

/**
 * The bucket a posting belongs to, or null when Simplify gave it no
 * category at all (those stay visible under every filter rather than being
 * silently unreachable).
 */
export function categoryOf(posting: Posting): Category | null {
  const raw = (posting.category || "").toLowerCase();

  if (raw.includes("quant")) return "Quant";
  if (raw.includes("hardware")) return "Hardware";
  if (raw.includes("product")) return "Product";
  if (raw.includes("software")) return "Software";

  if (raw.includes("ai") || raw.includes("data") || raw.includes("ml")) {
    const title = posting.title;
    if (DATA_SCIENCE.test(title)) return "Data Science";
    if (AI_ML.test(title)) return "AI/ML";
    // Titles that match neither pattern sit in the larger of the two
    // buckets rather than vanishing from both.
    return "AI/ML";
  }

  return null;
}
