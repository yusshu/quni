import {
  calculateState,
  region3FromDensity,
  saturationPressureMPa,
  saturationTemperatureK,
  statePT,
  type PropertyKey,
} from "../lib/steam";

function assertClose(name: string, actual: number, expected: number, rel = 2e-8, abs = 1e-10) {
  const error = Math.abs(actual - expected);
  const limit = Math.max(abs, rel * Math.abs(expected));
  if (!Number.isFinite(actual) || error > limit) {
    throw new Error(`${name}: expected ${expected}, got ${actual}, absolute error ${error}, tolerance ${limit}`);
  }
}

function assertEqual<T>(name: string, actual: T, expected: T) {
  if (actual !== expected) throw new Error(`${name}: expected ${expected}, got ${actual}`);
}

function input(key: PropertyKey, value: number) {
  return { key, value };
}

const region1Cases = [
  { name: "R1 300K 3MPa", PkPa: 3000, TC: 300 - 273.15, v: 0.100215168e-2, h: 0.115331273e3, u: 0.112324818e3, s: 0.392294792 },
  { name: "R1 300K 80MPa", PkPa: 80000, TC: 300 - 273.15, v: 0.971180894e-3, h: 0.184142828e3, u: 0.106448356e3, s: 0.368563852 },
  { name: "R1 500K 3MPa", PkPa: 3000, TC: 500 - 273.15, v: 0.120241800e-2, h: 0.975542239e3, u: 0.971934985e3, s: 0.258041912e1 },
];

for (const tc of region1Cases) {
  const st = statePT(tc.PkPa, tc.TC);
  assertEqual(`${tc.name} region`, st.region, "1");
  assertClose(`${tc.name} v`, st.v, tc.v);
  assertClose(`${tc.name} h`, st.h, tc.h);
  assertClose(`${tc.name} u`, st.u, tc.u);
  assertClose(`${tc.name} s`, st.s, tc.s);
}

const region2Cases = [
  { name: "R2 300K 0.0035MPa", PkPa: 3.5, TC: 300 - 273.15, v: 0.394913866e2, h: 0.254991145e4, u: 0.241169160e4, s: 0.852238967e1 },
  { name: "R2 700K 0.0035MPa", PkPa: 3.5, TC: 700 - 273.15, v: 0.923015898e2, h: 0.333568375e4, u: 0.301262819e4, s: 0.101749996e2 },
  { name: "R2 700K 30MPa", PkPa: 30000, TC: 700 - 273.15, v: 0.542946619e-2, h: 0.263149474e4, u: 0.246861076e4, s: 0.517540298e1 },
];

for (const tc of region2Cases) {
  const st = statePT(tc.PkPa, tc.TC);
  assertEqual(`${tc.name} region`, st.region, "2");
  assertClose(`${tc.name} v`, st.v, tc.v);
  assertClose(`${tc.name} h`, st.h, tc.h);
  assertClose(`${tc.name} u`, st.u, tc.u);
  assertClose(`${tc.name} s`, st.s, tc.s);
}

const region3Cases = [
  { name: "R3 650K rho500", PkPa: 0.255837018e2 * 1000, TC: 650 - 273.15, rho: 500, h: 0.186343019e4, u: 0.181226279e4, s: 0.405427273e1 },
  { name: "R3 650K rho200", PkPa: 0.222930643e2 * 1000, TC: 650 - 273.15, rho: 200, h: 0.237512401e4, u: 0.226365868e4, s: 0.485438792e1 },
  { name: "R3 750K rho500", PkPa: 0.783095639e2 * 1000, TC: 750 - 273.15, rho: 500, h: 0.225868845e4, u: 0.210206932e4, s: 0.446971906e1 },
];

for (const tc of region3Cases) {
  const inverted = statePT(tc.PkPa, tc.TC);
  assertEqual(`${tc.name} region`, inverted.region, "3");
  assertClose(`${tc.name} inverted pressure`, inverted.P, tc.PkPa, 0, 1e-7);

  const st = region3FromDensity(tc.rho, tc.TC + 273.15);
  assertClose(`${tc.name} pressure`, st.P, tc.PkPa, 0, 1e-4);
  assertClose(`${tc.name} v`, st.v, 1 / tc.rho, 0, 1e-12);
  assertClose(`${tc.name} h`, st.h, tc.h, 0, 1e-5);
  assertClose(`${tc.name} u`, st.u, tc.u, 0, 1e-5);
  assertClose(`${tc.name} s`, st.s, tc.s, 0, 1e-8);
}

const region5Cases = [
  { name: "R5 1500K 0.5MPa", PkPa: 500, TC: 1500 - 273.15, v: 0.138455090e1, h: 0.521976855e4, u: 0.452749310e4, s: 0.965408875e1 },
  { name: "R5 1500K 30MPa", PkPa: 30000, TC: 1500 - 273.15, v: 0.230761299e-1, h: 0.516723514e4, u: 0.447495124e4, s: 0.772970133e1 },
  { name: "R5 2000K 30MPa", PkPa: 30000, TC: 2000 - 273.15, v: 0.311385219e-1, h: 0.657122604e4, u: 0.563707038e4, s: 0.853640523e1 },
];

