import { describe, it, expect, vi } from "vitest";
import { applyReseedKey, SEED_META_ID } from "../utils/reseedKey.js";

/** In-memory stand-in for the `seed_meta` collection. */
function fakeMeta(initial = null) {
  let doc = initial;
  return {
    findOne: vi.fn(async () => doc),
    updateOne: vi.fn(async (_f, update) => { doc = { _id: SEED_META_ID, ...(doc || {}), ...update.$set }; }),
    get doc() { return doc; },
  };
}

describe("RESEED_KEY - reseed from a PaaS dashboard, safely", () => {
  it("does nothing when the variable is unset or blank", async () => {
    const seed = vi.fn();
    expect(await applyReseedKey({ key: undefined, meta: fakeMeta(), seedDatabase: seed })).toEqual({ applied: false, reason: "unset" });
    expect(await applyReseedKey({ key: "   ", meta: fakeMeta(), seedDatabase: seed })).toEqual({ applied: false, reason: "unset" });
    expect(seed).not.toHaveBeenCalled();
  });

  it("a NEW value wipes + reseeds (force) and is remembered", async () => {
    const meta = fakeMeta();
    const seed = vi.fn(async () => ({ seeded: true }));
    const log = vi.fn();
    const r = await applyReseedKey({ key: "2026-11-03a", meta, seedDatabase: seed, log });
    expect(r).toMatchObject({ applied: true, key: "2026-11-03a", previous: null });
    expect(seed).toHaveBeenCalledWith({ force: true });
    expect(meta.doc).toMatchObject({ _id: SEED_META_ID, key: "2026-11-03a" });
    expect(log.mock.calls[0][0]).toMatch(/RESEED_KEY "2026-11-03a" applied/);
  });

  it("the SAME value on the next boot does NOT touch the data (restarts and redeploys are safe)", async () => {
    const meta = fakeMeta({ _id: SEED_META_ID, key: "2026-11-03a" });
    const seed = vi.fn();
    const r = await applyReseedKey({ key: " 2026-11-03a ", meta, seedDatabase: seed });
    expect(r).toEqual({ applied: false, reason: "same-key", key: "2026-11-03a" });
    expect(seed).not.toHaveBeenCalled();
  });

  it("changing the value reseeds again and keeps the previous value for the record", async () => {
    const meta = fakeMeta({ _id: SEED_META_ID, key: "2026-11-03a" });
    const seed = vi.fn(async () => ({ seeded: true }));
    const r = await applyReseedKey({ key: "2026-11-03b", meta, seedDatabase: seed, log: () => {} });
    expect(r).toMatchObject({ applied: true, key: "2026-11-03b", previous: "2026-11-03a" });
    expect(seed).toHaveBeenCalledTimes(1);
    expect(meta.doc).toMatchObject({ key: "2026-11-03b", previous: "2026-11-03a" });
  });
});
