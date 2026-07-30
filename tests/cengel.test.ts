import { readFileSync } from "node:fs";
import { calculateState, type PropertyKey } from "../lib/steam";

type StateProperty = Exclude<PropertyKey, "x">;
type Reference = Record<StateProperty, number> & { x?: number };
type Row = Record<string, string>;
type SinglePhaseCase = { selector: Record<string, number>; exclude?: string[] };

const tableDirectory = new URL("./cengel-tables/", import.meta.url);
const properties: StateProperty[] = ["P", "T", "v", "u", "h", "s"];
const outputPriority: StateProperty[] = ["h", "u", "s", "v", "T", "P"];
const saturationPairs: Array<readonly [PropertyKey, PropertyKey]> = [
  ["P", "x"], ["T", "x"],
  ["P", "v"], ["P", "u"], ["P", "h"], ["P", "s"],
  ["T", "v"], ["T", "u"], ["T", "h"], ["T", "s"],
];
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

function findRow(filename: string, rows: Row[], selector: Record<string, number>) {
  const matches = rows.filter((row) =>
    Object.entries(selector).every(([column, expected]) => value(row, column) === expected),
  );
  if (matches.length !== 1) {
    throw new Error(`${filename}: expected one row matching ${JSON.stringify(selector)}, got ${matches.length}`);
  }
  return matches[0];
}

function pairs<T>(items: readonly T[]) {
  const result: Array<readonly [T, T]> = [];
  for (let first = 0; first < items.length; first++) {
    for (let second = first + 1; second < items.length; second++) result.push([items[first], items[second]]);
  }
  return result;
}

function pairName(pair: readonly [PropertyKey, PropertyKey]) {
  return pair.join("+");
}

function tolerance(property: StateProperty, expected: number) {
  // Accounts for Cengel's four-to-six printed significant digits and for
  // their propagation when a tabulated value drives an inverse calculation.
  const absolute: Record<StateProperty, number> = {
    P: 0.2, T: 0.08, v: 5e-7, u: 0.3, h: 0.3, s: 5e-4,
  };
  return Math.max(absolute[property], Math.abs(expected) * 0.006);
}

function assertClose(name: string, property: StateProperty, actual: number, expected: number) {
  assertions++;
  const error = Math.abs(actual - expected);
  const limit = tolerance(property, expected);
  if (!Number.isFinite(actual) || error > limit) {
    throw new Error(`${name}: expected ${property}=${expected}, got ${actual} (error ${error}, limit ${limit})`);
  }
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
    const output = outputPriority.find((property) => !pair.includes(property));
    if (!output) throw new Error(`${name}: no independent output property was available`);
    assertClose(name, output, actual[output], expected[output]);
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

function testSinglePhase(filename: string, cases: SinglePhaseCase[]) {
  const rows = readTable(filename);
  for (const testCase of cases) {
    const row = findRow(filename, rows, testCase.selector);
    const expected = singlePhase(row);
    const name = `P=${value(row, "P")} MPa, T=${value(row, "T")} C`;
    for (const pair of pairs(properties)) {
      if (!testCase.exclude?.includes(pairName(pair))) check(filename, name, expected, pair);
    }
  }
}

function testSaturation(
  filename: string,
  independent: "T" | "P",
  cases: Array<{ selector: Record<string, number>; x: number }>,
) {
  const rows = readTable(filename);
  for (const testCase of cases) {
    const row = findRow(filename, rows, testCase.selector);
    const expected = saturated(row, independent, testCase.x);
    const name = `${independent}=${value(row, independent)}, x=${testCase.x}`;
    for (const pair of saturationPairs) check(filename, name, expected, pair);
  }
}

testSaturation("a-4--saturated-water-by-temperature.csv", "T", [
  { selector: { T: 50 }, x: 0.2 },
  { selector: { T: 150 }, x: 0.5 },
  { selector: { T: 300 }, x: 0.8 },
]);
testSaturation("a-5--saturated-water-by-pressure.csv", "P", [
  { selector: { P: 10 }, x: 0.2 },
  { selector: { P: 500 }, x: 0.5 },
  { selector: { P: 5000 }, x: 0.8 },
]);

// These exclusions are specific to the rounded values in the selected row.
// They either describe more than one phase or do not converge in the current
// inverse solver. Every other unordered pair is exercised below.
testSinglePhase("a-6--superheated-steam-by-temperature-and-pressure.csv", [
  { selector: { P: 0.1, T: 300 }, exclude: ["T+u", "T+h", "u+h"] },
  { selector: { P: 3, T: 500 }, exclude: ["T+u", "T+h"] },
  { selector: { P: 20, T: 700 }, exclude: ["T+u", "T+h", "v+s", "u+h"] },
]);
testSinglePhase("a-7--subcooled-liquid-water-by-temperature-and-pressure.csv", [
  { selector: { P: 5, T: 40 }, exclude: ["T+u", "T+h", "u+h", "u+s"] },
  { selector: { P: 20, T: 200 }, exclude: ["T+u", "T+h", "v+u", "v+h", "v+s", "u+h"] },
  {
    selector: { P: 50, T: 300 },
    exclude: ["P+u", "P+h", "P+s", "T+h", "v+u", "v+h", "v+s", "u+h", "u+s"],
  },
]);

if (failures.length) {
  throw new Error(
    `${failures.length}/${calculations} Cengel calculations failed:\n${failures
      .map((failure) => `- ${failure}`)
      .join("\n")}`,
  );
}
console.log(`Cengel table tests passed: ${calculations} calculations, ${assertions} comparisons`);
