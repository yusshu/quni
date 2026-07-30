import Decimal from "decimal.js";

export type PropertyKey = "P" | "T" | "v" | "u" | "h" | "s" | "x";
export type PhaseKey = "compressedLiquid" | "saturatedLiquid" | "mixture" | "saturatedVapor" | "superheatedVapor" | "supercritical" | "undetermined";

export type TraceStep = {
  title: string;
  summary: string;
  tone?: "info" | "success" | "warning" | "danger";
  details?: Array<{ label: string; value: string }>;
};

export type State = {
  phase: PhaseKey;
  P: number;
  T: number;
  v: number;
  u: number;
  h: number;
  s: number;
  x: number | null;
  warnings: string[];
  trace: TraceStep[];
  region?: "1" | "2" | "3" | "4" | "5";
};

type BaseState = Omit<State, "warnings" | "trace" | "x" | "phase"> & { phase?: PhaseKey; x?: number | null };
type SatPoint = { T: number; P: number; vf: number; vg: number; uf: number; ug: number; hf: number; hg: number; sf: number; sg: number };

export const critical = { T: 373.946, P: 22064 };
const R = 0.461526;
const T_CRIT_K = 647.096;
const P_CRIT_MPA = 22.064;
const EPS = 1e-8;

export const propertyLabels: Record<PropertyKey, string> = { P: "Presión", T: "Temperatura", v: "Volumen específico", u: "Energía interna específica", h: "Entalpía específica", s: "Entropía específica", x: "Calidad" };
export const propertyUnits: Record<PropertyKey, string> = { P: "kPa", T: "°C", v: "m³/kg", u: "kJ/kg", h: "kJ/kg", s: "kJ/kg·K", x: "fracción" };
export const phaseLabels: Record<PhaseKey, string> = { compressedLiquid: "Líquido comprimido", saturatedLiquid: "Líquido saturado", mixture: "Mezcla saturada", saturatedVapor: "Vapor saturado", superheatedVapor: "Vapor sobrecalentado", supercritical: "Supercrítico", undetermined: "Indeterminado" };
export const phaseColors: Record<PhaseKey, string> = { compressedLiquid: "var(--compressed-liquid)", saturatedLiquid: "var(--saturated-liquid)", mixture: "var(--mixture)", saturatedVapor: "var(--saturated-vapor)", superheatedVapor: "var(--superheated-vapor)", supercritical: "var(--supercritical)", undetermined: "var(--undetermined)" };

function d(value: number) { return new Decimal(value); }
function cToK(T_C: number) { return d(T_C).plus(273.15).toNumber(); }
function kToC(T_K: number) { return d(T_K).minus(273.15).toNumber(); }
function kPaToMPa(P_kPa: number) { return d(P_kPa).div(1000).toNumber(); }
function mPaToKPa(P_MPa: number) { return d(P_MPa).mul(1000).toNumber(); }
function pow(base: number, exp: number) { return Math.pow(base, exp); }
function trace(title: string, summary: string, details?: TraceStep["details"], tone: TraceStep["tone"] = "info"): TraceStep { return { title, summary, details, tone }; }

const r1I = [0,0,0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,2,2,3,3,3,4,4,4,5,8,8,21,23,29,30,31,32];
const r1J = [-2,-1,0,1,2,3,4,5,-9,-7,-1,0,1,3,-3,0,1,3,17,-4,0,6,-5,-2,10,-8,-11,-6,-29,-31,-38,-39,-40,-41];
const r1N = [0.14632971213167,-0.84548187169114,-3.756360367204,3.3855169168385,-0.95791963387872,0.15772038513228,-0.016616417199501,0.00081214629983568,0.00028319080123804,-0.00060706301565874,-0.018990068218419,-0.032529748770505,-0.021841717175414,-0.00005283835796993,-0.00047184321073267,-0.00030001780793026,0.000047661393906987,-0.0000044141845330846,-7.2694996297594e-16,-0.000031679644845054,-0.0000028270797985312,-8.5205128120103e-10,-0.0000022425281908,-0.00000065171222895601,-1.4341729937924e-13,-0.00000040516996860117,-1.2734301741641e-9,-1.7424871230634e-10,-6.8762131295531e-19,1.4478307828521e-20,2.6335781662795e-23,-1.1947622640071e-23,1.8228094581404e-24,-9.3537087292458e-26];

