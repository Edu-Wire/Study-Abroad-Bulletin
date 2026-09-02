/**
 * SOURCE:        United Kingdom - GOV.UK / Home Office / UKVI
 * APPENDIX A:    [R1] Search API · [R2] Content API · [R3] Statements of Changes
 * FAMILY:        JSON_API · CHANGE_WATCH
 * BLUEPRINT:     5.2 United Kingdom
 *
 * The UK is the most API-first geography in Phase 1. Search API for discovery,
 * Content API for detail; rendered HTML is never scraped. Alignment Plan 7 is
 * explicit that Atom-first behaviour is NOT preserved for the UK.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { JsonApiAdapter, type JsonRequest } from "../jsonApi/JsonApiAdapter";
import { htmlToText } from "../base/htmlExtract";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";
import type { AdapterContext, BackfillWindow, DiscoveredItem } from "../base/types";

const GOVUK_ORIGIN = "https://www.gov.uk";

interface GovUkSearchResult {
  title?: string;
  link?: string;
  description?: string;
  public_timestamp?: string;
  content_id?: string;
  content_store_document_type?: string;
  organisations?: Array<{ title?: string }>;
  part_of_taxonomy_tree?: string[];
}

interface GovUkSearchResponse {
  results?: GovUkSearchResult[];
  total?: number;
}

/** GOV.UK Content API item; `details.body` carries the rendered document HTML. */
interface GovUkContentItem {
  title?: string;
  base_path?: string;
  content_id?: string;
  document_type?: string;
  first_published_at?: string;
  public_updated_at?: string;
  description?: string;
  details?: {
    body?: string;
    government?: unknown;
    attachments?: Array<{ url?: string; title?: string; content_type?: string }>;
    parts?: Array<{ title?: string; body?: string; slug?: string }>;
  };
  links?: { taxons?: Array<{ title?: string }> };
}

/**
 * Shared GOV.UK behaviour: identity is `content_id` + `base_path` so a slug
 * change never creates a false duplicate (5.2), and detail always comes from
 * `/api/content/<base_path>`.
 */
abstract class GovUkAdapter extends JsonApiAdapter {
  protected buildDetailRequest(item: DiscoveredItem): JsonRequest {
    const basePath = String(item.discoveryRaw?.basePath ?? "");
    return { url: `${GOVUK_ORIGIN}/api/content${basePath}` };
  }

  /**
   * A GOV.UK document is either one `details.body` or a set of `parts` (guides
   * such as the Student visa are always parts). Concatenating the parts is what
   * makes the body complete rather than just the landing section.
   */
  protected mapDetailResponse(json: unknown, _item: DiscoveredItem) {
    const content = json as GovUkContentItem | null;
    if (!content) return null;

    const parts = content.details?.parts ?? [];
    const html =
      parts.length > 0
        ? parts.map((part) => `${part.title ?? ""}\n${part.body ?? ""}`).join("\n\n")
        : content.details?.body ?? "";

    const body = htmlToText(html);
    if (!body) return null;

    return {
      body,
      documentType: content.document_type,
      sourceTopics: (content.links?.taxons ?? [])
        .map((taxon) => taxon.title)
        .filter((title): title is string => Boolean(title)),
      publishedAt: content.first_published_at,
      rawMetadata: {
        contentId: content.content_id,
        basePath: content.base_path,
        publicUpdatedAt: content.public_updated_at,
        // 5.2: retain the PDF URL as evidence. PDFs are not parsed in Phase 1.
        attachments: content.details?.attachments ?? [],
      },
    };
  }

  protected toItem(result: GovUkSearchResult): DiscoveredItem | null {
    const basePath = result.link;
    if (!basePath) return null;

    const canonicalUrl = this.canonicalize(`${GOVUK_ORIGIN}${basePath}`);
    return {
      sourceId: this.code,
      externalId: this.pickExternalId([result.content_id, canonicalUrl]),
      canonicalUrl,
      title: result.title ?? "(untitled)",
      publishedAt: this.parseDate(result.public_timestamp),
      sourceSummary: result.description,
      documentType: result.content_store_document_type,
      sourceTopics: result.part_of_taxonomy_tree ?? [],
      discoveryRaw: {
        basePath,
        contentId: result.content_id,
        organisations: (result.organisations ?? []).map((org) => org.title),
      },
    };
  }
}

/**
 * SOURCE:        UKVI / Home Office discovery
 * APPENDIX A:    [R1][R2]
 * ENDPOINT:      GET https://www.gov.uk/api/search.json?q=student+visa&count=100&start=0
 * DISCOVERY:     Search API, count/start offset pagination
 * DETAIL:        https://www.gov.uk/api/content/<base_path>
 * IDENTITY:      content_id -> externalId; base_path retained
 * SCHEDULE:      every 15 min · BACKFILL 2y / 30-day windows
 * HEALTH:        freshness SLA 45 min
 */
