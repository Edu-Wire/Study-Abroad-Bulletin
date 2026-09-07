const CATEGORY_LABELS = {
  UNIVERSITIES: "Universities",
  ADMISSIONS: "Admissions",
  SCHOLARSHIPS: "Scholarships",
  VISA: "Visa",
  STUDENT_LIFE: "Student Life",
  CAREER: "Career",
  GUIDES: "Guides",
};

const CATEGORY_COLORS = {
  UNIVERSITIES: "#2563eb",
  ADMISSIONS: "#7c3aed",
  SCHOLARSHIPS: "#059669",
  VISA: "#dc2626",
  STUDENT_LIFE: "#d97706",
  CAREER: "#0891b2",
  GUIDES: "#4f46e5",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain-text article body -> paragraph tags, same convention the public site uses. */
function contentToParagraphs(content) {
  if (!content) return "";
  return content
    .replace(/<\/?(p|div|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n");
}

function tocRow(article, index) {
  const category = CATEGORY_LABELS[article.category] || article.category || "Uncategorized";
  const color = CATEGORY_COLORS[article.category] || "#6b7280";
  return `
    <a class="toc-row" href="#article-${index}">
      <span class="toc-num">${String(index + 1).padStart(2, "0")}</span>
      <span class="toc-text">
        <span class="toc-badge" style="background:${color}1a;color:${color};">${escapeHtml(category)}</span>
        <span class="toc-headline">${escapeHtml(article.headline)}</span>
      </span>
      <span class="toc-chevron" aria-hidden="true">→</span>
    </a>`;
}

function articleCard(article, index) {
  const category = CATEGORY_LABELS[article.category] || article.category || "Uncategorized";
  const color = CATEGORY_COLORS[article.category] || "#6b7280";
  const country = article.primaryCountryId
    ? escapeHtml(article.primaryCountryId.replace(/\b\w/g, (c) => c.toUpperCase()))
    : null;
  const date = article.createdAt
    ? new Date(article.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return `
    <details class="card" id="article-${index}">
      <summary>
        <span class="index-chip" style="background:${color};">${index + 1}</span>
        <span class="summary-text">
          <span class="meta-row">
            <span class="badge" style="background:${color}1a;color:${color};border-color:${color}33;">${escapeHtml(category)}</span>
            ${country ? `<span class="country">${country}</span>` : ""}
          </span>
          <span class="headline">${escapeHtml(article.headline)}</span>
          <span class="summary-line">${escapeHtml(article.summary)}</span>
        </span>
        <span class="toggle-icon" aria-hidden="true"></span>
      </summary>
      <div class="card-body">
        <p class="byline">${date ? `${date} · ` : ""}${escapeHtml(article.readingTime || "")}</p>
        <div class="body">
          ${contentToParagraphs(article.content)}
        </div>
        <a class="back-to-top" href="#toc">↑ Back to list</a>
      </div>
    </details>`;
}

/**
 * Renders a static, read-only HTML page previewing one or more draft
 * articles - a clickable table of contents, then each article as a
 * collapsed, expandable card (native <details>, no JS dependency so it still
 * works when opened as a downloaded file). Meant to be attached to an email,
 * not served - no scripts, no external requests, just the content.
 */
export function renderDraftPreviewHtml(articles) {
  const toc = articles.map(tocRow).join("\n");
  const cards = articles.map(articleCard).join("\n");
  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>AbroadBulletin — Draft Preview</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f0f1f5;
    color: #14162b;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  }
  .shell { max-width: 1140px; margin: 0 auto; padding: 40px 24px 72px; }
  .masthead {
    background: #0b1f4b;
    color: #fff;
    padding: 28px 32px;
    border-radius: 14px 14px 0 0;
  }
  .masthead h1 { font-size: 22px; margin: 0; font-weight: 800; letter-spacing: -0.01em; }
  .masthead p { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: #9fb0e0; margin: 8px 0 0; }

  .toc {
    background: #fff;
    padding: 22px 8px 12px;
    border-radius: 0 0 14px 14px;
    box-shadow: 0 1px 3px rgba(20,22,43,0.08);
    margin-bottom: 32px;
  }
  .toc-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #8a8fa3; margin: 0 24px 12px; }
  .toc-grid { display: grid; grid-template-columns: repeat(2, 1fr); column-gap: 8px; }
  .toc-row {
    display: grid;
    grid-template-columns: 28px 1fr 16px;
    align-items: start;
    column-gap: 14px;
    padding: 14px 24px;
    text-decoration: none;
    color: inherit;
    border-top: 1px solid #eef0f5;
    border-radius: 8px;
    transition: background 0.1s;
  }
  .toc-row:hover { background: #f7f8fb; }
  .toc-num { font-size: 12px; font-weight: 700; color: #b3b8cc; font-variant-numeric: tabular-nums; padding-top: 2px; }
  .toc-text { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .toc-badge { align-self: flex-start; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; }
  .toc-headline { font-size: 14px; font-weight: 600; line-height: 1.45; }
  .toc-chevron { color: #c3c7d6; font-size: 14px; padding-top: 2px; }
  .toc-row:hover .toc-chevron { color: #0b1f4b; }

  .cards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; align-items: start; }
  .card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(20,22,43,0.08);
    overflow: hidden;
    scroll-margin-top: 16px;
  }
  .card > summary {
    list-style: none;
    cursor: pointer;
    padding: 20px 22px;
    display: grid;
    grid-template-columns: 28px 1fr 20px;
    align-items: start;
    column-gap: 14px;
  }
  .card > summary::-webkit-details-marker { display: none; }
  .index-chip {
    width: 26px; height: 26px;
    border-radius: 50%;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    margin-top: 1px;
  }
  .summary-text { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .meta-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .badge { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 9px; border-radius: 4px; border: 1px solid; }
  .country { font-size: 11px; color: #8a8fa3; text-transform: uppercase; letter-spacing: 0.04em; }
  .headline { font-size: 16px; font-weight: 700; line-height: 1.4; }
  .summary-line { font-size: 13px; color: #6b6f85; line-height: 1.6; }
  .toggle-icon { width: 20px; height: 20px; position: relative; margin-top: 4px; }
  .toggle-icon::before, .toggle-icon::after {
    content: ""; position: absolute; background: #8a8fa3; border-radius: 1px;
  }
  .toggle-icon::before { width: 12px; height: 2px; top: 9px; left: 4px; }
  .toggle-icon::after { width: 2px; height: 12px; top: 4px; left: 9px; transition: transform 0.15s; }
  details[open] .toggle-icon::after { transform: rotate(90deg); }

  .card-body { padding: 4px 22px 24px; margin-left: 42px; border-top: 1px solid #eef0f5; }
  .byline { font-size: 12px; color: #8a8fa3; margin: 16px 0 12px; }
  .body p { font-size: 14.5px; line-height: 1.8; margin: 0 0 14px; color: #23253d; }
  .back-to-top { display: inline-block; margin-top: 8px; font-size: 12px; color: #0b1f4b; text-decoration: none; font-weight: 600; }

  .footer { font-size: 11px; color: #8a8fa3; text-align: center; margin-top: 32px; }

  @media (max-width: 760px) {
    .toc-grid { grid-template-columns: 1fr; }
    .cards-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 520px) {
    .shell { padding: 20px 12px 56px; }
    .masthead { padding: 20px 20px; }
    .masthead h1 { font-size: 19px; }
    .toc { padding: 18px 4px 8px; }
    .toc-title { margin-left: 16px; margin-right: 16px; }
    .toc-row { grid-template-columns: 22px 1fr 14px; padding: 12px 16px; column-gap: 10px; }
    .card > summary { padding: 16px 14px; grid-template-columns: 24px 1fr 18px; column-gap: 10px; }
    .card-body { margin-left: 0; padding: 4px 14px 20px; }
    .headline { font-size: 15px; }
  }
</style>
</head>
<body>
  <div class="shell">
    <div class="masthead">
      <h1>AbroadBulletin — Draft Preview</h1>
      <p>Read only · generated ${escapeHtml(generatedAt)}</p>
    </div>
    <div class="toc" id="toc">
      <p class="toc-title">${articles.length} draft${articles.length === 1 ? "" : "s"} — click to jump</p>
      <div class="toc-grid">${toc}</div>
    </div>
    <div class="cards-grid">${cards}</div>
    <p class="footer">Static snapshot — does not update. Click any headline above to expand it.</p>
  </div>
</body>
</html>`;
}
