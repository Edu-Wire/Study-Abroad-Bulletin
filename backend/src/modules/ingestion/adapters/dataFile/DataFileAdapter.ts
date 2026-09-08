/**
 * DATA_FILE family (Blueprint 6.1).
 *
 * Discovery is a release/listing page; detail is the dataset file. Blueprint 5.3
 * is explicit that this is a data import, not article ingestion: persist dataset
 * metadata, a checksum and normalized aggregates - never one source item per
 * spreadsheet row.
 *
 * `fetchDetail` returns file *metadata only*. Downloading and parsing a 100MB
 * workbook is a separate, slower lane; the registry gives this family its own
 * payload ceiling.
 */

import { BaseSourceAdapter, DiscoveryPageError } from "../base/SourceAdapter";
import { extractDate, extractLinks, htmlToText } from "../base/htmlExtract";
import type {
  AdapterContext,
  DiscoveredItem,
  DiscoveryPage,
  NormalizedSourceDocument,
  SourceDetail,
  SourceHealth,
} from "../base/types";

export interface DatasetRelease {
  releaseKey: string;
  fileUrl: string;
  filename: string;
  contentType?: string;
  contentLength?: number;
  lastModified?: string;
  checksum?: string;
}

const DATA_FILE_EXTENSIONS = /\.(xlsx?|csv|pdf)(\?|$)/i;

export abstract class DataFileAdapter extends BaseSourceAdapter {
  /**
   * One item per dataset *release*, keyed by publication period rather than by
   * file URL - the URL changes between revisions of the same release, which
   * would otherwise look like new data every month.
   */
  async discover(ctx: AdapterContext): Promise<DiscoveryPage> {
    const url = this.config.discovery.url;

    let response;
    try {
      response = await ctx.http.get<string>(url, {
        timeoutMs: this.config.http.timeoutMs,
        maxBytes: this.config.http.maxPayloadBytes,
        responseType: "text",
        conditional: this.config.http.conditionalRequests
          ? { etag: ctx.syncState?.etag, lastModified: ctx.syncState?.lastModified }
          : undefined,
      });
    } catch (cause) {
      throw new DiscoveryPageError(this.code, { url }, cause);
    }

    if (response.notModified) {
      return this.buildDiscoveryPage([], {
        notModified: true,
        sourceWatermark: ctx.syncState?.watermarkAt,
      });
    }

    const items: DiscoveredItem[] = [];
    const seenReleases = new Set<string>();

    for (const link of extractLinks(response.body)) {
      const absolute = this.resolveUrl(link.href, response.finalUrl);
      if (!absolute || !DATA_FILE_EXTENSIONS.test(absolute)) continue;

      const releaseKey = this.deriveReleaseKey(link.text, absolute, response.body);
      if (!releaseKey || seenReleases.has(releaseKey)) continue;
      seenReleases.add(releaseKey);

      items.push({
        sourceId: this.code,
        externalId: `${this.code}:${releaseKey}`,
        canonicalUrl: this.canonicalize(response.finalUrl),
        title: link.text || `Dataset release ${releaseKey}`,
        documentType: "DATASET_RELEASE",
        publishedAt: this.parseDate(extractDate(link.html)),
        discoveryRaw: { fileUrl: absolute, releaseKey, releasePage: response.finalUrl },
      });
    }

    ctx.logger.info("Dataset releases discovered", { source: this.code, count: items.length });
    return this.buildDiscoveryPage(items, { total: items.length });
  }