export class UkGovUkSearchAdapter extends GovUkAdapter {
  protected buildDiscoveryRequest(
    ctx: AdapterContext,
    page: { pageNumber: number; window?: BackfillWindow }
  ): JsonRequest {
    const pageSize = this.config.discovery.pagination.pageSize ?? 100;
    const overrides: Record<string, string> = {
      count: String(pageSize),
      start: String((page.pageNumber - 1) * pageSize),
      order: "-public_timestamp",
    };

    // The Search API filters on public_timestamp, so a backfill window is a
    // server-side filter rather than a client-side discard.
    if (page.window) {
      overrides["filter_public_timestamp"] =
        `from:${this.toApiDate(page.window.start)},to:${this.toApiDate(page.window.end)}`;
    }
    ctx.logger.debug("GOV.UK search page", { source: this.code, page: page.pageNumber });
    return { url: this.buildUrl(overrides) };
  }

  protected mapDiscoveryResponse(json: unknown) {
    const response = json as GovUkSearchResponse | null;
    const results = response?.results ?? [];
    return {
      items: results
        .map((result) => this.toItem(result))
        .filter((item): item is DiscoveredItem => item !== null),
      total: response?.total,
    };
  }
}

/**
 * SOURCE:        Immigration Rules - Statements of Changes
 * APPENDIX A:    [R2][R3]
 * ENDPOINT:      https://www.gov.uk/api/content/government/collections/
 *                  immigration-rules-statement-of-changes
 * DISCOVERY:     Collection content item -> linked documents
 * DETAIL:        Content API per document; PDF URL retained as evidence
 * IDENTITY:      content_id · SCHEDULE every 30 min · BACKFILL 2021+
 * NOTE:          Appendix Student / Child Student / Graduate / sponsor changes
 *                are flagged high-priority for AI review (5.2).
 */
export class UkStatementsOfChangesAdapter extends GovUkAdapter {
  /** Terms that make a statement of changes student-critical. */
  private static readonly STUDENT_APPENDICES =
    /\b(Appendix Student|Child Student|Graduate|student sponsor|Appendix ATAS|Appendix Finance)\b/i;

  protected buildDiscoveryRequest(): JsonRequest {
    return { url: this.config.discovery.url };
  }

  /**
   * The collection page is itself a content item whose `links.documents` lists
   * every statement. There is no pagination - the collection is complete.
   */
  protected mapDiscoveryResponse(json: unknown) {
    const collection = json as
      | { links?: { documents?: Array<GovUkContentItem & { web_url?: string }> } }
      | null;
    const documents = collection?.links?.documents ?? [];

    const items = documents
      .map((doc): DiscoveredItem | null => {
        const basePath = doc.base_path;
        if (!basePath) return null;

        const canonicalUrl = this.canonicalize(`${GOVUK_ORIGIN}${basePath}`);
        const title = doc.title ?? "(untitled)";

        return {
          sourceId: this.code,
          externalId: this.pickExternalId([doc.content_id, canonicalUrl]),
          canonicalUrl,
          title,
          publishedAt: this.parseDate(doc.public_updated_at ?? doc.first_published_at),
          documentType: doc.document_type ?? "statement_of_changes",
          sourceSummary: doc.description,
          discoveryRaw: {
            basePath,
            contentId: doc.content_id,
            studentCritical: UkStatementsOfChangesAdapter.STUDENT_APPENDICES.test(
              `${title} ${doc.description ?? ""}`
            ),
          },
        };
      })
      .filter((item): item is DiscoveredItem => item !== null);

    return { items, total: items.length };
  }

  /** Re-checks the full body, since an appendix name often appears only there. */
  protected override mapDetailResponse(json: unknown, item: DiscoveredItem) {
    const mapped = super.mapDetailResponse(json, item);
    if (!mapped) return null;

    return {
      ...mapped,
      rawMetadata: {
        ...mapped.rawMetadata,
        studentCritical:
          Boolean(item.discoveryRaw?.studentCritical) ||
          UkStatementsOfChangesAdapter.STUDENT_APPENDICES.test(mapped.body),
      },
    };
  }
}

/**
 * SOURCE:        Student / Graduate / sponsor guidance watch
 * APPENDIX A:    [R2][R3]
 * FAMILY:        CHANGE_WATCH over Content API JSON · SCHEDULE every 6h
 * NOTE:          Rules pages change without a press release, so the watch is
 *                independent of Search API discovery.
 */
export class UkImmigrationRulesWatchAdapter extends ChangeWatchAdapter {}

export function createUkAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "uk-govuk-search-api":
      return new UkGovUkSearchAdapter(config);
    case "uk-govuk-content-api":
      return new UkStatementsOfChangesAdapter(config);
    case "uk-immigration-rules-watch":
      return new UkImmigrationRulesWatchAdapter(config);
    default:
      throw new Error(`No UK adapter for source ${config.code}`);
  }
}
