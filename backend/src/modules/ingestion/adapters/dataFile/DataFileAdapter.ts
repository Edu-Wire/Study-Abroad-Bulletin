/**
 * DATA_FILE generic adapter (Blueprint 6.1).
 *
 * Discovery: a release/listing page. Detail: the XLSX/CSV/PDF file itself.
 * Serves: the Australian international-student monthly dataset [R8].
 *
 * 5.3 is explicit that this is a data import, not article ingestion: persist
 * dataset metadata, a checksum and normalized aggregates - never one article per
 * row. The registry keeps this source's auto-draft threshold out of reach so a
 * dataset can never walk into the editorial queue by accident.
 */

import { BaseSourceAdapter } from "../base/SourceAdapter";
import type {
  DiscoverContext,
  DiscoveredItem,
  DiscoveryPage,
  NormalizedSourceDocument,
  SourceDetail,
} from "../base/types";

export interface DatasetRelease {
  sourceId: string;
  releaseKey: string;
  fileUrl: string;
  filename: string;
  checksum: string;
  sizeBytes: number;
  publishedAt?: string;
}

export abstract class DataFileAdapter extends BaseSourceAdapter {
  /**
   * Day 2: parse the release page for dataset links, emitting one item per
   * release keyed by publication month rather than by file URL, which changes
   * between revisions of the same release.
   */
  async discover(ctx: DiscoverContext): Promise<DiscoveryPage> {
    ctx.logger.debug("Data-file discovery not implemented", { sourceId: this.sourceId });
    return this.notImplemented("discover");
  }

  /**
   * Day 2: download under this source's larger `maxPayloadBytes`, checksum the
   * bytes and skip parsing entirely when the checksum matches the stored release.
   */
  async fetchDetail(item: DiscoveredItem, ctx: DiscoverContext): Promise<SourceDetail> {
    ctx.logger.debug("Data-file detail fetch not implemented", { externalId: item.externalId });
    return this.notImplemented("fetchDetail");
  }

  /**
   * Day 2: emit a document describing the *release* - title, period covered,
   * checksum, aggregate highlights - so the corpus stays uniform. Row-level data
   * goes to the dataset tables, not to `fullText`.
   */
  async normalize(detail: SourceDetail): Promise<NormalizedSourceDocument> {
    void detail;
    return this.notImplemented("normalize");
  }

  /** Day 2: parse the workbook into normalized aggregates. */
  protected parseDataset(detail: SourceDetail): Promise<DatasetRelease> {
    void detail;
    return this.notImplemented("parseDataset");
  }
}
