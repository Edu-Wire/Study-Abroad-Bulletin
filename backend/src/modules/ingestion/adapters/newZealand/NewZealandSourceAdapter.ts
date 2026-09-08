/**
 * SOURCE:        New Zealand - Immigration New Zealand
 * APPENDIX A:    [R14] INZ news centre / Pathway Student Visa
 * FAMILY:        WEB_LISTING · CHANGE_WATCH
 * BLUEPRINT:     5.6 New Zealand - one of the highest-signal web sources in
 *                Phase 1, which is why the listing backfills three years.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import { htmlToText } from "../base/htmlExtract";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";
import type { DiscoveredItem } from "../base/types";

/**
 * SOURCE:        INZ News Centre
 * APPENDIX A:    [R14] · FAMILY WEB_LISTING · SCHEDULE every 30 min · BACKFILL 3y
 * IDENTITY:      canonical URL
 * NOTE:          INZ's own topic labels are stored in `sourceTopics`, separate
 *                from AbroadBulletin editorial categories (5.6).
 */
export class NewZealandImmigrationNewsAdapter extends WebListingAdapter {
  protected readonly itemUrlPattern = /immigration\.govt\.nz\/about-us\/(news-centre|media-centre)\/.+/i;
  protected readonly listingSelector = "main";

  /** INZ tags each row with a topic chip; keeping it costs nothing and the
   *  editorial screen shows native topics beside our own categories. */
  protected override parseListing(html: string, baseUrl: string): DiscoveredItem[] {
    return super.parseListing(html, baseUrl).map((item) => ({
      ...item,
      sourceTopics: this.topicsFor(html, item.canonicalUrl),
    }));
  }

  private topicsFor(regionHtml: string, canonicalUrl: string): string[] {
    const slug = canonicalUrl.split("/").filter(Boolean).pop() ?? "";
    const index = slug ? regionHtml.indexOf(slug) : -1;
    if (index === -1) return [];

    const context = regionHtml.slice(Math.max(0, index - 400), index + 400);
    const topics = new Set<string>();
    for (const match of context.matchAll(
      /class\s*=\s*["'][^"']*\b(?:topic|tag|category)\b[^"']*["'][^>]*>([\s\S]{0,80}?)</gi
    )) {
      const label = htmlToText(match[1]).trim();
      if (label && label.length < 60) topics.add(label);
    }
    return [...topics];
  }
}

/**
 * SOURCE:        Pathway Student Visa & Post Study Work guidance
 * APPENDIX A:    [R14] · FAMILY CHANGE_WATCH · SCHEDULE every 6h
 * NOTE:          Catches operational changes that never get a news item (5.6).
 */
export class NewZealandPathwayStudentWatchAdapter extends ChangeWatchAdapter {}

export function createNewZealandAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "nz-immigration-news":
      return new NewZealandImmigrationNewsAdapter(config);
    case "nz-pathway-student-watch":
      return new NewZealandPathwayStudentWatchAdapter(config);
    default:
      throw new Error(`No New Zealand adapter for source ${config.code}`);
  }
}
