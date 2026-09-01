import * as countryRepository from "./countries.repository.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(date, now = Date.now()) {
  if (!date) return null;
  const time = new Date(date).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.ceil((time - now) / DAY_MS));
}

function mapDeadline(deadline, country) {
  return {
    ...deadline,
    country: {
      id: country.id,
      name: country.name,
      code: country.code,
      flag: country.flag,
    },
  };
}

function mapScholarship(link, now) {
  const scholarship = link.scholarship;
  return {
    ...scholarship,
    daysLeft: daysUntil(scholarship.deadline, now),
    destinations: undefined,
  };
}

function mapConsultants(country) {
  const seen = new Set();
  return [...country.consultantsHQ, ...country.consultantDestinations.map((link) => link.consultant)]
    .filter((consultant) => {
      if (seen.has(consultant.id)) return false;
      seen.add(consultant.id);
      return true;
    })
    .map((consultant) => ({
      ...consultant,
      country: country.name,
      destinations: [],
    }));
}

export function toPublicCountry(country) {
  return { ...country };
}

export function toPublicCountryDetail(country, now = Date.now()) {
  return {
    id: country.id,
    name: country.name,
    code: country.code,
    flag: country.flag,
    universitiesCount: country.universitiesCount,
    averageTuition: country.averageTuition,
    popularIntake: country.popularIntake,
    updatesCount: country.updatesCount,
    heroImage: country.heroImage,
    universities: country.universities,
    immigrationDeadlines: country.immigrationDeadlines.map((deadline) =>
      mapDeadline(deadline, country)
    ),
    scholarships: country.scholarships.map((link) => mapScholarship(link, now)),
    articles: country.articles.map((link) => link.article),
    consultants: mapConsultants(country),
  };
}

export async function getPublicCountries(repository = countryRepository) {
  const countries = await repository.listPublicCountries();
  return countries.map(toPublicCountry);
}

export async function getPublicCountry(id, repository = countryRepository, now = Date.now()) {
  const country = await repository.findPublicCountryById(id);
  return country ? toPublicCountryDetail(country, now) : null;
}
