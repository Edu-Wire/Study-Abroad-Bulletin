/**
 * SOURCE:        European Union - European Commission
 * APPENDIX A:    [R17] news & media · [R18] Press Corner API spec · [R19] DG HOME
 *                [R20] European Education Area · [R21] Erasmus+
 * FAMILY:        JSON_API · RSS_ATOM · WEB_LISTING
 * BLUEPRINT:     5.8 European Union
 *
 * Press Corner is the flagship fix: the RSS card carries a short summary while
 * the API returns the full document. RSS is a live signal here, never the
 * authoritative detail corpus.
 */

import { JsonApiAdapter, type JsonRequest } from "../jsonApi/JsonApiAdapter";
import { RssAtomAdapter } from "../rssAtom/RssAtomAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import { htmlToText } from "../base/htmlExtract";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";
import type { AdapterContext, BackfillWindow, DiscoveredItem } from "../base/types";

const PRESS_CORNER_DETAIL = "https://ec.europa.eu/commission/presscorner/api/documents";

interface PressCornerSearchItem {
  reference?: string;
  refCode?: string;
  title?: string;
  documentType?: string;
  type?: string;
  policyAreas?: string[];
  policyArea?: string[];
  eventDate?: string;
  publishDate?: string;
  date?: string;
  place?: string;
  commissioner?: string;
  summary?: string;
  url?: string;
}

interface PressCornerSearchResponse {
  items?: PressCornerSearchItem[];
  results?: PressCornerSearchItem[];
  documents?: PressCornerSearchItem[];
  total?: number;
  totalResults?: number;
}

interface PressCornerDocument {
  reference?: string;
  refCode?: string;
  title?: string;
  htmlContent?: string;
  content?: string;
  documentType?: string;
  policyAreas?: string[];
  eventDate?: string;
  publishDate?: string;
  place?: string;
  commissioner?: string;
  language?: string;
}

/**
 * SOURCE:        European Commission Press Corner
 * APPENDIX A:    [R17][R18]
 * ENDPOINT:      GET /commission/presscorner/api/search
 *                  ?language=en&pagesize=100&pagenumber=N&datefrom=&dateto=
 * DETAIL:        GET /commission/presscorner/api/documents?reference=<refCode>&language=en
 *                body = htmlContent
 * IDENTITY:      refCode (e.g. SPEECH/26/1765) -> externalId
 * SCHEDULE:      every 15 min · BACKFILL 3y targeted / 30-day windows / 72h overlap
 * HEALTH:        freshness SLA 45 min
 * NOTE:          A failed page is FAILED, never end-of-results (15.1). Native
 *                policyAreas are source metadata, never editorial categories (10.4).
 */
export class EuPressCornerAdapter extends JsonApiAdapter {
  protected buildDiscoveryRequest(
    ctx: AdapterContext,
    page: { pageNumber: number; window?: BackfillWindow }
  ): JsonRequest {
    const overrides: Record<string, string | undefined> = {
      pagenumber: String(page.pageNumber),
      pagesize: String(this.config.discovery.pagination.pageSize ?? 100),
    };

    if (page.window) {
      overrides.datefrom = this.toApiDate(page.window.start);
      overrides.dateto = this.toApiDate(page.window.end);
    } else if (ctx.syncState?.watermarkAt) {
      // 5.8: 72-hour overlap on incremental search so nothing falls between runs.
      const overlapMs = this.config.backfill.overlapHours * 60 * 60 * 1000;
      overrides.datefrom = this.toApiDate(
        new Date(Date.parse(ctx.syncState.watermarkAt) - overlapMs)
      );
      overrides.dateto = this.toApiDate(ctx.now());
    }

    return { url: this.buildUrl(overrides) };
  }

  protected mapDiscoveryResponse(json: unknown) {
    const response = json as PressCornerSearchResponse | null;
    // The API has shipped several envelope shapes; accept the documented one
    // and its observed variants rather than failing the whole page.
    const rows = response?.items ?? response?.results ?? response?.documents ?? [];

    const items = rows
      .map((row): DiscoveredItem | null => {
        const refCode = row.reference ?? row.refCode;
        if (!refCode) return null;

        const canonicalUrl = this.canonicalize(
          row.url ?? `https://ec.europa.eu/commission/presscorner/detail/en/${refCode.replace(/\//g, "_")}`
        );

        return {
          sourceId: this.code,
          externalId: refCode,
          canonicalUrl,
          title: row.title ?? refCode,
          publishedAt: this.parseDate(row.publishDate ?? row.date ?? row.eventDate),
          sourceSummary: row.summary,
          documentType: row.documentType ?? row.type,
          sourceTopics: row.policyAreas ?? row.policyArea ?? [],
          discoveryRaw: {
            refCode,
            eventDate: row.eventDate,
            publishDate: row.publishDate,
            place: row.place,
            commissioner: row.commissioner,
          },
        };
      })
      .filter((item): item is DiscoveredItem => item !== null);

    return { items, total: response?.total ?? response?.totalResults };
  }

