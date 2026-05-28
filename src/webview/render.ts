import type { PhraseHit } from "../core/types";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Returns an UNESCAPED string; callers must escapeHtml() before HTML insertion. */
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

export function renderHits(hits: PhraseHit[]): string {
  if (hits.length === 0) {
    return `<div class="empty">没有找到相近表达。换个说法,或先运行 <code>zsearch sync</code>。</div>`;
  }
  return hits
    .map((h, i) => {
      const snippet = escapeHtml(h.snippet);
      const source = escapeHtml(formatSource(h));
      const key = escapeHtml(h.key);
      return `
    <div class="hit">
      <div class="hit-head">
        <span class="rank">${i + 1}</span>
        <span class="dist">距离 ${h.distance.toFixed(3)}</span>
      </div>
      <blockquote class="snippet">${snippet}</blockquote>
      <div class="source">${source}</div>
      <div class="actions">
        <button class="copy-btn" data-copy="${snippet}">复制</button>
        <button class="jump-btn" data-key="${key}">跳 Zotero</button>
      </div>
    </div>`;
    })
    .join("\n");
}
