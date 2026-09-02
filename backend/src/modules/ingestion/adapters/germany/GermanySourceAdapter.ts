/**
 * SOURCE:        Germany - Federal Foreign Office / Make it in Germany / DAAD
 * APPENDIX A:    [R13] FFO RSS newsfeed
 * FAMILY:        RSS_ATOM · CHANGE_WATCH · WEB_LISTING
 * BLUEPRINT:     5.5 Germany
 *
 * The FFO feeds are authoritative but broad diplomatic content, so they run LOW
 * priority behind a strict prefilter with `aiBudgetGuard`. The student signal
 * comes from the Make it in Germany rule watch and from DAAD.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { RssAtomAdapter } from "../rssAtom/RssAtomAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";

/**
 * SOURCE:        FFO current articles
 * APPENDIX A:    [R13] · FAMILY RSS_ATOM · SCHEDULE hourly · BACKFILL 12m
 * NOTE:          Strict prefilter. Do not spend AI tokens on obviously unrelated
 *                geopolitical stories (5.5).
 */
export class GermanyFfoNewsAdapter extends RssAtomAdapter {}

/**
 * SOURCE:        FFO press releases and speeches
 * APPENDIX A:    [R13] · FAMILY RSS_ATOM · SCHEDULE hourly · BACKFILL 12m
 * NOTE:          Lowest-priority German source; filter aggressively.
 */
export class GermanyFfoPressReleasesAdapter extends RssAtomAdapter {}

/**
 * SOURCE:        Make it in Germany - Visa for studying
 * APPENDIX A:    [R13] · FAMILY CHANGE_WATCH · SCHEDULE every 6h
 * FACTS:         financial proof, work limits, post-study residence (5.5)
 */
export class GermanyMakeItInGermanyWatchAdapter extends ChangeWatchAdapter {}

/**
 * SOURCE:        DAAD press, news and scholarship items
 * APPENDIX A:    named in 4.2/5.5 without a dedicated reference
 * FAMILY:        WEB_LISTING · SCHEDULE hourly · BACKFILL 2y
 * NOTE:          Classification must distinguish a scholarship opportunity from
 *                general mobility news; the badge still needs its threshold (10.4).
 */
export class GermanyDaadAdapter extends WebListingAdapter {
  protected readonly itemUrlPattern = /daad\.de\/(en|de)\/.+(press|news|meldungen)\/.+/i;
  protected readonly listingSelector = "main";
}

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