const r2J0 = [0,1,-5,-4,-3,-2,-1,2,3];
const r2N0 = [-9.6927686500217,10.086655968018,-0.005608791128302,0.071452738081455,-0.40710498223928,1.4240819171444,-4.383951131945,-0.28408632460772,0.021268463753307];
const r2I = [1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,5,6,6,6,7,7,7,8,8,9,10,10,10,16,16,18,20,20,20,21,22,23,24,24,24];
const r2J = [0,1,2,3,6,1,2,4,7,36,0,1,3,6,35,1,2,3,7,3,16,35,0,11,25,8,36,13,4,10,14,29,50,57,20,35,48,21,53,39,26,40,58];
const r2N = [-0.0017731742473213,-0.017834862292358,-0.045996013696365,-0.057581259083432,-0.05032527872793,-0.000033032641670203,-0.00018948987516315,-0.0039392777243355,-0.043797295650573,-0.000026674547914087,2.0481737692309e-8,4.3870667284435e-7,-0.00003227767723857,-0.0015033924542148,-0.040668253562649,-7.8847309559367e-10,1.2790717852285e-8,4.8225372718507e-7,2.2922076337661e-6,-1.6714766451061e-11,-0.0021171472321355,-23.895741934104,-5.905956432427e-18,-1.2621808899101e-6,-0.038946842435739,1.1256211360459e-11,-8.2311340897998,1.9809712802088e-8,1.0406965210174e-19,-1.0234747095929e-13,-1.0018179379511e-9,-8.0882908646985e-11,0.10693031879409,-0.33662250574171,8.9185845355421e-25,3.0629316876232e-13,-4.2002467698208e-6,-5.9056029685639e-26,3.7826947613457e-6,-1.2768608934681e-15,7.3087610595061e-29,5.5414715350778e-17,-9.436970724121e-7];

const r5J0 = [0,1,-3,-2,-1,2];
const r5N0 = [-13.179983674201,6.8540841634434,-0.024805148933466,0.36901534980333,-3.1161318213925,-0.32961626538917];
const r3I = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,4,4,4,4,5,5,5,6,6,6,7,8,9,9,10,10,11];
const r3J = [0,0,1,2,7,10,12,23,2,6,15,17,0,2,6,7,22,26,0,2,4,16,26,0,2,4,26,1,3,26,0,2,26,2,26,2,26,0,1,26];
const r3N = [1.0658070028513,-15.732845290239,20.944396974307,-7.6867707878716,2.6185947787954,-2.808078114862,1.2053369696517,-0.0084566812812502,-1.2654315477714,-1.1524407806681,0.88521043984318,-0.64207765181607,0.38493460186671,-0.85214708824206,4.8972281541877,-3.0502617256965,0.039420536879154,0.12558408424308,-0.2799932969871,1.389979956946,-2.018991502357,-0.0082147637173963,-0.47596035734923,0.0439840744735,-0.44476435428739,0.90572070719733,0.70522450087967,0.10770512626332,-0.32913623258954,-0.50871062041158,-0.022175400873096,0.094260751665092,0.16436278447961,-0.013503372241348,-0.014834345352472,0.00057922953628084,0.0032308904703711,0.000080964802996215,-0.00016557679795037,-0.000044923899061815];
const r5I = [1,1,1,2,2,3];
const r5J = [1,2,3,3,9,7];
const r5N = [0.0015736404855259,0.00090153761673944,-0.0050270077677648,0.0000022440037409485,-0.0000041163275453471,0.000000037919454822955];
const satN = [0.11670521452767e4,-0.72421316703206e6,-0.17073846940092e2,0.12020824702470e5,-0.32325550322333e7,0.14915108613530e2,-0.48232657361591e4,0.40511340542057e6,-0.23855557567849,0.65017534844798e3];

function region1(P_MPa: number, T_K: number): BaseState {
  const pi = P_MPa / 16.53;
  const tau = 1386 / T_K;
  let gamma = 0, gp = 0, gt = 0;
  for (let i = 0; i < r1N.length; i++) {
    const a = 7.1 - pi;
    const b = tau - 1.222;
    gamma += r1N[i] * pow(a, r1I[i]) * pow(b, r1J[i]);
    gp += -r1N[i] * r1I[i] * pow(a, r1I[i] - 1) * pow(b, r1J[i]);
    gt += r1N[i] * pow(a, r1I[i]) * r1J[i] * pow(b, r1J[i] - 1);
  }
  const rt = R * T_K;
  return { region: "1", phase: "compressedLiquid", P: mPaToKPa(P_MPa), T: kToC(T_K), v: (pi * gp * rt) / (P_MPa * 1000), h: tau * gt * rt, u: (tau * gt - pi * gp) * rt, s: (tau * gt - gamma) * R, x: null };
}

