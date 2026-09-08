import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
// ponytail: pooled Postgres providers (Supabase/Neon session mode, etc.) cap
// total sessions well below pg's own default (10 per Pool). Each process that
// imports this module opens its own Pool, AND worker/boss.js opens a second,
// separate pool at the same DATABASE_POOL_MAX size for pg-boss — so one
// process (API or worker) can reach 2x this number, and API+worker running
// together can reach 4x. Default of 3 keeps API+worker together (12) under a
// 15-session cap with room for an ad-hoc script or test run. Raise via
// DATABASE_POOL_MAX if the provider's own limit is known to be higher.
const max = Number(process.env.DATABASE_POOL_MAX) || 3;
const adapter = new PrismaPg({ connectionString, max });

export const prisma = new PrismaClient({ adapter });
export default prisma;
