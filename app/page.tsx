"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, ArrowLeft, Calculator, Check, ChevronDown, Moon, Settings2, Sun, X } from "lucide-react";
import { calculateState, formatValue, phaseColors, phaseLabels, propertyLabels, type PhaseKey, type PropertyKey, type State, type TraceStep } from "../lib/steam";
import { convertInput, defaultUnits, fromCanonical, toCanonical, unitFor, unitPresets, type PressureUnit, type TemperatureUnit, type UnitPreferences, type UnitSystem } from "../lib/units";
import iconForLightBackground from "../assets/icon-dark.png";
import iconForDarkBackground from "../assets/icon-light.png";
import ThermodynamicChart from "./ThermodynamicChart";

const propertyOrder: PropertyKey[] = ["P", "T", "v", "u", "h", "s", "x"];
const thirdPropertyOrder: PropertyKey[] = ["x", "v", "u", "h", "s"];
const defaults = { firstKey: "P" as PropertyKey, firstValue: "101.325", secondKey: "x" as PropertyKey, secondValue: "0.85" };
const phaseClass: Record<PhaseKey, string> = { compressedLiquid: "compressedLiquid", saturatedLiquid: "saturatedLiquid", mixture: "mixture", saturatedVapor: "saturatedVapor", superheatedVapor: "superheatedVapor", supercritical: "supercritical", undetermined: "undetermined" };
const themeStorageKey = "quni-theme";
const introTipStorageKey = "quni-intro-tip-dismissed";
const unitsStorageKey = "quni-units";

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [firstKey, setFirstKey] = useState<PropertyKey>(defaults.firstKey);
  const [firstValue, setFirstValue] = useState(defaults.firstValue);
  const [secondKey, setSecondKey] = useState<PropertyKey>(defaults.secondKey);
  const [secondValue, setSecondValue] = useState(defaults.secondValue);
  const [thirdKey, setThirdKey] = useState<PropertyKey>("x");
  const [thirdValue, setThirdValue] = useState("");
  const [state, setState] = useState<State | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [needsThirdProperty, setNeedsThirdProperty] = useState(false);
  const [thirdPropertyError, setThirdPropertyError] = useState<string | null>(null);
  const [calculatedKeys, setCalculatedKeys] = useState<PropertyKey[]>([]);
  const [showIntroTip, setShowIntroTip] = useState(false);
  const [units, setUnits] = useState<UnitPreferences>(defaultUnits);
  const [showUnitSettings, setShowUnitSettings] = useState(false);

  useEffect(() => {
    let shouldShowIntroTip = true;
    try {
      const savedTheme = window.localStorage.getItem(themeStorageKey);
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
      }
      shouldShowIntroTip = window.localStorage.getItem(introTipStorageKey) !== "true";
      const savedUnits = window.localStorage.getItem(unitsStorageKey);
      if (savedUnits) setUnits({ ...defaultUnits, ...JSON.parse(savedUnits) });
    } catch {
      // El almacenamiento puede no estar disponible; las preferencias siguen funcionando durante la sesión.
    }
    setShowIntroTip(shouldShowIntroTip);
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const nextTheme = current === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem(themeStorageKey, nextTheme);
        document.documentElement.dataset.theme = nextTheme;
      } catch {
        // Mantener el cambio en memoria si el almacenamiento del dispositivo falla.
      }
      return nextTheme;
    });
  }

  function dismissIntroTip() {
    setShowIntroTip(false);
    try {
      window.localStorage.setItem(introTipStorageKey, "true");
    } catch {
      // El consejo permanece oculto durante la sesión aunque no se pueda persistir.
    }
  }

  function resetThirdPropertyRequest() {
    setNeedsThirdProperty(false);
    setThirdPropertyError(null);
    setState(null);
  }

  function changeUnits(next: UnitPreferences) {
    setFirstValue((value) => convertInput(value, firstKey, units, next));
    setSecondValue((value) => convertInput(value, secondKey, units, next));
    setThirdValue((value) => convertInput(value, thirdKey, units, next));
    setUnits(next);
    try { window.localStorage.setItem(unitsStorageKey, JSON.stringify(next)); } catch { /* Conservar durante la sesión. */ }
  }

  function handleCalculate() {
    const first = { key: firstKey, value: parseInputValue(firstValue, firstKey, units) };
    const second = { key: secondKey, value: parseInputValue(secondValue, secondKey, units) };

    if (needsThirdProperty) {
      const third = { key: thirdKey, value: parseInputValue(thirdValue, thirdKey, units) };
      const nextState = calculateState(first, second, third);
      if (nextState.phase === "undetermined") {
        setThirdPropertyError(nextState.warnings[0] ?? "No fue posible definir el estado con la tercera propiedad.");
        return;
      }
      setState(nextState);
      setCalculatedKeys([firstKey, secondKey, thirdKey]);
      setNeedsThirdProperty(false);
      setThirdPropertyError(null);
      setShowResults(true);
      return;
    }

    const nextState = calculateState(first, second);
    setState(nextState);
    if (nextState.requiresThirdProperty) {
      setThirdKey("x");
      setThirdValue("");
      setNeedsThirdProperty(true);
      setThirdPropertyError(null);
      setShowResults(false);
      return;
    }
    setCalculatedKeys([firstKey, secondKey]);
    setShowResults(true);
  }

  return (
    <main data-theme={theme}>
      <div className={`app-slider ${showResults ? "show-results" : ""}`}>
        <section className="screen screen-input" aria-hidden={showResults}>
          <div className="shell">
            <header className="app-header">
              <div className="brand">
                <div className="logo" aria-hidden="true">
                  <Image className="brand-icon brand-icon-on-light" src={iconForLightBackground} alt="" priority sizes="40px" />
                  <Image className="brand-icon brand-icon-on-dark" src={iconForDarkBackground} alt="" priority sizes="40px" />
                </div>
                <h1>Q&apos;uñi</h1>
              </div>
              <div className="header-actions">
                <button className="theme-toggle icon-only" type="button" onClick={() => setShowUnitSettings(true)} aria-label="Configurar unidades"><Settings2 size={19} /></button>
                <button className="theme-toggle icon-only" type="button" onClick={toggleTheme} aria-label="Cambiar tema">{theme === "light" ? <Moon size={19} /> : <Sun size={19} />}</button>
              </div>
            </header>

            {showIntroTip && <aside className="intro-tip" aria-labelledby="intro-tip-title" role="note">
              <div className="intro-tip-copy">
                <h2 className="intro-tip-title" id="intro-tip-title">De dos datos a un estado completo.</h2>
                <p>Ingresa <strong>dos propiedades intensivas</strong>. Si el par <span className="property-pair">P + T</span> cae en saturación, te pediremos una tercera para definir la calidad.</p>
              </div>
              <button className="intro-tip-dismiss" type="button" onClick={dismissIntroTip} aria-label="Ocultar este consejo permanentemente"><X size={16} /></button>
            </aside>}

            <section className="card input-card"><div className="card-body">
              <div className="section-title"><h2>Propiedades de entrada</h2><span className="section-icon"><Calculator size={20} /></span></div>
              <div className="input-grid">
                <PropertyInput label="Propiedad 1" selected={firstKey} value={firstValue} units={units} onKeyChange={(key) => { setFirstKey(key); resetThirdPropertyRequest(); }} onValueChange={(value) => { setFirstValue(value); resetThirdPropertyRequest(); }} />
                <PropertyInput label="Propiedad 2" selected={secondKey} value={secondValue} units={units} onKeyChange={(key) => { setSecondKey(key); resetThirdPropertyRequest(); }} onValueChange={(value) => { setSecondValue(value); resetThirdPropertyRequest(); }} />
              </div>
              {needsThirdProperty && state?.saturation && <section className="additional-property" aria-labelledby="third-property-title">
                <div className="notice warning"><AlertTriangle size={18} /><span id="third-property-title">{state.warnings[0]}</span></div>
                <SaturationSummary state={state} inputKeys={[firstKey, secondKey]} units={units} compact />
                <AdditionalPropertyInput selected={thirdKey} value={thirdValue} units={units} onKeyChange={(key) => { setThirdKey(key); setThirdPropertyError(null); }} onValueChange={(value) => { setThirdValue(value); setThirdPropertyError(null); }} />
                {thirdPropertyError && <div className="notice error" role="alert"><AlertTriangle size={18} /><span>{thirdPropertyError}</span></div>}
              </section>}
              <button className="primary-button full-width" type="button" onClick={handleCalculate}><Calculator size={17} /> {needsThirdProperty ? "Calcular con tercera propiedad" : "Calcular estado"}</button>
            </div></section>

            <AppFooter />
          </div>
        </section>

        <section className="screen screen-results" aria-hidden={!showResults}>
          <div className="shell results-shell">
            <div className="result-topbar">
              <button className="back-button" type="button" onClick={() => setShowResults(false)} aria-label="Volver a entradas"><ArrowLeft size={22} /></button>
              <div><p className="eyebrow">Resultado</p><h2>Estado termodinámico</h2></div>
              <button className="topbar-icon" type="button" onClick={() => setShowUnitSettings(true)} aria-label="Configurar unidades"><Settings2 size={20} /></button>
            </div>
            {state ? <ResultsContent state={state} inputKeys={calculatedKeys} units={units} /> : <EmptyResult />}
            <AppFooter />
          </div>
        </section>
      </div>
      {showUnitSettings && <UnitSettings units={units} onChange={changeUnits} onClose={() => setShowUnitSettings(false)} />}
    </main>
  );
}

