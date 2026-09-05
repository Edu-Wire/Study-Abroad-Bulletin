import * as settingsRepository from "./settings.repository.js";

/** Matches the hardcoded values the General Platform tab used before this was a real table. */
const DEFAULT_SETTINGS = {
  platformName: "Abroad Bulletin",
  tagline: "Study Abroad Intelligence",
  contactEmail: "editorial@abroadbulletin.com",
  timezone: "UTC (GMT+0)",
};

/** Returns the singleton row, creating it with defaults on first read. */
export async function getSettingsForAdmin(repository = settingsRepository) {
  const existing = await repository.findSettings();
  if (existing) return existing;
  return repository.upsertSettings(DEFAULT_SETTINGS);
}

export async function updateSettingsForAdmin(data, repository = settingsRepository) {
  return repository.upsertSettings(data);
}