function region2(P_MPa: number, T_K: number): BaseState {
  const pi = P_MPa;
  const tau = 540 / T_K;
  let g0 = Math.log(pi), g0p = 1 / pi, g0t = 0;
  for (let i = 0; i < r2N0.length; i++) {
    g0 += r2N0[i] * pow(tau, r2J0[i]);
    g0t += r2N0[i] * r2J0[i] * pow(tau, r2J0[i] - 1);
  }
  let gr = 0, grp = 0, grt = 0;
  for (let i = 0; i < r2N.length; i++) {
    const b = tau - 0.5;
    gr += r2N[i] * pow(pi, r2I[i]) * pow(b, r2J[i]);
    grp += r2N[i] * r2I[i] * pow(pi, r2I[i] - 1) * pow(b, r2J[i]);
    grt += r2N[i] * pow(pi, r2I[i]) * r2J[i] * pow(b, r2J[i] - 1);
  }
  const rt = R * T_K;
  const gamma = g0 + gr;
  const gp = g0p + grp;
  const gt = g0t + grt;
  return { region: "2", phase: "superheatedVapor", P: mPaToKPa(P_MPa), T: kToC(T_K), v: (pi * gp * rt) / (P_MPa * 1000), h: tau * gt * rt, u: (tau * gt - pi * gp) * rt, s: (tau * gt - gamma) * R, x: null };
}

export function region3FromDensity(rho: number, T_K: number): BaseState & { P_MPa: number } {
  const delta = rho / 322;
  const tau = 647.096 / T_K;
  let phi = r3N[0] * Math.log(delta);
  let phid = r3N[0] / delta;
  let phit = 0;
  for (let i = 1; i < r3N.length; i++) {
    phi += r3N[i] * pow(delta, r3I[i]) * pow(tau, r3J[i]);
    phid += r3N[i] * r3I[i] * pow(delta, r3I[i] - 1) * pow(tau, r3J[i]);
    phit += r3N[i] * pow(delta, r3I[i]) * r3J[i] * pow(tau, r3J[i] - 1);
  }
  const P_MPa = (rho * R * T_K * delta * phid) / 1000;
  const u = R * T_K * tau * phit;
  const h = R * T_K * (tau * phit + delta * phid);
  const s = R * (tau * phit - phi);
  return {
    region: "3",
    phase: P_MPa > P_CRIT_MPA && T_K > T_CRIT_K ? "supercritical" : "compressedLiquid",
    P: mPaToKPa(P_MPa),
    T: kToC(T_K),
    v: 1 / rho,
    u,
    h,
    s,
    x: null,
    P_MPa,
  };
}

function region3PressureResidual(rho: number, T_K: number, P_MPa: number) {
  return region3FromDensity(rho, T_K).P_MPa - P_MPa;
}

function solveRegion3Density(P_MPa: number, T_K: number) {
  const samples: Array<{ rho: number; residual: number }> = [];
  const roots: Array<{ rho: number; residual: number }> = [];
  if (Math.abs(P_MPa - P_CRIT_MPA) < 1e-8 && Math.abs(T_K - T_CRIT_K) < 1e-8) {
    const root = { rho: 322, residual: region3PressureResidual(322, T_CRIT_K, P_CRIT_MPA) };
    return { samples: [root], roots: [root], root };
  }
  const minRho = 0.1;
  const maxRho = 1200;
  const count = 1600;
  let prevRho = minRho;
  let prevResidual = region3PressureResidual(prevRho, T_K, P_MPa);
  samples.push({ rho: prevRho, residual: prevResidual });
  for (let i = 1; i <= count; i++) {
    const rho = minRho * pow(maxRho / minRho, i / count);
    const residual = region3PressureResidual(rho, T_K, P_MPa);
    if (Number.isFinite(residual) && Number.isFinite(prevResidual)) {
      if (residual === 0 || residual * prevResidual < 0) {
        let lo = prevRho;
        let hi = rho;
        let flo = prevResidual;
        let mid = rho;
        let fmid = residual;
        for (let j = 0; j < 120; j++) {
          mid = (lo + hi) / 2;
          fmid = region3PressureResidual(mid, T_K, P_MPa);
          if (Math.abs(fmid) < Math.max(1e-12, P_MPa * 1e-13)) break;
          if (flo * fmid <= 0) {
            hi = mid;
          } else {
            lo = mid;
            flo = fmid;
          }
        }
        roots.push({ rho: mid, residual: fmid });
      }
    }
    if (i % 150 === 0) samples.push({ rho, residual });
    prevRho = rho;
    prevResidual = residual;
  }
  if (roots.length === 0) return { samples, roots: [], root: null };
  const psat = T_K < T_CRIT_K ? saturationPressureMPa(T_K) : null;
  const unique = roots
    .filter((root, index) => roots.findIndex((other) => Math.abs(other.rho - root.rho) / root.rho < 1e-8) === index)
    .sort((a, b) => a.rho - b.rho);
  const selected = psat !== null && P_MPa >= psat ? unique.reduce((a, b) => (a.rho > b.rho ? a : b)) : unique[0];
  return { samples, roots: unique, root: selected };
}

