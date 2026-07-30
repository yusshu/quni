"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useId, useMemo, useState, type CSSProperties, type PointerEvent, type WheelEvent } from "react";
import { formatValue, satTable, type State } from "../lib/steam";

type DiagramKey = "Tv" | "Ph" | "Ts" | "Pv";
type ScaleKind = "linear" | "log";
type ChartProperty = "P" | "T" | "v" | "h" | "s";
type Branch = "liquid" | "vapor";
type Domain = [number, number];
type AxisDefinition = { key: ChartProperty; label: string; symbol: string; unit: string; scale: ScaleKind };
type DiagramDefinition = { label: string; description: string; x: AxisDefinition; y: AxisDefinition };
type PlotPoint = { chartX: number; chartY: number; label: string; x: number; y: number };

const diagramOrder: DiagramKey[] = ["Tv", "Ph", "Ts", "Pv"];
const diagrams: Record<DiagramKey, DiagramDefinition> = {
  Tv: {
    label: "T-v",
    description: "Temperatura frente a volumen específico",
    x: { key: "v", label: "Volumen específico", symbol: "v", unit: "m³/kg", scale: "log" },
    y: { key: "T", label: "Temperatura", symbol: "T", unit: "°C", scale: "linear" },
  },
  Ph: {
    label: "P-h",
    description: "Presión frente a entalpía específica",
    x: { key: "h", label: "Entalpía específica", symbol: "h", unit: "kJ/kg", scale: "linear" },
    y: { key: "P", label: "Presión", symbol: "P", unit: "kPa", scale: "log" },
  },
  Ts: {
    label: "T-s",
    description: "Temperatura frente a entropía específica",
    x: { key: "s", label: "Entropía específica", symbol: "s", unit: "kJ/kg·K", scale: "linear" },
    y: { key: "T", label: "Temperatura", symbol: "T", unit: "°C", scale: "linear" },
  },
  Pv: {
    label: "P-v",
    description: "Presión frente a volumen específico",
    x: { key: "v", label: "Volumen específico", symbol: "v", unit: "m³/kg", scale: "log" },
    y: { key: "P", label: "Presión", symbol: "P", unit: "kPa", scale: "log" },
  },
};

const width = 680;
const height = 390;
const pad = { left: 76, right: 24, top: 24, bottom: 64 };
const plotWidth = width - pad.left - pad.right;
const plotHeight = height - pad.top - pad.bottom;
const maxZoomLevel = 6;

function saturationValue(point: (typeof satTable)[number], key: ChartProperty, branch: Branch) {
  if (key === "P" || key === "T") return point[key];
  return point[`${key}${branch === "liquid" ? "f" : "g"}` as "vf" | "vg" | "hf" | "hg" | "sf" | "sg"];
}

function transform(value: number, scale: ScaleKind) { return scale === "log" ? Math.log10(value) : value; }
function untransform(value: number, scale: ScaleKind) { return scale === "log" ? 10 ** value : value; }
function validForScale(value: number, scale: ScaleKind) { return Number.isFinite(value) && (scale === "linear" || value > 0); }

function paddedDomain(values: number[], scale: ScaleKind): Domain {
  const transformed = values.filter((value) => validForScale(value, scale)).map((value) => transform(value, scale));
  if (transformed.length === 0) return scale === "log" ? [0.001, 100] : [0, 1];
  let low = Math.min(...transformed);
  let high = Math.max(...transformed);
  const fallbackSpan = scale === "log" ? 0.5 : Math.max(1, Math.abs(low) * 0.2);
  const span = high - low || fallbackSpan;
  low -= span * 0.08;
  high += span * 0.08;
  if (scale === "linear" && low > 0 && low < span * 0.16) low = 0;
  return [untransform(low, scale), untransform(high, scale)];
}

function zoomDomain(base: Domain, centerValue: number, level: number, scale: ScaleKind): Domain {
  if (level === 0) return base;
  const low = transform(base[0], scale);
  const high = transform(base[1], scale);
  const fallbackCenter = (low + high) / 2;
  const requestedCenter = validForScale(centerValue, scale) ? transform(centerValue, scale) : fallbackCenter;
  const center = Math.max(low, Math.min(high, requestedCenter));
  const factor = 1 / 1.55 ** level;
  return [untransform(center - (center - low) * factor, scale), untransform(center + (high - center) * factor, scale)];
}

