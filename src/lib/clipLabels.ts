// Friendly names for the clip labels the worker creates.
//   hit_02 -> "Hit #2", swing_03 -> "Swing #3", maybe_04 -> "Possible hit #4", full_clip -> "Full video",
//   part_004 -> "Part 4", moment_01 -> "Moment 1", segment_007 -> "Segment 7" (older uploads)
export function clipTitle(label?: string | null): string {
  if (!label) return "Clip";
  if (label === "full_clip") return "Full video";
  const m = label.match(/^(hit|swing|maybe|part|moment|segment)_0*(\d+)$/);
  if (!m) return label;
  const n = Number(m[2]);
  switch (m[1]) {
    case "hit": return `Hit #${n}`;
    case "swing": return `Swing #${n}`;
    case "maybe": return `Possible hit #${n}`;
    case "part": return `Part ${n}`;
    case "moment": return `Moment ${n}`;
    default: return `Segment ${n}`;
  }
}

type ClipLike = { label?: string | null; is_hit?: boolean | null; is_swing?: boolean | null };

export function clipStatus(c: ClipLike): string {
  if (c.label === "full_clip" || c.label?.startsWith("part_")) return "🎬 Full footage";
  if (c.is_hit === true) return "✅ Hit";
  if (c.is_hit == null && c.label?.startsWith("maybe_")) return "❓ Possible hit, please check";
  if (c.is_swing === true) return "⚾ Swing, not a hit";
  if (c.is_hit === false) return "❌ Not a hit";
  return "🤷 Unscored";
}