function saturationEndpoints(P_MPa: number, T_K: number) {
  if (T_K <= 623.15) return { f: region1(P_MPa, T_K), g: region2(P_MPa, T_K) };
  if (Math.abs(T_K - T_CRIT_K) < 1e-8 && Math.abs(P_MPa - P_CRIT_MPA) < 1e-8) {
    const criticalState = region3FromDensity(322, T_CRIT_K);
    return { f: criticalState, g: criticalState };
  }

  const solved = solveRegion3Density(P_MPa, T_K);
  const maxLiquidDensity = 1 / region1(saturationPressureMPa(623.15), 623.15).v;
  const liquidRoot = solved.roots
    .filter((root) => root.rho >= 322 && root.rho <= maxLiquidDensity * (1 + 1e-8))
    .at(-1);
  const vapourRoot = solved.roots.find((root) => root.rho < 322);
  if (!liquidRoot || !vapourRoot) return null;
  return {
    f: region3FromDensity(liquidRoot.rho, T_K),
    g: region3FromDensity(vapourRoot.rho, T_K),
  };
}

function region3(P_MPa: number, T_K: number): { state?: BaseState; steps: TraceStep[]; warning?: string } {
  const solved = solveRegion3Density(P_MPa, T_K);
  const details = solved.samples.slice(0, 8).map((sample) => ({ label: `ρ ${formatValue(sample.rho)} kg/m³`, value: `p(ρ,T)-P = ${formatValue(sample.residual)} MPa` }));
  const steps = [trace("Resolver densidad en Región 3", "La ecuación básica de Región 3 usa ρ y T; para entradas P,T se resuelve p(ρ,T)=P.", details)];
  if (!solved.root) return { steps, warning: "No fue posible encontrar una raíz física de densidad para Región 3." };
  const state = region3FromDensity(solved.root.rho, T_K);
  steps.push(trace("Evaluar Helmholtz Región 3", "Con ρ resuelta, se calculan v, u, h y s desde φ(δ,τ) y sus derivadas.", [{ label: "ρ", value: `${formatValue(solved.root.rho)} kg/m³` }, { label: "residuo final", value: `${formatValue(solved.root.residual)} MPa` }], "success"));
  return { state, steps };
}
function region5(P_MPa: number, T_K: number): BaseState {
  const pi = P_MPa;
  const tau = 1000 / T_K;
  let g0 = Math.log(pi), g0p = 1 / pi, g0t = 0;
  for (let i = 0; i < r5N0.length; i++) {
    g0 += r5N0[i] * pow(tau, r5J0[i]);
    g0t += r5N0[i] * r5J0[i] * pow(tau, r5J0[i] - 1);
  }
  let gr = 0, grp = 0, grt = 0;
  for (let i = 0; i < r5N.length; i++) {
    gr += r5N[i] * pow(pi, r5I[i]) * pow(tau, r5J[i]);
    grp += r5N[i] * r5I[i] * pow(pi, r5I[i] - 1) * pow(tau, r5J[i]);
    grt += r5N[i] * pow(pi, r5I[i]) * r5J[i] * pow(tau, r5J[i] - 1);
  }
  const rt = R * T_K;
  const gamma = g0 + gr;
  const gp = g0p + grp;
  const gt = g0t + grt;
  return { region: "5", phase: "superheatedVapor", P: mPaToKPa(P_MPa), T: kToC(T_K), v: (pi * gp * rt) / (P_MPa * 1000), h: tau * gt * rt, u: (tau * gt - pi * gp) * rt, s: (tau * gt - gamma) * R, x: null };
}

