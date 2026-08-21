import { prisma } from "./prisma.js";

export async function connectDB() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Connected to PostgreSQL (abroad_bulletin) successfully via Prisma.");
    return true;
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err.message);
    return false;
  }
}

