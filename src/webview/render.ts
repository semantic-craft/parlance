import type { PhraseHit } from "../core/types";

export function formatSource(hit: PhraseHit): string {
  const authors = hit.creators.length
    ? hit.creators[0] + (hit.creators.length > 1 ? " et al." : "")
    : "佚名";
  const yearMatch = hit.date ? hit.date.match(/\b(19|20)\d{2}\b/) : null;
  const year = yearMatch ? yearMatch[0] : "";
  const title = hit.title ?? "<无题>";
  const venue = hit.venue ? ` · ${hit.venue}` : "";
  return `${authors}${year ? ` (${year})` : ""} — ${title}${venue}`;
}