export function saturationPressureMPa(T_K: number) {
  const theta = T_K + satN[8] / (T_K - satN[9]);
  const A = theta * theta + satN[0] * theta + satN[1];
  const B = satN[2] * theta * theta + satN[3] * theta + satN[4];
  const C = satN[5] * theta * theta + satN[6] * theta + satN[7];
  return pow((2 * C) / (-B + Math.sqrt(B * B - 4 * A * C)), 4);
}

export function saturationTemperatureK(P_MPa: number) {
  const beta = pow(P_MPa, 0.25);
  const E = beta * beta + satN[2] * beta + satN[5];
  const F = satN[0] * beta * beta + satN[3] * beta + satN[6];
  const G = satN[1] * beta * beta + satN[4] * beta + satN[7];
  const D = (2 * G) / (-F - Math.sqrt(F * F - 4 * E * G));
  return (satN[9] + D - Math.sqrt((satN[9] + D) ** 2 - 4 * (satN[8] + satN[9] * D))) / 2;
}

function p23MPa(T_K: number) { return 348.05185628969 - 1.1671859879975 * T_K + 0.0010192970039326 * T_K * T_K; }

function baseFromPT(P_MPa: number, T_K: number): { state?: BaseState; steps: TraceStep[]; warning?: string } {
  const steps = [trace("Normalizar entradas", "Se convierten las entradas de la app a unidades IF97.", [{ label: "P", value: `${P_MPa} MPa` }, { label: "T", value: `${T_K} K` }])];
  if (T_K < 273.15 || P_MPa <= 0) return { steps, warning: "IF97 no cubre temperaturas menores que 273.15 K ni presiones no positivas." };
  if (T_K > 2273.15 || P_MPa > 100) return { steps, warning: "Estado fuera del rango general IF97." };
  if (T_K > 1073.15) {
    if (P_MPa > 50) return { steps, warning: "Region 5 IF97 solo cubre hasta 50 MPa." };
    steps.push(trace("Seleccionar Región 5", "T está por encima de 1073.15 K; se usa la formulación de alta temperatura.", undefined, "success"));
    return { state: region5(P_MPa, T_K), steps };
  }
  if (T_K <= 623.15) {
    const psat = saturationPressureMPa(T_K);
    steps.push(trace("Comprobar saturación", "Se calcula Psat(T) con la ecuación de Región 4.", [{ label: "Psat", value: `${formatValue(mPaToKPa(psat))} kPa` }]));
    if (Math.abs(P_MPa - psat) <= Math.max(1e-5, psat * 1.5e-3)) return { steps, warning: "P y T ubican el estado sobre la línea de saturación. Ingresa calidad, v, u, h o s para determinarlo." };
    if (P_MPa > psat) {
      steps.push(trace("Seleccionar Región 1", "P > Psat(T), por lo tanto el estado es líquido comprimido/subenfriado.", undefined, "success"));
      return { state: region1(P_MPa, T_K), steps };
    }
    steps.push(trace("Seleccionar Región 2", "P < Psat(T), por lo tanto el estado es vapor sobrecalentado.", undefined, "success"));
    return { state: region2(P_MPa, T_K), steps };
  }
  const boundary = p23MPa(T_K);
  steps.push(trace("Evaluar frontera 2/3", "Para T > 623.15 K se compara P con la frontera p23(T).", [{ label: "p23", value: `${formatValue(mPaToKPa(boundary))} kPa` }]));
  if (P_MPa <= boundary) {
    steps.push(trace("Seleccionar Región 2", "P está por debajo de p23(T).", undefined, "success"));
    return { state: region2(P_MPa, T_K), steps };
  }
  steps.push(trace("Seleccionar Región 3", "P está por encima de la frontera p23(T); se usa la ecuación de Helmholtz para fluido denso.", undefined, "success"));
  const r3 = region3(P_MPa, T_K);
  return { state: r3.state, steps: [...steps, ...r3.steps], warning: r3.warning };
}

function complete(base: BaseState, warnings: string[], steps: TraceStep[]): State {
  const phase = base.phase ?? (base.P > critical.P && base.T > critical.T ? "supercritical" : "undetermined");
  return { phase, P: base.P, T: base.T, v: base.v, u: base.u, h: base.h, s: base.s, x: base.x ?? null, warnings, trace: steps, region: base.region };
}

function invalid(message: string, steps: TraceStep[] = []): State { return { phase: "undetermined", P: NaN, T: NaN, v: NaN, u: NaN, h: NaN, s: NaN, x: null, warnings: [message], trace: [...steps, trace("No determinado", message, undefined, "danger")] }; }