  /**
   * Metadata only - a HEAD-equivalent. The checksum is filled in by whoever
   * downloads the bytes; if it matches the stored release, nothing else runs.
   */
  async fetchDetail(item: DiscoveredItem, ctx: AdapterContext): Promise<SourceDetail> {
    const fetchedAt = ctx.now().toISOString();
    const fileUrl = String(item.discoveryRaw?.fileUrl ?? "");

    if (!fileUrl) {
      return {
        item,
        finalUrl: item.canonicalUrl,
        contentType: "application/octet-stream",
        detailStatus: "FAILED",
        reason: "EMPTY_CONTENT",
        fetchedAt,
      };
    }

    let response;
    try {
      response = await ctx.http.get<ArrayBuffer>(fileUrl, {
        timeoutMs: this.config.http.timeoutMs,
        maxBytes: this.config.http.maxPayloadBytes,
        responseType: "buffer",
      });
    } catch (cause) {
      ctx.logger.warn("Dataset download failed", { source: this.code, fileUrl, cause });
      return {
        item,
        finalUrl: fileUrl,
        contentType: "application/octet-stream",
        detailStatus: "FAILED",
        reason: "HTTP_ERROR",
        fetchedAt,
      };
    }

    const contentLength = Number(response.headers["content-length"] ?? 0) || undefined;

    return {
      item,
      finalUrl: response.finalUrl,
      contentType: response.headers["content-type"] ?? "application/octet-stream",
      detailStatus: "ENRICHED",
      file: {
        fileUrl: response.finalUrl,
        contentType: response.headers["content-type"] ?? "application/octet-stream",
        contentLength,
        lastModified: response.headers["last-modified"],
        // Checksumming is Developer A's hashing layer, same as content hashes.
        checksum: undefined,
      },
      fetchedAt,
      etag: response.headers.etag,
      lastModified: response.headers["last-modified"],
    };
  }

  /**
   * A document describing the *release* - not its rows. Keeping the corpus
   * uniform means an editor can search datasets alongside articles without the
   * pipeline inventing 40,000 fake news items.
   */
  async normalize(
    detail: SourceDetail,
    item: DiscoveredItem,
    _ctx: AdapterContext
  ): Promise<NormalizedSourceDocument> {
    const releaseKey = String(item.discoveryRaw?.releaseKey ?? "");
    const summary = [
      item.title,
      releaseKey ? `Release period: ${releaseKey}.` : "",
      detail.file?.contentLength
        ? `File size: ${Math.round(detail.file.contentLength / 1024)} KB.`
        : "",
      `Official release page: ${item.canonicalUrl}`,
    ]
      .filter(Boolean)
      .join(" ");

    return this.buildDocument(item, detail, summary, {
      documentType: "DATASET_RELEASE",
      rawMetadata: {
        transport: "DATA_FILE",
        releaseKey,
        file: detail.file,
        // Aggregates land here once the workbook parser exists; row-level data
        // belongs in the dataset tables, never in fullText.
        aggregates: null,
      },
    });
  }

  async healthcheck(ctx: AdapterContext): Promise<SourceHealth> {
    const startedAt = Date.now();
    try {
      const response = await ctx.http.get<string>(this.config.discovery.url, {
        timeoutMs: this.config.http.timeoutMs,
        responseType: "text",
      });
      const hasFiles = extractLinks(response.body).some((link) =>
        DATA_FILE_EXTENSIONS.test(link.href)
      );
      return {
        state: hasFiles ? "HEALTHY" : "BROKEN",
        checkedAt: ctx.now().toISOString(),
        latencyMs: Date.now() - startedAt,
        message: hasFiles ? undefined : "Release page exposed no dataset files",
      };
    } catch (error) {
      return {
        state: "BROKEN",
        checkedAt: ctx.now().toISOString(),
        latencyMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Release identity: the period the data covers, from the link text, the file
   * name, or the surrounding page. Falls back to nothing rather than guessing -
   * a wrong release key silently overwrites a month of data.
   */
  protected deriveReleaseKey(
    linkText: string,
    fileUrl: string,
    _pageHtml: string
  ): string | null {
    const haystack = `${linkText} ${decodeURIComponent(fileUrl)}`;

    const isoMonth = /\b(20\d{2})[-_ ]?(0[1-9]|1[0-2])\b/.exec(haystack);
    if (isoMonth) return `${isoMonth[1]}-${isoMonth[2]}`;

    const named =
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i.exec(
        haystack
      );
    if (named) {
      const month = String(
        [
          "january",
          "february",
          "march",
          "april",
          "may",
          "june",
          "july",
          "august",
          "september",
          "october",
          "november",
          "december",
        ].indexOf(named[1].toLowerCase()) + 1
      ).padStart(2, "0");
      return `${named[2]}-${month}`;
    }

    const year = /\b(20\d{2})\b/.exec(haystack);
    return year ? year[1] : null;
  }

  /** Available to subclasses that need the release page as text. */
  protected pageText(html: string): string {
    return htmlToText(html);
  }
}