for (const tc of region5Cases) {
  const st = statePT(tc.PkPa, tc.TC);
  assertEqual(`${tc.name} region`, st.region, "5");
  assertClose(`${tc.name} v`, st.v, tc.v);
  assertClose(`${tc.name} h`, st.h, tc.h);
  assertClose(`${tc.name} u`, st.u, tc.u);
  assertClose(`${tc.name} s`, st.s, tc.s);
}

const saturationPressureCases = [
  { T: 300, P: 0.353658941e-2 },
  { T: 500, P: 0.263889776e1 },
  { T: 600, P: 0.123443146e2 },
];
for (const tc of saturationPressureCases) {
  assertClose(`R4 Psat ${tc.T}K`, saturationPressureMPa(tc.T), tc.P);
}

const saturationTemperatureCases = [
  { P: 0.1, T: 0.372755919e3 },
  { P: 1, T: 0.453035632e3 },
  { P: 10, T: 0.584149488e3 },
];
for (const tc of saturationTemperatureCases) {
  assertClose(`R4 Tsat ${tc.P}MPa`, saturationTemperatureK(tc.P), tc.T);
}

const saturatedFromPressure = calculateState(input("P", 101.325), input("x", 0.25));
assertEqual("P-x region", saturatedFromPressure.region, "4");
assertEqual("P-x phase", saturatedFromPressure.phase, "mixture");
assertClose("P-x quality", saturatedFromPressure.x ?? NaN, 0.25, 1e-12, 1e-12);

const saturatedFromTemperature = calculateState(input("T", 100), input("x", 1));
assertEqual("T-x phase", saturatedFromTemperature.phase, "saturatedVapor");
assertClose("T-x quality", saturatedFromTemperature.x ?? NaN, 1, 1e-12, 1e-12);

const ambiguousSaturation = calculateState(input("P", 101.325), input("T", 100));
assertEqual("P-T saturation requires extra property", ambiguousSaturation.phase, "undetermined");
if (!ambiguousSaturation.warnings.some((warning) => warning.includes("línea de saturación"))) {
  throw new Error("P-T saturation should explain that another property is required");
}

const duplicate = calculateState(input("P", 100), input("P", 200));
assertEqual("duplicate properties invalid", duplicate.phase, "undetermined");

const highPressureMixtureCases = [
  { P: 20, x: 0, v: 0.00203865, h: 1827.1005 },
  { P: 20, x: 0.13, v: 0.0025352, h: 1903.0579 },
  { P: 20, x: 0.5, v: 0.00394847, h: 2119.2443 },
  { P: 20, x: 0.99, v: 0.00582009, h: 2405.5451 },
  { P: 20, x: 1, v: 0.00585828, h: 2411.388 },
];

for (const tc of highPressureMixtureCases) {
  const st = calculateState(input("P", tc.P * 1000), input("x", tc.x));
  assertEqual(`R4 ${tc.P}MPa x=${tc.x} region`, st.region, "4");
  assertClose(`R4 ${tc.P}MPa x=${tc.x} v`, st.v, tc.v, 0, 1e-7);
  assertClose(`R4 ${tc.P}MPa x=${tc.x} h`, st.h, tc.h, 0, 0.002);
  assertClose(`R4 ${tc.P}MPa x=${tc.x} energy identity`, st.u, st.h - st.P * st.v, 0, 1e-8);
}

const highTemperatureMixtureCases = [
  { T: 625, x: 0, h: 1686.2747 },
  { T: 625, x: 0.13, h: 1798.6443 },
  { T: 625, x: 0.5, h: 2118.4653 },
  { T: 625, x: 0.99, h: 2542.0121 },
  { T: 625, x: 1, h: 2550.6559 },
];

for (const tc of highTemperatureMixtureCases) {
  const st = calculateState(input("T", tc.T - 273.15), input("x", tc.x));
  assertEqual(`R4 ${tc.T}K x=${tc.x} region`, st.region, "4");
  assertClose(`R4 ${tc.T}K x=${tc.x} h`, st.h, tc.h, 0, 0.02);
}

const highPressureEntropyCases = [
  { P: 20, x: 0, s: 4.01538, tolerance: 1e-4 },
  { P: 20, x: 1, s: 4.92991, tolerance: 1e-5 },
  { P: 21.5, x: 0, s: 4.1749, tolerance: 1e-4 },
  { P: 21.5, x: 1, s: 4.7166, tolerance: 1e-4 },
  { P: 22, x: 0, s: 4.3109, tolerance: 1e-4 },
  { P: 22, x: 1, s: 4.5308, tolerance: 1e-4 },
];

for (const tc of highPressureEntropyCases) {
  const st = calculateState(input("P", tc.P * 1000), input("x", tc.x));
  assertClose(`R4 ${tc.P}MPa x=${tc.x} s`, st.s, tc.s, 0, tc.tolerance);
}

const criticalMixture = calculateState(input("P", 22064), input("x", 0.5));
assertEqual("critical mixture region", criticalMixture.region, "4");
assertClose("critical mixture v", criticalMixture.v, 0.00310559, 0, 1e-8);
assertClose("critical mixture h", criticalMixture.h, 2087.55, 0, 0.02);
assertClose("critical mixture s", criticalMixture.s, 4.41202, 0, 1e-5);

console.log("IF97 coverage tests passed");