function UnitSettings({ units, onChange, onClose }: { units: UnitPreferences; onChange: (units: UnitPreferences) => void; onClose: () => void }) {
  function chooseSystem(system: UnitSystem) { onChange(unitPresets[system]); }
  return <div className="settings-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="units-title">
      <div className="settings-heading"><div><p className="eyebrow">Preferencias</p><h2 id="units-title">Unidades</h2></div><button className="sheet-close" type="button" onClick={onClose} aria-label="Cerrar configuración"><X size={20} /></button></div>
      <div className="settings-group"><span className="settings-label">Sistema</span><div className="segmented-control">
        <button type="button" className={units.system === "si" ? "selected" : ""} onClick={() => chooseSystem("si")}><strong>Internacional</strong><small>métrico</small></button>
        <button type="button" className={units.system === "english" ? "selected" : ""} onClick={() => chooseSystem("english")}><strong>Inglés</strong><small>US customary</small></button>
      </div></div>
      <label className="settings-field"><span>Presión</span><select className="control" value={units.pressure} onChange={(event) => onChange({ ...units, pressure: event.target.value as PressureUnit })}>
        {(units.system === "si" ? ["kPa", "MPa", "bar"] : ["psi", "kPa", "MPa", "bar"]).map((unit) => <option key={unit}>{unit}</option>)}
      </select></label>
      <label className="settings-field"><span>Temperatura</span><select className="control" value={units.temperature} onChange={(event) => onChange({ ...units, temperature: event.target.value as TemperatureUnit })}>
        {(units.system === "si" ? ["°C", "K"] : ["°F", "°C", "K"]).map((unit) => <option key={unit}>{unit}</option>)}
      </select></label>
      <p className="settings-note">Los valores ingresados y los resultados se convierten automáticamente. El cálculo interno conserva las unidades IF97.</p>
      <button className="primary-button full-width" type="button" onClick={onClose}><Check size={17} />Listo</button>
    </section>
  </div>;
}