  protected buildDetailRequest(item: DiscoveredItem): JsonRequest {
    const url = new URL(PRESS_CORNER_DETAIL);
    url.searchParams.set("reference", item.externalId);
    url.searchParams.set("language", "en");
    return { url: url.toString() };
  }

  protected mapDetailResponse(json: unknown, _item: DiscoveredItem) {
    const raw = json as PressCornerDocument | { document?: PressCornerDocument } | null;
    const doc =
      raw && typeof raw === "object" && "document" in raw && raw.document
        ? raw.document
        : (raw as PressCornerDocument | null);
    if (!doc) return null;

    const html = doc.htmlContent ?? doc.content ?? "";
    const body = htmlToText(html);
    if (!body) return null;

    return {
      body,
      documentType: doc.documentType,
      // Native policy areas stay here as source metadata; 10.4 forbids mapping
      // them onto AbroadBulletin categories.
      sourceTopics: doc.policyAreas ?? [],
      publishedAt: doc.publishDate ?? doc.eventDate,
      rawMetadata: {
        refCode: doc.reference ?? doc.refCode,
        eventDate: doc.eventDate,
        publishDate: doc.publishDate,
        place: doc.place,
        commissioner: doc.commissioner,
        language: doc.language ?? "en",
      },
    };
  }
}

/**
 * SOURCE:        Commission Department News
 * APPENDIX A:    [R17] · FAMILY RSS_ATOM + HTML detail · SCHEDULE every 30 min
 * NOTE:          Separate from Press Corner: covers services outside the
 *                Spokesperson stream.
 */
export class EuCommissionDeptNewsAdapter extends RssAtomAdapter {}

/**
 * SOURCE:        DG Migration and Home Affairs
 * APPENDIX A:    [R19] · FAMILY WEB_LISTING · SCHEDULE every 30 min · BACKFILL 3y
 * NOTE:          Higher study-abroad prior than general Commission news (5.8).
 */
export class EuDgHomeNewsAdapter extends WebListingAdapter {
  protected readonly itemUrlPattern = /home-affairs\.ec\.europa\.eu\/.+(news|\d{4}-\d{2}-\d{2})/i;
  protected readonly listingSelector = "main";
}

/**
 * SOURCE:        European Education Area
 * APPENDIX A:    [R20] · FAMILY WEB_LISTING · SCHEDULE every 30 min · BACKFILL 3y
 */
export class EuEducationAreaNewsAdapter extends WebListingAdapter {
  protected readonly itemUrlPattern = /education\.ec\.europa\.eu\/(news|whats-new)\/.+/i;
  protected readonly listingSelector = "main";
}

/**
 * SOURCE:        Erasmus+ / Erasmus Mundus
 * APPENDIX A:    [R21] · FAMILY WEB_LISTING · SCHEDULE hourly · BACKFILL 3y
 * NOTE:          Calls and funding items are mobility news until scholarship
 *                relevance clears its threshold - the badge is earned (10.4).
 */
export class EuErasmusPlusNewsAdapter extends WebListingAdapter {
  protected readonly itemUrlPattern = /erasmus-plus\.ec\.europa\.eu\/(news|whats-new)\/.+/i;
  protected readonly listingSelector = "main";
}

export function createEuAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "eu-press-corner-api":
      return new EuPressCornerAdapter(config);
    case "eu-commission-dept-news":
      return new EuCommissionDeptNewsAdapter(config);
    case "eu-dg-home-news":
      return new EuDgHomeNewsAdapter(config);
    case "eu-education-area-news":
      return new EuEducationAreaNewsAdapter(config);
    case "eu-erasmus-plus-news":
      return new EuErasmusPlusNewsAdapter(config);
    default:
      throw new Error(`No EU adapter for source ${config.code}`);
  }
}
