"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, BadgeCheck, Calculator, Gauge, Moon, ShieldCheck, Sun, Waves } from "lucide-react";
import { calculateState, formatValue, phaseColors, phaseLabels, propertyLabels, propertyUnits, type PhaseKey, type PropertyKey, type State, type TraceStep } from "../lib/steam";
import ThermodynamicChart from "./ThermodynamicChart";

const propertyOrder: PropertyKey[] = ["P", "T", "v", "u", "h", "s", "x"];
const defaults = { firstKey: "P" as PropertyKey, firstValue: "101.325", secondKey: "x" as PropertyKey, secondValue: "0.85" };
const phaseClass: Record<PhaseKey, string> = { compressedLiquid: "compressedLiquid", saturatedLiquid: "saturatedLiquid", mixture: "mixture", saturatedVapor: "saturatedVapor", superheatedVapor: "superheatedVapor", supercritical: "supercritical", undetermined: "undetermined" };

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [firstKey, setFirstKey] = useState<PropertyKey>(defaults.firstKey);
  const [firstValue, setFirstValue] = useState(defaults.firstValue);
  const [secondKey, setSecondKey] = useState<PropertyKey>(defaults.secondKey);
  const [secondValue, setSecondValue] = useState(defaults.secondValue);
  const [state, setState] = useState<State | null>(null);
  const [showResults, setShowResults] = useState(false);

  function handleCalculate() {
    const nextState = calculateState({ key: firstKey, value: Number(firstValue) }, { key: secondKey, value: Number(secondValue) });
    setState(nextState);
    setShowResults(true);
  }

  return (
    <main data-theme={theme}>
      <div className={`app-slider ${showResults ? "show-results" : ""}`}>
        <section className="screen screen-input" aria-hidden={showResults}>
          <div className="shell">
            <section className="hero">
              <div className="brand-row">
                <div className="brand"><div className="logo">Q</div><div><p className="eyebrow">Calculadora de agua</p><h1>Q&apos;uñi</h1></div></div>
                <button className="theme-toggle icon-only" type="button" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label="Cambiar tema">
                  {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
                </button>
              </div>
              <p className="lead">Ingresa exactamente dos propiedades intensivas. Q&apos;uñi calcula el estado termodinámico completo, identifica fase y calidad, y ubica el punto en una gráfica T-v con campana de saturación.</p>
            </section>

            <section className="card"><div className="card-body">
              <div className="section-title"><h2>Propiedades de entrada</h2><Calculator color="var(--primary)" size={20} /></div>
              <div className="input-grid">
                <PropertyInput label="Propiedad 1" selected={firstKey} value={firstValue} onKeyChange={setFirstKey} onValueChange={setFirstValue} />
                <PropertyInput label="Propiedad 2" selected={secondKey} value={secondValue} onKeyChange={setSecondKey} onValueChange={setSecondValue} />
              </div>
              <button className="primary-button full-width" type="button" onClick={handleCalculate}><Calculator size={17} /> Calcular estado</button>
            </div></section>

            <section className="proof-footer" aria-label="Capacidades">
              <div className="proof-item"><ShieldCheck size={18} /><span>Industry-ready</span></div>
              <div className="proof-item"><BadgeCheck size={18} /><span>IAPWS-IF97 proven</span></div>
              <div className="proof-item"><Gauge size={18} /><span>Precision up to 10 decimals</span></div>
            </section>
          </div>
        </section>

        <section className="screen screen-results" aria-hidden={!showResults}>
          <div className="shell results-shell">
            <div className="result-topbar">
              <button className="back-button" type="button" onClick={() => setShowResults(false)} aria-label="Volver a entradas"><ArrowLeft size={22} /></button>
              <div><p className="eyebrow">Resultado</p><h2>Estado termodinámico</h2></div>
              <div className="topbar-icon" aria-hidden="true"><Waves size={22} /></div>
            </div>
            {state ? <ResultsContent state={state} /> : <EmptyResult />}
          </div>
        </section>
      </div>
    </main>
  );
}

