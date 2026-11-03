/**
 * RESEED_KEY — reload the demo college from the dashboard of a host that has
 * no shell (Render free tier, Railway, Fly.io, Heroku-style PaaS).
 *
 *   1. In the host's environment variables set   RESEED_KEY = <any new value>
 *      (a date works well: 2026-11-03a)
 *   2. Redeploy / restart the API.
 *
 * On boot the API compares the value with the one remembered in the tiny
 * `seed_meta` collection. Different → every collection is wiped and the demo
 * college is loaded, then the value is remembered. Same → nothing happens, so
 * ordinary restarts and deploys never lose data. To reseed again, change the
 * value; remove the variable when you are done.
 *
 * `seed_meta` is not a Mongoose model on purpose: the seeder clears model
 * collections only, so the marker survives the wipe. Nothing else reads it.
 */
export const SEED_META_ID = "reseed";

export async function applyReseedKey({ key, meta, seedDatabase, log = console.log }) {
  const wanted = String(key ?? "").trim();
  if (!wanted) return { applied: false, reason: "unset" };
  const prev = await meta.findOne({ _id: SEED_META_ID });
  if (prev?.key === wanted) return { applied: false, reason: "same-key", key: wanted };
  await seedDatabase({ force: true });
  await meta.updateOne({ _id: SEED_META_ID }, { $set: { key: wanted, at: new Date(), previous: prev?.key || null } }, { upsert: true });
  log(`🌱 RESEED_KEY "${wanted}" applied — database wiped and the demo college reloaded (password 123456 · admin@attendx.com). Change the value to reseed again; remove it when done.`);
  return { applied: true, key: wanted, previous: prev?.key || null };
}
