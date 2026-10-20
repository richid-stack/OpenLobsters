import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Event, parseJsonl, validateRun, resourceSchemas } from "../src";

const FX = join(fileURLToPath(new URL(".", import.meta.url)), "../../fixtures");
const json = (p: string) => JSON.parse(readFileSync(join(FX, p), "utf8"));

describe("valid recorded runs", () => {
  for (const f of readdirSync(FX).filter((f) => f.endsWith(".jsonl"))) {
    it(f, () => expect(validateRun(parseJsonl(readFileSync(join(FX, f), "utf8")))).toEqual([]));
  }
});
describe("invalid single events are rejected", () => {
  for (const c of json("invalid/events.json")) it(c.name, () => expect(Event.safeParse(c.event).success).toBe(false));
});
describe("invalid runs are caught by the semantic validator", () => {
  for (const c of json("invalid/runs.json")) {
    it(c.name, () => {
      const errs = validateRun(c.events.map((e: unknown) => Event.parse(e)));
      expect(errs.some((m) => m.includes(c.expect)), `got: ${errs.join(" | ")}`).toBe(true);
    });
  }
});
describe("resources", () => {
  const sample = json("resources.sample.json");
  for (const [k, schema] of Object.entries(resourceSchemas)) it(`valid ${k}`, () => expect(schema.safeParse(sample[k]).success).toBe(true));
  for (const c of json("invalid/resources.json"))
    it(`rejects: ${c.name}`, () => expect((resourceSchemas as Record<string, any>)[c.type].safeParse(c.value).success).toBe(false));
});