function ResultsContent({ state }: { state: State }) {
  const isError = state.phase === "undetermined" && state.warnings.length > 0;
  return <>
    {state.warnings.map((warning) => <div className={`notice ${isError ? "error" : "warning"}`} key={warning}><AlertTriangle size={18} /><span>{warning}</span></div>)}
    <StateSummary state={state} />
    <PropertyTable state={state} />
    <ThermodynamicChart state={state} />
    <TracePanel steps={state.trace} />
  </>;
}

function EmptyResult() {
  return <div className="notice warning"><AlertTriangle size={18} /><span>Calcula un estado para ver resultados.</span></div>;
}

function PropertyInput({ label, selected, value, onKeyChange, onValueChange }: { label: string; selected: PropertyKey; value: string; onKeyChange: (key: PropertyKey) => void; onValueChange: (value: string) => void }) {
  return <div className="field"><label>{label}</label><select className="control" value={selected} onChange={(event) => onKeyChange(event.target.value as PropertyKey)}>{propertyOrder.map((key) => <option key={key} value={key}>{propertyLabels[key]} ({key}) · {propertyUnits[key]}</option>)}</select><input className="control" inputMode="decimal" type="number" step="any" value={value} onChange={(event) => onValueChange(event.target.value)} placeholder={`Valor en ${propertyUnits[selected]}`} aria-label={`${label}: ${propertyLabels[selected]}`} /></div>;
}

function StateSummary({ state }: { state: State }) {
  return <div className="state-card"><div className="state-row"><div><p className="property-name">Fase</p><p className="state-value" style={{ color: phaseColors[state.phase] }} data-phase={phaseClass[state.phase]}>{phaseLabels[state.phase]}</p></div><span className="badge" style={{ "--badge-color": phaseColors[state.phase] } as React.CSSProperties}><span className="phase-dot" />{state.phase === "undetermined" ? "requiere dato" : "determinado"}</span></div><div className="state-row"><span className="property-name">Calidad</span><span className="quality">{state.x === null ? "No aplica" : formatValue(state.x, 4)}</span></div></div>;
}

function PropertyTable({ state }: { state: State }) {
  const [expandedKey, setExpandedKey] = useState<PropertyKey | null>(null);
  const rows: Array<[PropertyKey, number | null]> = [["P", state.P], ["T", state.T], ["v", state.v], ["u", state.u], ["h", state.h], ["s", state.s], ["x", state.x]];
  return <div className="properties" role="table" aria-label="Propiedades calculadas">{rows.map(([key, value]) => {
    const expanded = expandedKey === key;
    const displayValue = value === null ? "No aplica" : expanded ? formatExpandedValue(value) : formatValue(value);
    return <button className={`property-row ${expanded ? "expanded" : ""}`} type="button" role="row" key={key} onClick={() => value !== null && setExpandedKey(expanded ? null : key)} disabled={value === null} aria-pressed={expanded} aria-label={`${propertyLabels[key]} ${expanded ? "contraer" : "expandir"} decimales`}>
      <span className="property-name" role="cell">{propertyLabels[key]} ({key}) - {propertyUnits[key]}</span>
      <span className="property-value" role="cell">{displayValue}</span>
    </button>;
  })}</div>;
}

function formatExpandedValue(value: number) {
  if (!Number.isFinite(value)) return "--";
  return value.toLocaleString("es-PE", { maximumFractionDigits: 10 });
}

function TracePanel({ steps }: { steps: TraceStep[] }) {
  return <details className="process-disclosure"><summary><span>Proceso de cálculo</span><span className="formula-note">{steps.length} pasos</span></summary><div className="trace-list">{steps.map((step, index) => <details className={`trace-step ${step.tone ?? "info"}`} key={`${step.title}-${index}`}><summary><span className="trace-index">{index + 1}</span><span><strong>{step.title}</strong><small>{step.summary}</small></span></summary>{step.details && step.details.length > 0 && <dl>{step.details.map((item) => <div key={`${step.title}-${item.label}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>}</details>)}</div></details>;
}
