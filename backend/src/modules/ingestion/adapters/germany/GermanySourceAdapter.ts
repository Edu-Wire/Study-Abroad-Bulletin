/**
 * Germany adapters - Blueprint 5.5 [R13].
 *
 * The Federal Foreign Office feeds are authoritative but broad diplomatic
 * content, so they stay low priority behind a strict prefilter. The student
 * signal comes from the Make it in Germany rule watch and DAAD.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { RssAtomAdapter } from "../rssAtom/RssAtomAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";

/**
 * FFO current articles RSS [R13].
 * Day 2 notes: strict prefilter - do not spend AI tokens on obviously unrelated
 * geopolitical stories.
 */
export class GermanyFfoNewsAdapter extends RssAtomAdapter {}

/** FFO press releases and speeches RSS [R13] - lowest priority German source. */
export class GermanyFfoPressReleasesAdapter extends RssAtomAdapter {}

/**
 * Make it in Germany "Visa for studying" watch.
 * Day 2 notes: diff financial proof, work limits and post-study residence
 * language; this is the highest-value German source despite being a portal.
 */
export class GermanyMakeItInGermanyWatchAdapter extends ChangeWatchAdapter {}

/**
 * DAAD press, news and scholarship items.
 * Day 2 notes: classification must separate scholarship opportunities from
 * general mobility news - the scholarship badge still needs its relevance
 * threshold (10.4).
 */
export class GermanyDaadAdapter extends WebListingAdapter {}

export function createGermanyAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "de-ffo-news-rss":
      return new GermanyFfoNewsAdapter(config);
    case "de-ffo-press-releases-rss":
      return new GermanyFfoPressReleasesAdapter(config);
    case "de-make-it-in-germany-watch":
      return new GermanyMakeItInGermanyWatchAdapter(config);
    case "de-daad-news":
      return new GermanyDaadAdapter(config);
    default:
      throw new Error(`No Germany adapter for source ${config.code}`);
  }
}
