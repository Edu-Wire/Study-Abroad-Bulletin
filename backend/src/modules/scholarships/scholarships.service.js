import * as scholarshipRepository from "./scholarships.repository.js";

export function toPublicScholarship(scholarship) {
  return {
    ...scholarship,
    destinations: scholarship.destinations.map((d) => d.country),
  };
}

export async function getPublicScholarships(repository = scholarshipRepository) {
  const scholarships = await repository.listPublicScholarships();
  return scholarships.map(toPublicScholarship);
}

export async function getPublicScholarship(slug, repository = scholarshipRepository) {
  const scholarship = await repository.findPublicScholarshipBySlug(slug);
  return scholarship ? toPublicScholarship(scholarship) : null;
}

export async function listScholarshipsForAdmin(repository = scholarshipRepository) {
  const scholarships = await repository.listScholarships();
  return scholarships.map(toPublicScholarship);
}

export async function getScholarshipForAdmin(id, repository = scholarshipRepository) {
  const scholarship = await repository.findScholarshipById(id);
  return scholarship ? toPublicScholarship(scholarship) : null;
}

/** Throws a plain Error with a `.code` of "SLUG_TAKEN" if the slug collides. */
async function assertSlugAvailable(slug, excludeId, repository) {
  const conflict = await repository.findScholarshipBySlugExcludingId(slug, excludeId);
  if (conflict) {
    const error = new Error("A scholarship with this slug already exists.");
    error.code = "SLUG_TAKEN";
    throw error;
  }
}

export async function createScholarshipForAdmin(data, repository = scholarshipRepository) {
  await assertSlugAvailable(data.slug, null, repository);
  const created = await repository.createScholarship(data);
  return toPublicScholarship(created);
}

export async function updateScholarshipForAdmin(id, data, repository = scholarshipRepository) {
  await assertSlugAvailable(data.slug, id, repository);
  const updated = await repository.updateScholarship(id, data);
  return toPublicScholarship(updated);
}

export async function deleteScholarshipForAdmin(id, repository = scholarshipRepository) {
  return repository.deleteScholarship(id);
}
