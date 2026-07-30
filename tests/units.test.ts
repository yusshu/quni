import assert from "node:assert/strict";
import { fromCanonical, toCanonical, unitPresets, type UnitPreferences } from "../lib/units";

const siVariants: UnitPreferences[] = [
  { system: "si", pressure: "kPa", temperature: "°C" },
  { system: "si", pressure: "MPa", temperature: "K" },
  { system: "si", pressure: "bar", temperature: "°C" },
];
const preferences = [...siVariants, unitPresets.english];
const samples = { P: 101.325, T: 100, v: 1.672, u: 2506, h: 2676, s: 7.355, x: 0.85 } as const;

for (const units of preferences) {
  for (const [key, value] of Object.entries(samples)) {
    const displayed = fromCanonical(key as keyof typeof samples, value, units);
    const restored = toCanonical(key as keyof typeof samples, displayed, units);
    assert.ok(Math.abs(restored - value) <= Math.max(1, Math.abs(value)) * 1e-12, `${key} did not round-trip in ${JSON.stringify(units)}`);
  }
}

assert.equal(fromCanonical("P", 1000, { ...unitPresets.si, pressure: "MPa" }), 1);
assert.equal(fromCanonical("P", 100, { ...unitPresets.si, pressure: "bar" }), 1);
assert.equal(fromCanonical("T", 0, { ...unitPresets.si, temperature: "K" }), 273.15);
assert.equal(fromCanonical("T", 0, unitPresets.english), 32);
console.log("Unit conversion tests passed");