function saturatedFromP(P_kPa: number): { sat?: SatPoint; steps: TraceStep[]; warning?: string } {
  const P_MPa = kPaToMPa(P_kPa);
  const steps = [trace("Buscar saturación", "Se calcula Tsat(P) usando Región 4.", [{ label: "P", value: `${P_kPa} kPa` }])];
  if (P_MPa < 0.000611213 || P_MPa > P_CRIT_MPA) return { steps, warning: "La presión está fuera del rango de saturación IF97." };
  const T_K = saturationTemperatureK(P_MPa);
  const endpoints = saturationEndpoints(P_MPa, T_K);
  if (!endpoints) return { steps, warning: "No fue posible resolver los estados saturados con Region 3." };
  const { f, g } = endpoints;
  steps.push(trace("Evaluar liquido y vapor saturado", "Se usan las regiones IF97 correspondientes a ambos lados de la campana.", [{ label: "Tsat", value: `${formatValue(kToC(T_K))} C` }], "success"));
  return { sat: { T: kToC(T_K), P: P_kPa, vf: f.v, vg: g.v, uf: f.u, ug: g.u, hf: f.h, hg: g.h, sf: f.s, sg: g.s }, steps };
}

function saturatedFromT(T_C: number): { sat?: SatPoint; steps: TraceStep[]; warning?: string } {
  const T_K = cToK(T_C);
  const steps = [trace("Buscar saturación", "Se calcula Psat(T) usando Región 4.", [{ label: "T", value: `${T_C} °C` }])];
  if (T_K < 273.15 || T_K > T_CRIT_K) return { steps, warning: "La temperatura está fuera del rango de saturación IF97." };
  const P_MPa = saturationPressureMPa(T_K);
  const endpoints = saturationEndpoints(P_MPa, T_K);
  if (!endpoints) return { steps, warning: "No fue posible resolver los estados saturados con Region 3." };
  const { f, g } = endpoints;
  steps.push(trace("Evaluar liquido y vapor saturado", "Se usan las regiones IF97 correspondientes a ambos lados de la campana.", [{ label: "Psat", value: `${formatValue(mPaToKPa(P_MPa))} kPa` }], "success"));
  return { sat: { T: T_C, P: mPaToKPa(P_MPa), vf: f.v, vg: g.v, uf: f.u, ug: g.u, hf: f.h, hg: g.h, sf: f.s, sg: g.s }, steps };
}

function mixture(sat: SatPoint, x: number, steps: TraceStep[]): State {
  const q = Math.max(0, Math.min(1, x));
  const phase: PhaseKey = q === 0 ? "saturatedLiquid" : q === 1 ? "saturatedVapor" : "mixture";
  const detail = (name: string, f: number, g: number, value: number) => ({ label: name, value: `${formatValue(f)} + ${formatValue(q)}(${formatValue(g)} - ${formatValue(f)}) = ${formatValue(value)}` });
  const v = sat.vf + q * (sat.vg - sat.vf), u = sat.uf + q * (sat.ug - sat.uf), h = sat.hf + q * (sat.hg - sat.hf), s = sat.sf + q * (sat.sg - sat.sf);
  steps.push(trace("Aplicar relación de mezcla", "Para una mezcla saturada se usa y = yf + x(y_g - y_f).", [detail("v", sat.vf, sat.vg, v), detail("u", sat.uf, sat.ug, u), detail("h", sat.hf, sat.hg, h), detail("s", sat.sf, sat.sg, s)], "success"));
  return { phase, P: sat.P, T: sat.T, v, u, h, s, x: q, warnings: [], trace: steps, region: "4" };
}

function qualityFrom(prop: Exclude<PropertyKey, "P" | "T" | "x">, value: number, sat: SatPoint) {
  const f = sat[`${prop}f` as keyof SatPoint] as number;
  const g = sat[`${prop}g` as keyof SatPoint] as number;
  return (value - f) / (g - f);
}

function propertyOf(state: State | BaseState, key: Exclude<PropertyKey, "x">) { return state[key]; }

