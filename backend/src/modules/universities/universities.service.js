import * as universityRepository from "./universities.repository.js";

export function toPublicUniversity(university) {
  return { ...university };
}

export function toPublicUniversityDetail(university) {
  return {
    ...toPublicUniversity(university),
    intakes: university.intakes ?? [],
  };
}

export async function getPublicUniversities(repository = universityRepository) {
  const universities = await repository.listPublicUniversities();
  return universities.map(toPublicUniversity);
}

export async function getPublicUniversity(slug, repository = universityRepository) {
  const university = await repository.findPublicUniversityBySlug(slug);
  return university ? toPublicUniversityDetail(university) : null;
}

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

export async function listUniversitiesForAdmin(repository = universityRepository) {
  return repository.listAdminUniversities();
}

export async function getUniversityForAdmin(id, repository = universityRepository) {
  return repository.findAdminUniversityById(id);
}

/** Throws a plain Error with a `.code` of "SLUG_TAKEN" if the slug collides. */
async function assertSlugAvailable(slug, excludeId, repository) {
  const conflict = await repository.findUniversityBySlugExcludingId(slug, excludeId);
  if (conflict) {
    const error = new Error("A university with this slug already exists.");
    error.code = "SLUG_TAKEN";
    throw error;
  }
}

export async function createUniversityForAdmin(data, repository = universityRepository) {
  await assertSlugAvailable(data.slug, null, repository);
  return repository.createUniversity(data);
}

export async function updateUniversityForAdmin(id, data, repository = universityRepository) {
  await assertSlugAvailable(data.slug, id, repository);
  return repository.updateUniversity(id, data);
}

export async function deleteUniversityForAdmin(id, repository = universityRepository) {
  return repository.deleteUniversity(id);
}
