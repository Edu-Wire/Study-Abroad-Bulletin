/**
 * SOURCE:        Canada - IRCC (Immigration, Refugees and Citizenship Canada)
 * APPENDIX A:    [R4] newsroom/notices · [R5] study permit
 * OFFICIAL URL:  https://www.canada.ca/en/immigration-refugees-citizenship/news/rss.html
 * FAMILY:        RSS_ATOM · WEB_LISTING · CHANGE_WATCH
 * BLUEPRINT:     5.1 Canada
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { RssAtomAdapter } from "../rssAtom/RssAtomAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";
import type { DiscoveredItem } from "../base/types";
import type { FeedEntry } from "../rssAtom/feedParse";

/**
 * SOURCE:        IRCC Newsroom
 * APPENDIX A:    [R4]
 * ENDPOINT:      https://api.io.canada.ca/io-server/gc/news/en/v2
 *                  ?dept=departmentofcitizenshipandimmigration
 *                  &sort=publishedDate&orderBy=desc&pick=50&format=atom
 * DISCOVERY:     Atom feed, pick=50, publishedDate desc
 * DETAIL:        Canada.ca article HTML - the feed carries a summary only (7.1)
 * IDENTITY:      Atom <id> -> externalId; canonical URL fallback
 * SCHEDULE:      every 15 min · BACKFILL 2y / 30-day windows / 72h overlap
 * HEALTH:        freshness SLA 45 min
 */
export class CanadaIrccAtomAdapter extends RssAtomAdapter {
  protected readonly feedProvidesFullContent = false;

  // Entries come from api.io.canada.ca but link to articles on canada.ca.
  protected readonly linkBaseUrl = "https://www.canada.ca";

  /**
   * The Government of Canada news API returns bilingual entries on one feed;
   * the English filter is a query parameter but a French item still slips
   * through occasionally, so language is recorded from the entry itself.
   */
  protected override toDiscoveredItem(entry: FeedEntry, baseUrl: string): DiscoveredItem | null {
    const item = super.toDiscoveredItem(entry, baseUrl);
    if (!item) return null;

    return {
      ...item,
      documentType: item.canonicalUrl.includes("/news/notices") ? "NOTICE" : "NEWS_RELEASE",
      discoveryRaw: { ...item.discoveryRaw, department: "IRCC" },
    };
  }
}

/**
 * SOURCE:        IRCC Notices
 * APPENDIX A:    [R4]
 * OFFICIAL URL:  https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html
 * FAMILY:        WEB_LISTING
 * DETAIL:        Canada.ca HTML · IDENTITY: canonical URL
 * SCHEDULE:      every 30 min · BACKFILL 3y
 * NOTE:          Operational notices carry student changes before press releases.
 */
export class CanadaIrccNoticesAdapter extends WebListingAdapter {
  protected readonly itemUrlPattern =
    /canada\.ca\/en\/immigration-refugees-citizenship\/news\/notices\/.+/i;
  protected readonly listingSelector = "main";
}

/**
 * SOURCE:        IRCC Study Permit rules
 * APPENDIX A:    [R5]
 * OFFICIAL URL:  https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html
 * FAMILY:        CHANGE_WATCH · SCHEDULE every 6h · BACKFILL none (now onward)
 * FACTS:         fees, PAL/TAL, eligibility, work conditions (11.3)
 */
export class CanadaStudyPermitWatchAdapter extends ChangeWatchAdapter {}

export function createCanadaAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "ca-ircc-atom":
      return new CanadaIrccAtomAdapter(config);
    case "ca-ircc-notices":
      return new CanadaIrccNoticesAdapter(config);
    case "ca-study-permit-watch":
      return new CanadaStudyPermitWatchAdapter(config);
    default:
      throw new Error(`No Canada adapter for source ${config.code}`);
  }
}