function solveOneKnown(knownKey: "P" | "T", knownValue: number, targetKey: Exclude<PropertyKey, "P" | "T" | "x">, targetValue: number, baseSteps: TraceStep[]): State | null {
  const steps = [...baseSteps, trace("Resolver una variable", `Se itera ${knownKey === "P" ? "T" : "P"} hasta igualar ${targetKey}.`, [{ label: "Objetivo", value: `${propertyLabels[targetKey]} = ${targetValue} ${propertyUnits[targetKey]}` }])];
  let lo = knownKey === "P" ? 0.01 : 0.7;
  let hi = knownKey === "P" ? 800 : 100000;
  let best: State | null = null;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const P = knownKey === "P" ? knownValue : mid;
    const T = knownKey === "T" ? knownValue : mid;
    const result = statePT(P, T, []);
    if (result.phase === "undetermined" || !Number.isFinite(result[targetKey])) { lo = mid; continue; }
    const residual = result[targetKey] - targetValue;
    best = result;
    if (i < 5 || i % 15 === 0) steps.push(trace(`Iteración ${i + 1}`, "Se evalúa una propuesta y se actualiza el intervalo.", [{ label: knownKey === "P" ? "T" : "P", value: formatValue(mid) }, { label: "residuo", value: formatValue(residual) }]));
    if (Math.abs(residual) <= Math.max(1e-7, Math.abs(targetValue) * 1e-7)) break;
    if (targetKey === "v" || targetKey === "s") {
      if (knownKey === "P") residual < 0 ? lo = mid : hi = mid;
      else residual > 0 ? lo = mid : hi = mid;
    } else {
      residual < 0 ? lo = mid : hi = mid;
    }
  }
  if (!best) return null;
  best.trace = [...steps, trace("Convergencia", "Se obtuvo un estado consistente con la propiedad objetivo dentro de tolerancia.", undefined, "success")];
  best.warnings = [...best.warnings, "Estado obtenido por solución numérica; revisar el proceso para ver la convergencia."];
  return best;
}

export function statePT(P_kPa: number, T_C: number, prefix: TraceStep[] = []): State {
  const result = baseFromPT(kPaToMPa(P_kPa), cToK(T_C));
  const steps = [...prefix, ...result.steps];
  if (result.warning) return invalid(result.warning, steps);
  if (!result.state) return invalid("No fue posible evaluar P,T.", steps);
  return complete(result.state, [], [...steps, trace("Calcular propiedades", "Se derivan v, u, h y s desde la energía libre adimensional de la región seleccionada.", [{ label: "Región", value: result.state.region ?? "—" }], "success")]);
}

function solveFromTwoUnknowns(a: { key: PropertyKey; value: number }, b: { key: PropertyKey; value: number }, steps: TraceStep[]): State {
  const targetA = a.key as Exclude<PropertyKey, "x">;
  const targetB = b.key as Exclude<PropertyKey, "x">;
  let p = 101.325;
  let t = 100;
  const iterSteps: TraceStep[] = [];
  for (let i = 0; i < 50; i++) {
    const st = statePT(p, t, []);
    if (st.phase === "undetermined") { t += 8; p *= 0.95; continue; }
    const r1 = propertyOf(st, targetA) - a.value;
    const r2 = propertyOf(st, targetB) - b.value;
    if (i < 8 || i % 10 === 0) iterSteps.push(trace(`Iteración ${i + 1}`, "Newton finito sobre P,T para igualar las dos propiedades seleccionadas.", [{ label: "P", value: `${formatValue(p)} kPa` }, { label: "T", value: `${formatValue(t)} °C` }, { label: "residuo 1", value: formatValue(r1) }, { label: "residuo 2", value: formatValue(r2) }]));
    if (Math.hypot(r1 / Math.max(1, Math.abs(a.value)), r2 / Math.max(1, Math.abs(b.value))) < 1e-7) {
      st.trace = [...steps, ...iterSteps, trace("Convergencia", "El solver encontró P y T que reproducen ambas propiedades.", undefined, "success"), ...st.trace];
      st.warnings = [...st.warnings, "Estado obtenido por solver numérico multivariable."];
      return st;
    }
    const dp = Math.max(0.05, p * 0.001), dt = 0.02;
    const sp = statePT(p + dp, t, []), stt = statePT(p, t + dt, []);
    if (sp.phase === "undetermined" || stt.phase === "undetermined") break;
    const aP = (propertyOf(sp, targetA) - propertyOf(st, targetA)) / dp;
    const aT = (propertyOf(stt, targetA) - propertyOf(st, targetA)) / dt;
    const bP = (propertyOf(sp, targetB) - propertyOf(st, targetB)) / dp;
    const bT = (propertyOf(stt, targetB) - propertyOf(st, targetB)) / dt;
    const det = aP * bT - aT * bP;
    if (Math.abs(det) < 1e-14) break;
    const deltaP = (-r1 * bT + aT * r2) / det;
    const deltaT = (-aP * r2 + r1 * bP) / det;
    p = Math.max(0.7, Math.min(100000, p + Math.max(-p * 0.5, Math.min(p * 0.5, deltaP))));
    t = Math.max(0.01, Math.min(1900, t + Math.max(-150, Math.min(150, deltaT))));
  }
  return invalid("El solver numérico no convergió para esta combinación. Intenta incluir P o T como una de las propiedades.", [...steps, ...iterSteps]);
}

