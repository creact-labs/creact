/**
 * Merge Istanbul coverage-final.json files into one file for fallow's
 * CRAP scoring. Coverage keys are absolute source paths, and each
 * workspace covers a disjoint directory, so merging is object assignment.
 *
 * Usage: node scripts/merge-coverage.mjs <out.json> <in.json...>
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const [out, ...inputs] = process.argv.slice(2);
if (!out || inputs.length === 0) {
  console.error(
    "Usage: node scripts/merge-coverage.mjs <out.json> <in.json...>",
  );
  process.exit(1);
}

/**
 * Istanbul marks unknown source locations with -1 columns (v8 → istanbul
 * conversion under jsdom does this); fallow's parser requires unsigned
 * integers, so clamp them to 0.
 */
const isRecord = (value) => value !== null && typeof value === "object";

const clampLeaf = (value) =>
  typeof value === "number" && value < 0 ? 0 : value;

function clampRecord(record) {
  for (const key of Object.keys(record)) {
    record[key] = clampNegatives(record[key]);
  }
  return record;
}

function clampNegatives(value) {
  if (Array.isArray(value)) return value.map(clampNegatives);
  if (isRecord(value)) return clampRecord(value);
  return clampLeaf(value);
}

const merged = {};
for (const input of inputs) {
  Object.assign(merged, clampNegatives(JSON.parse(readFileSync(input, "utf8"))));
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(merged));
console.log(`Merged ${inputs.length} coverage files → ${out}`);