function niceStep(span: number, targetCount: number) {
  const rough = span / Math.max(1, targetCount);
  const power = 10 ** Math.floor(Math.log10(Math.max(rough, Number.EPSILON)));
  const ratio = rough / power;
  return (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * power;
}

function axisTicks(domain: Domain, scale: ScaleKind, targetCount = 5) {
  const low = transform(domain[0], scale);
  const high = transform(domain[1], scale);
  const step = niceStep(high - low, targetCount);
  const first = Math.ceil((low - step * 1e-9) / step) * step;
  const ticks: number[] = [];
  for (let value = first; value <= high + step * 1e-9 && ticks.length < 9; value += step) {
    if (value >= low - step * 1e-9) ticks.push(untransform(value, scale));
  }
  return ticks;
}

function axisFormatter(value: number) {
  const absolute = Math.abs(value);
  if (absolute !== 0 && (absolute >= 100000 || absolute < 0.001)) return value.toExponential(1).replace(".", ",");
  if (absolute >= 1000) return value.toLocaleString("es-PE", { maximumFractionDigits: 0 });
  if (absolute >= 10) return value.toLocaleString("es-PE", { maximumFractionDigits: 1 });
  return value.toLocaleString("es-PE", { maximumSignificantDigits: 3 });
}

function pointLabel(label: string, definition: DiagramDefinition, x: number, y: number) {
  return `${label}. ${definition.x.label}: ${formatValue(x)} ${definition.x.unit}. ${definition.y.label}: ${formatValue(y)} ${definition.y.unit}.`;
}

export default function ThermodynamicChart({ state }: { state: State }) {
  const [diagramKey, setDiagramKey] = useState<DiagramKey>("Tv");
  const [zoomLevel, setZoomLevel] = useState(0);
  const [tooltip, setTooltip] = useState<PlotPoint | null>(null);
  const clipId = `plot-${useId().replace(/:/g, "")}`;
  const definition = diagrams[diagramKey];
  const stateX = state[definition.x.key];
  const stateY = state[definition.y.key];

  useEffect(() => {
    setZoomLevel(0);
    setTooltip(null);
  }, [diagramKey, state.P, state.T, state.v, state.h, state.s]);

  const chart = useMemo(() => {
    const liquidValues = satTable.map((point) => ({ x: saturationValue(point, definition.x.key, "liquid"), y: saturationValue(point, definition.y.key, "liquid") }));
    const vaporValues = satTable.map((point) => ({ x: saturationValue(point, definition.x.key, "vapor"), y: saturationValue(point, definition.y.key, "vapor") }));
    const allX = [...liquidValues.map((point) => point.x), ...vaporValues.map((point) => point.x), stateX];
    const allY = [...liquidValues.map((point) => point.y), ...vaporValues.map((point) => point.y), stateY];
    const xDomain = zoomDomain(paddedDomain(allX, definition.x.scale), stateX, zoomLevel, definition.x.scale);
    const yDomain = zoomDomain(paddedDomain(allY, definition.y.scale), stateY, zoomLevel, definition.y.scale);
    const xLow = transform(xDomain[0], definition.x.scale);
    const xHigh = transform(xDomain[1], definition.x.scale);
    const yLow = transform(yDomain[0], definition.y.scale);
    const yHigh = transform(yDomain[1], definition.y.scale);
    const xScale = (value: number) => pad.left + ((transform(value, definition.x.scale) - xLow) / (xHigh - xLow)) * plotWidth;
    const yScale = (value: number) => pad.top + (1 - (transform(value, definition.y.scale) - yLow) / (yHigh - yLow)) * plotHeight;
    const toPlotPoint = (point: { x: number; y: number }, label: string): PlotPoint => ({ ...point, label, chartX: xScale(point.x), chartY: yScale(point.y) });
    const liquid = liquidValues.map((point) => toPlotPoint(point, "Líquido saturado"));
    const vapor = vaporValues.map((point) => toPlotPoint(point, "Vapor saturado"));
    const current = validForScale(stateX, definition.x.scale) && validForScale(stateY, definition.y.scale) ? toPlotPoint({ x: stateX, y: stateY }, "Estado calculado") : null;
    const hoverPoints = [
      ...liquid.filter((_, index) => index % 3 === 0 || index === liquid.length - 1),
      ...vapor.filter((_, index) => index % 3 === 0 || index === vapor.length - 1),
      ...(current ? [current] : []),
    ].filter((point) => point.chartX >= pad.left && point.chartX <= width - pad.right && point.chartY >= pad.top && point.chartY <= height - pad.bottom);
    return { xDomain, yDomain, liquid, vapor, current, hoverPoints, xTicks: axisTicks(xDomain, definition.x.scale), yTicks: axisTicks(yDomain, definition.y.scale) };
  }, [definition, stateX, stateY, zoomLevel]);

  const liquidPoints = chart.liquid.map((point) => `${point.chartX},${point.chartY}`).join(" ");
  const vaporPoints = chart.vapor.map((point) => `${point.chartX},${point.chartY}`).join(" ");
  const domePoints = `${liquidPoints} ${chart.vapor.slice().reverse().map((point) => `${point.chartX},${point.chartY}`).join(" ")}`;
  const zoomFactor = 1.55 ** zoomLevel;

  function chooseDiagram(next: DiagramKey) {
    setDiagramKey(next);
    setZoomLevel(0);
    setTooltip(null);
  }

  function updateZoom(direction: 1 | -1) {
    setZoomLevel((current) => Math.max(0, Math.min(maxZoomLevel, current + direction)));
    setTooltip(null);
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    if (event.deltaY === 0) return;
    event.preventDefault();
    updateZoom(event.deltaY < 0 ? 1 : -1);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    let nearest: PlotPoint | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const point of chart.hoverPoints) {
      const screenX = (point.chartX / width) * rect.width;
      const screenY = (point.chartY / height) * rect.height;
      const distance = Math.hypot(pointerX - screenX, pointerY - screenY);
      if (distance < nearestDistance) { nearest = point; nearestDistance = distance; }
    }
    setTooltip(nearestDistance <= 28 ? nearest : null);
  }

  const tooltipStyle = tooltip ? {
    "--tooltip-x": `${(Math.max(92, Math.min(width - 92, tooltip.chartX)) / width) * 100}%`,
    "--tooltip-y": `${(Math.max(82, Math.min(height - 26, tooltip.chartY - 14)) / height) * 100}%`,
  } as CSSProperties : undefined;

  return (
    <section className="chart-workspace" aria-labelledby="diagram-title">
      <div className="chart-heading">
        <div><h3 id="diagram-title">Diagramas termodinámicos</h3><p className="formula-note">{definition.description}</p></div>
        <label className="diagram-picker">
          <span>Vista</span>
          <select className="control" value={diagramKey} onChange={(event) => chooseDiagram(event.target.value as DiagramKey)}>
            {diagramOrder.map((key) => <option key={key} value={key}>{diagrams[key].label}</option>)}
          </select>
        </label>
      </div>

      <div className="chart-toolbar" role="group" aria-label="Controles de zoom">
        <button className="chart-tool-button" type="button" onClick={() => updateZoom(-1)} disabled={zoomLevel === 0} aria-label="Alejar diagrama"><Minus size={16} aria-hidden="true" /></button>
        <output className="zoom-readout" aria-live="polite">{zoomFactor.toLocaleString("es-PE", { maximumFractionDigits: 1 })}×</output>
        <button className="chart-tool-button" type="button" onClick={() => updateZoom(1)} disabled={zoomLevel === maxZoomLevel} aria-label="Acercar diagrama"><Plus size={16} aria-hidden="true" /></button>
        <button className="chart-reset-button" type="button" onClick={() => { setZoomLevel(0); setTooltip(null); }} disabled={zoomLevel === 0}><RotateCcw size={15} aria-hidden="true" />Restablecer</button>
        <span className="chart-gesture-hint">Rueda sobre la gráfica para ampliar</span>
      </div>

      <div className="chart-stage" onPointerLeave={() => setTooltip(null)}>
        <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Diagrama ${definition.label} del agua con el estado calculado`} onPointerMove={handlePointerMove} onWheel={handleWheel}>
          <title>{`Diagrama ${definition.label} del agua`}</title>
          <desc>Campana de saturación, ejes dinámicos y ubicación del estado termodinámico calculado.</desc>
          <defs><clipPath id={clipId}><rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} /></clipPath></defs>

          {chart.yTicks.map((tick) => {
            const position = pad.top + (1 - (transform(tick, definition.y.scale) - transform(chart.yDomain[0], definition.y.scale)) / (transform(chart.yDomain[1], definition.y.scale) - transform(chart.yDomain[0], definition.y.scale))) * plotHeight;
            return <g key={`y-${tick}`}><line className="chart-grid" x1={pad.left} y1={position} x2={width - pad.right} y2={position} /><text className="chart-tick chart-tick-y" x={pad.left - 10} y={position + 4}>{axisFormatter(tick)}</text></g>;
          })}
          {chart.xTicks.map((tick) => {
            const position = pad.left + ((transform(tick, definition.x.scale) - transform(chart.xDomain[0], definition.x.scale)) / (transform(chart.xDomain[1], definition.x.scale) - transform(chart.xDomain[0], definition.x.scale))) * plotWidth;
            return <g key={`x-${tick}`}><line className="chart-grid" x1={position} y1={pad.top} x2={position} y2={height - pad.bottom} /><text className="chart-tick chart-tick-x" x={position} y={height - pad.bottom + 22}>{axisFormatter(tick)}</text></g>;
          })}

          <line className="chart-axis" x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} />
          <line className="chart-axis" x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} />
          <g clipPath={`url(#${clipId})`}>
            <polygon className="dome" points={domePoints} />
            <polyline className="sat-line saturated-liquid-line" points={liquidPoints} />
            <polyline className="sat-line saturated-vapor-line" points={vaporPoints} />
            {chart.current && <>
              <line className="state-guide" x1={chart.current.chartX} y1={chart.current.chartY} x2={chart.current.chartX} y2={height - pad.bottom} />
              <line className="state-guide" x1={pad.left} y1={chart.current.chartY} x2={chart.current.chartX} y2={chart.current.chartY} />
              <circle className="state-point" cx={chart.current.chartX} cy={chart.current.chartY} r={7} tabIndex={0} aria-label={pointLabel(chart.current.label, definition, chart.current.x, chart.current.y)} onFocus={() => setTooltip(chart.current)} onBlur={() => setTooltip(null)} />
            </>}
          </g>

          <text className="chart-axis-label chart-axis-label-x" x={pad.left + plotWidth / 2} y={height - 12}>{definition.x.symbol} ({definition.x.unit})</text>
          <text className="chart-axis-label chart-axis-label-y" transform={`translate(18 ${pad.top + plotHeight / 2}) rotate(-90)`}>{definition.y.symbol} ({definition.y.unit})</text>
        </svg>

        {tooltip && <div className="chart-tooltip" role="tooltip" style={tooltipStyle}><strong>{tooltip.label}</strong><span>{definition.x.symbol}: {formatValue(tooltip.x)} {definition.x.unit}</span><span>{definition.y.symbol}: {formatValue(tooltip.y)} {definition.y.unit}</span></div>}
      </div>

      <div className="chart-legend" aria-label="Leyenda">
        <span><i className="legend-line liquid" />Líquido saturado</span>
        <span><i className="legend-line vapor" />Vapor saturado</span>
        <span><i className="legend-point" />Estado calculado</span>
      </div>
      {chart.current ? <p className="chart-status">{pointLabel("Estado calculado", definition, chart.current.x, chart.current.y)}</p> : <p className="chart-status">El estado actual no puede ubicarse en este diagrama.</p>}
    </section>
  );
}
