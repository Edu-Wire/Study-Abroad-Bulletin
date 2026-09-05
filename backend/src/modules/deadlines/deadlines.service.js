import * as deadlineRepository from "./deadlines.repository.js";

export async function listDeadlinesForAdmin(repository = deadlineRepository) {
  return repository.listDeadlines();
}

export async function getDeadlineForAdmin(id, repository = deadlineRepository) {
  return repository.findDeadlineById(id);
}

/** Throws a plain Error with a `.code` of "SLUG_TAKEN" if the slug collides. */
async function assertSlugAvailable(slug, excludeId, repository) {
  const conflict = await repository.findDeadlineBySlugExcludingId(slug, excludeId);
  if (conflict) {
    const error = new Error("A deadline with this slug already exists.");
    error.code = "SLUG_TAKEN";
    throw error;
  }
}

export async function createDeadlineForAdmin(data, repository = deadlineRepository) {
  await assertSlugAvailable(data.slug, null, repository);
  return repository.createDeadline(data);
}

export async function updateDeadlineForAdmin(id, data, repository = deadlineRepository) {
  await assertSlugAvailable(data.slug, id, repository);
  return repository.updateDeadline(id, data);
}

export async function deleteDeadlineForAdmin(id, repository = deadlineRepository) {
  return repository.deleteDeadline(id);
}
