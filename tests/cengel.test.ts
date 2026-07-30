import { readFileSync } from "node:fs";
import { calculateState, type PropertyKey } from "../lib/steam";

type StateProperty = Exclude<PropertyKey, "x">;
type Reference = Record<StateProperty, number> & { x?: number };
type Row = Record<string, string>;

const tableDirectory = new URL("./cengel-tables/", import.meta.url);
const properties: StateProperty[] = ["P", "T", "v", "u", "h", "s"];
const saturationProperties: PropertyKey[] = [...properties, "x"];
const saturationPairs = pairs(saturationProperties);
const failures: string[] = [];
let calculations = 0;
let assertions = 0;

function parseLine(line: string) {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      fields.push(field.trim());
      field = "";
    } else field += character;
  }
  fields.push(field.trim());
  return fields;
}

function readTable(filename: string) {
  const lines = readFileSync(new URL(filename, tableDirectory), "utf8").trim().split(/\r?\n/);
  const headers = parseLine(lines[0]);
  return lines.slice(2).map((line, index) => {
    const values = parseLine(line);
    if (values.length !== headers.length) {
      throw new Error(`${filename}:${index + 3}: expected ${headers.length} columns, got ${values.length}`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function value(row: Row, column: string) {
  const result = Number(row[column].replaceAll(",", ""));
  if (!Number.isFinite(result)) throw new Error(`Invalid ${column} value: ${row[column]}`);
  return result;
}

function pairs<T>(items: readonly T[]) {
  const result: Array<readonly [T, T]> = [];
  for (let first = 0; first < items.length; first++) {
    for (let second = first + 1; second < items.length; second++) result.push([items[first], items[second]]);
  }
  return result;
}

function tolerance(property: StateProperty, expected: number) {
  // Accounts for Cengel's four-to-six printed significant digits and for
  // their propagation when a tabulated value drives an inverse calculation.
  const absolute: Record<StateProperty, number> = {
    P: 0.2, T: 0.08, v: 5e-7, u: 0.3, h: 0.3, s: 5e-4,
  };
  return Math.max(absolute[property], Math.abs(expected) * 0.006);
}

function comparisonFailure(property: StateProperty, actual: number, expected: number) {
  assertions++;
  const error = Math.abs(actual - expected);
  const limit = tolerance(property, expected);
  if (!Number.isFinite(actual) || error > limit) {
    return `${property}: expected ${expected}, got ${actual} (error ${error}, limit ${limit})`;
  }
  return null;
}

function check(table: string, rowName: string, expected: Reference, pair: readonly [PropertyKey, PropertyKey]) {
  calculations++;
  const name = `${table} ${rowName} from ${pair[0]}+${pair[1]}`;
  try {
    const first = { key: pair[0], value: expected[pair[0] as keyof Reference] as number };
    const second = { key: pair[1], value: expected[pair[1] as keyof Reference] as number };
    const actual = calculateState(first, second);
    if (actual.phase === "undetermined") {
      throw new Error(`${name}: undetermined (${actual.warnings.join("; ")})`);
    }
    const mismatches: string[] = [];
    for (const property of properties) {
      if (pair.includes(property)) continue;
      const mismatch = comparisonFailure(property, actual[property], expected[property]);
      if (mismatch) mismatches.push(mismatch);
    }
    if (expected.x !== undefined && !pair.includes("x")) {
      assertions++;
      if (actual.x === null || Math.abs(actual.x - expected.x) > 0.006) {
        mismatches.push(`x: expected ${expected.x}, got ${actual.x}`);
      }
    }
    if (mismatches.length) throw new Error(`${name}: ${mismatches.join("; ")}`);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : `${name}: ${String(error)}`);
  }
}

function singlePhase(row: Row): Reference {
  return {
    P: value(row, "P") * 1000, T: value(row, "T"), v: value(row, "v"),
    u: value(row, "u"), h: value(row, "h"), s: value(row, "s"),
  };
}

function saturated(row: Row, independent: "T" | "P", x: number): Reference {
  const interpolate = (property: "v" | "u" | "h" | "s") =>
    value(row, `${property}f`) + x * (value(row, `${property}g`) - value(row, `${property}f`));
  return {
    P: value(row, independent === "T" ? "Psat" : "P"),
    T: value(row, independent === "T" ? "T" : "Tsat"),
    v: interpolate("v"), u: interpolate("u"), h: interpolate("h"), s: interpolate("s"), x,
  };
}

function testSinglePhase(filename: string) {
  const rows = readTable(filename);
  rows.forEach((row, index) => {
    const expected = singlePhase(row);
    const name = `row ${index + 3}, P=${value(row, "P")} MPa, T=${value(row, "T")} C`;
    for (const pair of pairs(properties)) check(filename, name, expected, pair);
  });
}

function testSaturation(filename: string, independent: "T" | "P") {
  const rows = readTable(filename);
  rows.forEach((row, index) => {
    for (const x of [0, 1]) {
      const expected = saturated(row, independent, x);
      const name = `row ${index + 3}, ${independent}=${value(row, independent)}, x=${x}`;
      for (const pair of saturationPairs) check(filename, name, expected, pair);
    }
  });
}

testSaturation("a-4--saturated-water-by-temperature.csv", "T");
testSaturation("a-5--saturated-water-by-pressure.csv", "P");
testSinglePhase("a-6--superheated-steam-by-temperature-and-pressure.csv");
testSinglePhase("a-7--subcooled-liquid-water-by-temperature-and-pressure.csv");

if (failures.length) {
  console.error(`\n${failures.length}/${calculations} Cengel calculations failed:`);
  for (const failure of failures) console.error(`- ${failure}`);
  throw new Error(`${failures.length}/${calculations} Cengel calculations failed; see the list above`);
}
console.log(`Cengel table tests passed: ${calculations} calculations, ${assertions} comparisons`);
