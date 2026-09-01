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
