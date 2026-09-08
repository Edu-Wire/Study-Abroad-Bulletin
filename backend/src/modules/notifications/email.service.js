import crypto from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "../../config/prisma.js";
import { renderDraftPreviewHtml } from "./draftPreview.html.js";

const PREVIEW_LINK_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

/**
 * Generates (or refreshes) a share-link token for a draft. Regenerating on
 * every send rather than reusing a stored token means an old, possibly-leaked
 * email always references a dead link once a newer one exists.
 */
async function issuePreviewToken(articleId) {
  const token = crypto.randomBytes(24).toString("hex");
  const previewExpiresAt = new Date(Date.now() + PREVIEW_LINK_TTL_MS);
  await prisma.article.update({
    where: { id: articleId },
    data: { previewToken: token, previewExpiresAt },
  });
  return token;
}

let cachedTransporter = null;

/** Lazily built so a missing SMTP config fails at send time, not at import time. */
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error("SMTP_HOST, SMTP_USER and SMTP_PASSWORD must be set to send email notifications.");
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return cachedTransporter;
}

async function getRecipient() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  return settings?.draftNotificationEmail || "info@digi-wire.com";
}

/**
 * Whoever sets APP_URL is asserting it's actually reachable by whoever reads
 * this email (a deployed domain, or a localhost address when the recipient
 * is known to be on the same machine) - so the link is only omitted when
 * APP_URL isn't configured at all, never guessed at.
 */
function publicLinkOrNull(path) {
  const base = process.env.APP_URL;
  if (!base) return null;
  return `${base}${path}`;
}

/** Does the real send; throws on failure so callers can decide how to react. */
async function deliverDraftNotificationEmail(article) {
  const recipient = await getRecipient();
  const transporter = getTransporter();
  const adminUrl = publicLinkOrNull(`/admin/news?slug=${encodeURIComponent(article.slug)}`);
  const token = await issuePreviewToken(article.id);
  const previewUrl = publicLinkOrNull(`/news/${encodeURIComponent(article.slug)}?preview=${token}`);
  const previewHtml = renderDraftPreviewHtml([article]);

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: recipient,
    subject: `New draft: ${article.headline}`,
    text: `A new draft article is ready for review.\n\nHeadline: ${article.headline}\nCategory: ${article.category || "(uncategorized)"}\nCountry: ${article.primaryCountryId || "(none)"}\n\nSummary:\n${article.summary || "(none)"}\n${previewUrl ? `\nView it live on the site (link expires in 72 hours): ${previewUrl}` : ""}${adminUrl ? `\nAdmin panel: ${adminUrl}` : ""}\n\nA read-only copy is also attached.`,
    html: `<p>A new draft article is ready for review.</p>
      <p><b>Headline:</b> ${article.headline}<br>
      <b>Category:</b> ${article.category || "(uncategorized)"}<br>
      <b>Country:</b> ${article.primaryCountryId || "(none)"}</p>
      <p><b>Summary:</b><br>${article.summary || "(none)"}</p>
      ${previewUrl ? `<p><a href="${previewUrl}">View it live on the site</a> (link expires in 72 hours)</p>` : ""}
      ${adminUrl ? `<p><a href="${adminUrl}">Open in the admin panel</a></p>` : ""}
      <p>A read-only copy is also attached.</p>`,
    attachments: [
      {
        filename: `draft-preview-${article.slug}.html`,
        content: previewHtml,
        contentType: "text/html",
      },
    ],
  });
}

/**
 * Sends one digest email listing every currently-outstanding draft, each as a
 * read-only preview card in an attached HTML file - for catching up on a
 * backlog rather than reacting to one article at a time.
 *
 * `to` and `subject` default to the configured recipient / a generated
 * subject, but can be overridden for a one-off send (e.g. sharing with a
 * reviewer who isn't the configured recipient) without changing any setting.
 */
export async function sendDraftDigestEmail(articles, options = {}) {
  const recipient = options.to || (await getRecipient());
  const transporter = getTransporter();
  const previewHtml = renderDraftPreviewHtml(articles);
  const adminUrl = publicLinkOrNull("/admin/news");

  const textRows = articles
    .map((a, i) => `${i + 1}. [${a.category || "UNCATEGORIZED"}] ${a.headline}`)
    .join("\n");
  const htmlRows = articles
    .map((a) => `<li style="margin-bottom:10px;"><b>${a.headline}</b></li>`)
    .join("\n");

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: recipient,
    subject: options.subject || `AbroadBulletin: ${articles.length} draft${articles.length === 1 ? "" : "s"} awaiting review`,
    text: `${articles.length} draft article(s) are currently awaiting editorial review. Open the attached HTML file to read them.\n\n${textRows}${adminUrl ? `\n\nAdmin panel: ${adminUrl}` : ""}`,
    html: `<p>${articles.length} draft article${articles.length === 1 ? "" : "s"} are currently awaiting editorial review.</p>
      <ol>${htmlRows}</ol>
      <p><b>Open the attached HTML file to read them</b> - it's a self-contained page, no login or network connection needed.</p>
      ${adminUrl ? `<p><a href="${adminUrl}">Open the admin panel</a></p>` : ""}`,
    attachments: [
      {
        filename: `abroadbulletin-drafts-${new Date().toISOString().slice(0, 10)}.html`,
        content: previewHtml,
        contentType: "text/html",
      },
    ],
  });
}

/**
 * Emails the editorial team whenever a new draft article exists to review -
 * whether the ingestion pipeline auto-drafted it from a candidate, or an
 * editor created it directly. Failures are logged, never thrown: a missing
 * SMTP config or a flaky mail server must not block draft creation itself.
 */
export async function sendDraftNotificationEmail(article) {
  try {
    await deliverDraftNotificationEmail(article);
  } catch (error) {
    console.error("[email.service] Failed to send draft notification:", error);
  }
}

/**
 * Same send, but for the manual "notify" button: a human clicking it needs to
 * know whether it actually worked, so failures propagate instead of being
 * swallowed.
 */
export async function sendDraftNotificationEmailOrThrow(article) {
  await deliverDraftNotificationEmail(article);
}
