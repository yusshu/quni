import type { PropertyKey } from "./steam";

export type UnitSystem = "si" | "english";
export type PressureUnit = "kPa" | "MPa" | "bar" | "psi";
export type TemperatureUnit = "°C" | "K" | "°F";
export type UnitPreferences = { system: UnitSystem; pressure: PressureUnit; temperature: TemperatureUnit };

export const defaultUnits: UnitPreferences = { system: "si", pressure: "kPa", temperature: "°C" };
export const unitPresets: Record<UnitSystem, UnitPreferences> = {
  si: defaultUnits,
  english: { system: "english", pressure: "psi", temperature: "°F" },
};

export function unitFor(key: PropertyKey, units: UnitPreferences) {
  if (key === "P") return units.pressure;
  if (key === "T") return units.temperature;
  if (key === "x") return "fracción";
  if (units.system === "english") {
    if (key === "v") return "ft³/lbm";
    if (key === "s") return "Btu/lbm·°R";
    return "Btu/lbm";
  }
  if (key === "v") return "m³/kg";
  if (key === "s") return "kJ/kg·K";
  return "kJ/kg";
}

export function fromCanonical(key: PropertyKey, value: number, units: UnitPreferences) {
  if (key === "P") {
    if (units.pressure === "MPa") return value / 1000;
    if (units.pressure === "bar") return value / 100;
    if (units.pressure === "psi") return value * 0.14503773773020923;
    return value;
  }
  if (key === "T") {
    if (units.temperature === "K") return value + 273.15;
    if (units.temperature === "°F") return value * 9 / 5 + 32;
    return value;
  }
  if (units.system === "english") {
    if (key === "v") return value * 16.01846337396014;
    if (key === "s") return value * 0.23884589662749594;
    if (key === "u" || key === "h") return value * 0.4299226139294927;
  }
  return value;
}

export function toCanonical(key: PropertyKey, value: number, units: UnitPreferences) {
  if (key === "P") {
    if (units.pressure === "MPa") return value * 1000;
    if (units.pressure === "bar") return value * 100;
    if (units.pressure === "psi") return value / 0.14503773773020923;
    return value;
  }
  if (key === "T") {
    if (units.temperature === "K") return value - 273.15;
    if (units.temperature === "°F") return (value - 32) * 5 / 9;
    return value;
  }
  if (units.system === "english") {
    if (key === "v") return value / 16.01846337396014;
    if (key === "s") return value / 0.23884589662749594;
    if (key === "u" || key === "h") return value / 0.4299226139294927;
  }
  return value;
}

export function convertInput(value: string, key: PropertyKey, previous: UnitPreferences, next: UnitPreferences) {
  if (value.trim() === "") return value;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return String(Number(fromCanonical(key, toCanonical(key, parsed, previous), next).toPrecision(12)));
}