export function calculateState(first: { key: PropertyKey; value: number }, second: { key: PropertyKey; value: number }): State {
  const initial = [trace("Leer entradas", "Q’uñi recibió exactamente dos propiedades intensivas.", [{ label: first.key, value: `${first.value} ${propertyUnits[first.key]}` }, { label: second.key, value: `${second.value} ${propertyUnits[second.key]}` }])];
  if (first.key === second.key) return invalid("Selecciona dos propiedades diferentes.", initial);
  if (!Number.isFinite(first.value) || !Number.isFinite(second.value)) return invalid("Ingresa valores numéricos válidos.", initial);
  if (first.value < 0 || second.value < 0) return invalid("Esta versión no acepta valores negativos en las propiedades de entrada.", initial);
  const entries = [first, second] as const;
  const get = (key: PropertyKey) => entries.find((entry) => entry.key === key)?.value;
  const P = get("P"), T = get("T"), x = get("x");
  if (x !== undefined && (x < 0 || x > 1)) return invalid("La calidad debe estar entre 0 y 1.", initial);
  if (P !== undefined && T !== undefined) return statePT(P, T, initial);
  if (P !== undefined && x !== undefined) { const sat = saturatedFromP(P); if (!sat.sat) return invalid(sat.warning ?? "No se pudo calcular saturación.", [...initial, ...sat.steps]); return mixture(sat.sat, x, [...initial, ...sat.steps]); }
  if (T !== undefined && x !== undefined) { const sat = saturatedFromT(T); if (!sat.sat) return invalid(sat.warning ?? "No se pudo calcular saturación.", [...initial, ...sat.steps]); return mixture(sat.sat, x, [...initial, ...sat.steps]); }
  if (P !== undefined) { const other = entries.find((entry) => entry.key !== "P" && entry.key !== "x"); if (other) { const sat = saturatedFromP(P); if (sat.sat) { const q = qualityFrom(other.key as Exclude<PropertyKey, "P" | "T" | "x">, other.value, sat.sat); if (q >= 0 && q <= 1) return mixture(sat.sat, q, [...initial, ...sat.steps, trace("Calcular calidad", `x = (${other.key} - ${other.key}f) / (${other.key}g - ${other.key}f).`, [{ label: "x", value: formatValue(q) }])]); } return solveOneKnown("P", P, other.key as Exclude<PropertyKey, "P" | "T" | "x">, other.value, initial) ?? invalid("No fue posible resolver el estado con P y la propiedad dada.", initial); } }
  if (T !== undefined) { const other = entries.find((entry) => entry.key !== "T" && entry.key !== "x"); if (other) { const sat = saturatedFromT(T); if (sat.sat) { const q = qualityFrom(other.key as Exclude<PropertyKey, "P" | "T" | "x">, other.value, sat.sat); if (q >= 0 && q <= 1) return mixture(sat.sat, q, [...initial, ...sat.steps, trace("Calcular calidad", `x = (${other.key} - ${other.key}f) / (${other.key}g - ${other.key}f).`, [{ label: "x", value: formatValue(q) }])]); } return solveOneKnown("T", T, other.key as Exclude<PropertyKey, "P" | "T" | "x">, other.value, initial) ?? invalid("No fue posible resolver el estado con T y la propiedad dada.", initial); } }
  if (first.key === "x" || second.key === "x") return invalid("La calidad necesita P o T para definir la línea de saturación.", initial);
  return solveFromTwoUnknowns(first, second, initial);
}

export function formatValue(value: number, digits = 4) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return value.toLocaleString("es-PE", { maximumFractionDigits: 1 });
  if (Math.abs(value) >= 10) return value.toLocaleString("es-PE", { maximumFractionDigits: 2 });
  return value.toLocaleString("es-PE", { maximumSignificantDigits: digits });
}

export const satTable: SatPoint[] = Array.from({ length: 70 }, (_, index) => {
  const T = 0.01 + (critical.T - 0.01) * (index / 69);
  const sat = saturatedFromT(T).sat;
  return sat ?? { T, P: NaN, vf: NaN, vg: NaN, uf: NaN, ug: NaN, hf: NaN, hg: NaN, sf: NaN, sg: NaN };
});



