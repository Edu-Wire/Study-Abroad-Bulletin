import { prisma } from "../../config/prisma.js";

export const SETTINGS_ID = "singleton";

export async function findSettings() {
  return prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
}

export async function upsertSettings(data) {
  return prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
}