function ResultsContent({ state, inputKeys, units }: { state: State; inputKeys: PropertyKey[]; units: UnitPreferences }) {
  const isError = state.phase === "undetermined" && state.warnings.length > 0;
  return <>
    {state.warnings.map((warning) => <div className={`notice ${isError ? "error" : "warning"}`} key={warning}><AlertTriangle size={18} /><span>{warning}</span></div>)}
    {state.region === "4" && state.saturation && <SaturationSummary state={state} inputKeys={inputKeys} units={units} />}
    <StateSummary state={state} />
    <PropertyTable state={state} units={units} />
    <ThermodynamicChart state={state} units={units} />
    <TracePanel steps={state.trace} />
  </>;
}

function EmptyResult() {
  return <div className="notice warning"><AlertTriangle size={18} /><span>Calcula un estado para ver resultados.</span></div>;
}

function AppFooter() {
  return <footer className="app-footer">
    <span>Q&apos;uñi</span>
    <span className="footer-separator" aria-hidden="true">·</span>
    <span>Licenciado bajo AGPL-3.0</span>
  </footer>;
}

function PropertySelect({ label, selected, options, units, onChange }: { label: string; selected: PropertyKey; options: PropertyKey[]; units: UnitPreferences; onChange: (key: PropertyKey) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeWhenClickingOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeWhenClickingOutside);
    return () => document.removeEventListener("pointerdown", closeWhenClickingOutside);
  }, [open]);

  return <div className="property-select" ref={containerRef} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <button className="property-select-trigger" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="listbox" aria-label={label + ": seleccionar propiedad"}>
      <span className="property-symbol">{selected}</span>
      <span className="property-select-copy"><strong>{propertyLabels[selected]}</strong><small>{unitFor(selected, units)}</small></span>
      <ChevronDown className={open ? "select-chevron open" : "select-chevron"} size={20} />
    </button>
    <div className={open ? "property-options open" : "property-options"} role="listbox" aria-label={label} aria-hidden={!open} inert={!open}>
      {options.map((key) => <button className="property-option" type="button" role="option" aria-selected={selected === key} tabIndex={open ? 0 : -1} key={key} onClick={() => { onChange(key); setOpen(false); }}>
        <span className="property-symbol">{key}</span>
        <span className="property-select-copy"><strong>{propertyLabels[key]}</strong><small>{unitFor(key, units)}</small></span>
        {selected === key && <Check className="property-check" size={18} />}
      </button>)}
    </div>
  </div>;
}

function PropertyInput({ label, selected, value, units, onKeyChange, onValueChange }: { label: string; selected: PropertyKey; value: string; units: UnitPreferences; onKeyChange: (key: PropertyKey) => void; onValueChange: (value: string) => void }) {
  return <div className="field">
    <label>{label}</label>
    <PropertySelect label={label} selected={selected} options={propertyOrder} units={units} onChange={onKeyChange} />
    <input className="control property-value-input" inputMode="decimal" type="number" step="any" value={value} onChange={(event) => onValueChange(event.target.value)} placeholder={"Valor en " + unitFor(selected, units)} aria-label={label + ": valor de " + propertyLabels[selected]} />
  </div>;
}

function AdditionalPropertyInput({ selected, value, units, onKeyChange, onValueChange }: { selected: PropertyKey; value: string; units: UnitPreferences; onKeyChange: (key: PropertyKey) => void; onValueChange: (value: string) => void }) {
  return <div className="field">
    <label>Propiedad 3 para definir la calidad</label>
    <PropertySelect label="Propiedad 3" selected={selected} options={thirdPropertyOrder} units={units} onChange={onKeyChange} />
    <input className="control property-value-input" inputMode="decimal" type="number" step="any" value={value} onChange={(event) => onValueChange(event.target.value)} placeholder={"Valor en " + unitFor(selected, units)} aria-label={"Propiedad 3: valor de " + propertyLabels[selected]} />
  </div>;
}

function SaturationSummary({ state, inputKeys, units, compact = false }: { state: State; inputKeys: PropertyKey[]; units: UnitPreferences; compact?: boolean }) {
  if (!state.saturation) return null;
  const showTemperature = inputKeys.includes("P");
  const showPressure = inputKeys.includes("T");
  if (!showTemperature && !showPressure) return null;
  return <section className={compact ? "saturation-card compact" : "saturation-card"} aria-label="Condición de saturación">
    <div><p className="eyebrow">Dentro de la campana</p><h3>Condición de saturación</h3></div>
    <div className="saturation-values">
      {showTemperature && <div><span>Temperatura de saturación, Tsat(P)</span><strong>{formatValue(fromCanonical("T", state.saturation.temperatureAtPressure, units))} {unitFor("T", units)}</strong></div>}
      {showPressure && <div><span>Presión de saturación, Psat(T)</span><strong>{formatValue(fromCanonical("P", state.saturation.pressureAtTemperature, units))} {unitFor("P", units)}</strong></div>}
    </div>
  </section>;
}

function parseInputValue(value: string, key: PropertyKey, units: UnitPreferences) {
  return value.trim() === "" ? NaN : toCanonical(key, Number(value), units);
}

function StateSummary({ state }: { state: State }) {
  return <div className="state-card"><div className="state-row"><div><p className="property-name">Fase</p><p className="state-value" style={{ color: phaseColors[state.phase] }} data-phase={phaseClass[state.phase]}>{phaseLabels[state.phase]}</p></div><span className="badge" style={{ "--badge-color": phaseColors[state.phase] } as React.CSSProperties}><span className="phase-dot" />{state.phase === "undetermined" ? "requiere dato" : "determinado"}</span></div><div className="state-row"><span className="property-name">Calidad</span><span className="quality">{state.x === null ? "No aplica" : formatValue(state.x, 4)}</span></div></div>;
}

function PropertyTable({ state, units }: { state: State; units: UnitPreferences }) {
  const [expandedKey, setExpandedKey] = useState<PropertyKey | null>(null);
  const rows: Array<[PropertyKey, number | null]> = [["P", state.P], ["T", state.T], ["v", state.v], ["u", state.u], ["h", state.h], ["s", state.s], ["x", state.x]];
  return <div className="properties" role="table" aria-label="Propiedades calculadas">{rows.map(([key, value]) => {
    const expanded = expandedKey === key;
    const convertedValue = value === null ? null : fromCanonical(key, value, units);
    const displayValue = convertedValue === null ? "No aplica" : expanded ? formatExpandedValue(convertedValue) : formatValue(convertedValue);
    return <button className={`property-row ${expanded ? "expanded" : ""}`} type="button" role="row" key={key} onClick={() => value !== null && setExpandedKey(expanded ? null : key)} disabled={value === null} aria-pressed={expanded} aria-label={`${propertyLabels[key]} ${expanded ? "contraer" : "expandir"} decimales`}>
      <span className="property-name" role="cell">{propertyLabels[key]} ({key}) - {unitFor(key, units)}</span>
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
