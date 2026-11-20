import { axisBottom, axisLeft } from 'd3-axis';
import { scaleLinear, scalePoint } from 'd3-scale';
import { select } from 'd3-selection';
import { area, curveMonotoneX, line } from 'd3-shape';
import 'd3-transition';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  formatAxisCurrency,
  formatCurrency,
  type CashFlowTrendPoint,
  type CashFlowTrendSummary,
} from '../domain/treasury';

interface CashFlowTrendChartProps {
  points: CashFlowTrendPoint[];
  summary: CashFlowTrendSummary;
  horizonMonths: number;
  horizonLabel: string;
  scheduleAdjustmentUsd: number;
  onChangeHorizonMonths: (months: number) => void;
  onChangeScheduleAdjustment: (deltaUsd: number) => void;
  onResetView: () => void;
}

interface LayerState {
  projected: boolean;
  actual: boolean;
  drawdowns: boolean;
  opex: boolean;
  safetyFloor: boolean;
}

const DEFAULT_LAYERS: LayerState = {
  projected: true,
  actual: true,
  drawdowns: false,
  opex: false,
  safetyFloor: true,
};

export function CashFlowTrendChart({
  points,
  summary,
  horizonMonths,
  horizonLabel,
  scheduleAdjustmentUsd,
  onChangeHorizonMonths,
  onChangeScheduleAdjustment,
  onResetView,
}: CashFlowTrendChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xAxisRef = useRef<SVGGElement | null>(null);
  const yAxisRef = useRef<SVGGElement | null>(null);
  const projectedPathRef = useRef<SVGPathElement | null>(null);
  const projectedAreaRef = useRef<SVGPathElement | null>(null);
  const actualPathRef = useRef<SVGPathElement | null>(null);
  const opexPathRef = useRef<SVGPathElement | null>(null);

  const { isDark } = useTheme();
  const [containerWidth, setContainerWidth] = useState(860);
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const next = Math.max(320, Math.round(el.getBoundingClientRect().width));
      setContainerWidth(next);
    };
    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isCompact = containerWidth < 640;
  const axisMode: 'short' | 'long' = isCompact ? 'short' : 'long';
  const chartHeight = isCompact ? 250 : 290;
  const margin = useMemo(
    () => ({
      top: 20,
      right: isCompact ? 16 : 28,
      bottom: 34,
      left: isCompact ? 56 : 92,
    }),
    [isCompact],
  );
  const innerWidth = Math.max(180, containerWidth - margin.left - margin.right);
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const { xScale, yScale, minDomain, maxDomain } = useMemo(() => {
    const values: number[] = [summary.safetyFloorUsd];
    for (const pt of points) {
      values.push(pt.projectedCashUsd);
      if (pt.actualCashUsd !== null) values.push(pt.actualCashUsd);
      if (layers.opex) values.push(pt.opexUsd);
    }
    const rawMax = Math.max(...values, 1_000_000);
    const rawMin = Math.min(...values, summary.safetyFloorUsd * 0.65);
    const domainMin = Math.max(0, Math.floor((rawMin * 0.75) / 100_000) * 100_000);
    const domainMax = Math.ceil((rawMax * 1.12) / 100_000) * 100_000;

    const x = scalePoint<string>()
      .domain(points.map((p) => p.monthShort))
      .range([0, innerWidth])
      .padding(0.28);

    const y = scaleLinear().domain([domainMin, domainMax]).range([innerHeight, 0]).nice();

    return { xScale: x, yScale: y, minDomain: domainMin, maxDomain: domainMax };
  }, [points, summary.safetyFloorUsd, layers.opex, innerWidth, innerHeight]);

  // Computed D3 paths
  const projectedAreaD = useMemo(() => {
    if (points.length === 0) return '';
    const areaGen = area<CashFlowTrendPoint>()
      .x((d) => xScale(d.monthShort) ?? 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.projectedCashUsd))
      .curve(curveMonotoneX);
    return areaGen(points) ?? '';
  }, [points, xScale, yScale, innerHeight]);

  const projectedLineD = useMemo(() => {
    if (points.length === 0) return '';
    const lineGen = line<CashFlowTrendPoint>()
      .x((d) => xScale(d.monthShort) ?? 0)
      .y((d) => yScale(d.projectedCashUsd))
      .curve(curveMonotoneX);
    return lineGen(points) ?? '';
  }, [points, xScale, yScale]);

  const actualLineD = useMemo(() => {
    const actualPts = points.filter((p) => p.actualCashUsd !== null);
    if (actualPts.length === 0) return '';
    const lineGen = line<CashFlowTrendPoint>()
      .x((d) => xScale(d.monthShort) ?? 0)
      .y((d) => yScale(d.actualCashUsd ?? 0))
      .curve(curveMonotoneX);
    return lineGen(actualPts) ?? '';
  }, [points, xScale, yScale]);

  const opexLineD = useMemo(() => {
    if (points.length === 0) return '';
    const lineGen = line<CashFlowTrendPoint>()
      .x((d) => xScale(d.monthShort) ?? 0)
      .y((d) => yScale(d.opexUsd))
      .curve(curveMonotoneX);
    return lineGen(points) ?? '';
  }, [points, xScale, yScale]);

  // Gradient color stops encoding green (surplus) vs amber (burn) periods along X
  const gradientStops = useMemo(() => {
    if (points.length === 0) return [];
    return points.map((pt) => {
      const xPos = xScale(pt.monthShort) ?? 0;
      const offsetPct = innerWidth > 0 ? Math.max(0, Math.min(100, (xPos / innerWidth) * 100)) : 0;
      return {
        id: pt.id,
        offset: `${offsetPct.toFixed(1)}%`,
        color: pt.status === 'surplus' ? '#10B981' : '#F59E0B',
      };
    });
  }, [points, xScale, innerWidth]);

  // Render D3 axes & perform subtle animated D3 transitions on path/axis updates
  useEffect(() => {
    const axisBorder = isDark ? '#1d1d1f' : '#d4d4d8';
    const axisText = isDark ? '#88888b' : '#52525b';

    if (xAxisRef.current) {
      const bottomAxis = axisBottom(xScale).tickSizeOuter(0);
      const sel = select(xAxisRef.current);
      sel.transition().duration(320).call(bottomAxis);
      sel.selectAll('.domain').attr('stroke', axisBorder);
      sel.selectAll('.tick line').attr('stroke', axisBorder);
      sel
        .selectAll('.tick text')
        .attr('fill', axisText)
        .style('font-family', 'var(--font-sans)')
        .style('font-size', isCompact ? '11px' : '12px')
        .style('font-weight', '500');
    }

    if (yAxisRef.current) {
      const leftAxis = axisLeft(yScale)
        .ticks(isCompact ? 4 : 5)
        .tickFormat((d) => formatAxisCurrency(Number(d), axisMode))
        .tickSize(-innerWidth);
      const sel = select(yAxisRef.current);
      sel.transition().duration(320).call(leftAxis);
      sel.selectAll('.domain').remove();
      sel
        .selectAll('.tick line')
        .attr('stroke', axisBorder)
        .attr('stroke-dasharray', '2 3');
      sel
        .selectAll('.tick text')
        .attr('fill', axisText)
        .attr('dx', '-6')
        .style('font-family', 'var(--font-mono)')
        .style('font-size', isCompact ? '10px' : '11px');
    }
  }, [xScale, yScale, innerWidth, isCompact, axisMode, isDark]);

  useEffect(() => {
    if (projectedPathRef.current && projectedLineD) {
      select(projectedPathRef.current)
        .transition()
        .duration(360)
        .attr('d', projectedLineD);
    }
    if (projectedAreaRef.current && projectedAreaD) {
      select(projectedAreaRef.current)
        .transition()
        .duration(360)
        .attr('d', projectedAreaD);
    }
  }, [projectedLineD, projectedAreaD]);

  useEffect(() => {
    if (actualPathRef.current && actualLineD) {
      select(actualPathRef.current)
        .transition()
        .duration(320)
        .attr('d', actualLineD);
    }
  }, [actualLineD]);

  useEffect(() => {
    if (opexPathRef.current && opexLineD) {
      select(opexPathRef.current)
        .transition()
        .duration(320)
        .attr('d', opexLineD);
    }
  }, [opexLineD]);

  const safetyFloorY = Math.max(
    0,
    Math.min(innerHeight, yScale(summary.safetyFloorUsd)),
  );
  const safetyFloorInView =
    summary.safetyFloorUsd >= minDomain && summary.safetyFloorUsd <= maxDomain;

  const activeIdx = pinnedIdx ?? hoveredIdx;
  const activePoint =
    activeIdx !== null && points[activeIdx] ? points[activeIdx] : null;
  const activeX = activePoint ? xScale(activePoint.monthShort) ?? 0 : 0;

  const handleReset = () => {
    setLayers(DEFAULT_LAYERS);
    setPinnedIdx(null);
    setHoveredIdx(null);
    onResetView();
  };

  const toggleLayer = (key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div ref={containerRef} className="@container w-full space-y-5">
      {/* At-a-Glance Plain-English Summary Card */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-300 bg-zinc-50 p-4 @md:grid-cols-3 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
        <div>
          <div className="text-xs font-medium text-zinc-600 dark:text-[#88888b]">Monthly Burn / Surplus Rate</div>
          <div className="mt-1 font-display text-sm font-semibold text-zinc-950 dark:text-white">
            {summary.burnRateLabel}
          </div>
          <div className="mt-0.5 font-mono text-xs tabular-nums text-zinc-600 dark:text-[#88888b]">
            Plaid Liquidity: {formatCurrency(summary.plaidLiquidityUsd)}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-zinc-600 dark:text-[#88888b]">Operating Cash Runway</div>
          <div className="mt-1 font-display text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {summary.runwayLabel}
          </div>
          <div className="mt-0.5 text-xs text-zinc-600 dark:text-[#88888b]">
            Window: {horizonLabel}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-zinc-600 dark:text-[#88888b]">Safety Floor Status</div>
          <div
            className={`mt-1 font-display text-sm font-semibold ${
              summary.fallsBelowFloor
                ? 'text-red-700 dark:text-[#ff4d4d]'
                : 'text-amber-800 dark:text-[#facc15]'
            }`}
          >
            {summary.floorStatusLabel}
          </div>
          <div className="mt-0.5 font-mono text-xs tabular-nums text-zinc-600 dark:text-[#88888b]">
            Min Projected Cash: {formatCurrency(summary.minProjectedCashUsd)}
          </div>
        </div>
      </div>

      {/* Simplified Controls: Layer Toggles + Horizon Slider + Reset View */}
      <div className="flex flex-col gap-4 border-b border-zinc-300 pb-4 @lg:flex-row @lg:items-center @lg:justify-between dark:border-[#1d1d1f]">
        {/* Show/Hide Layer Toggles */}
        <div
          role="group"
          aria-label="Toggle cash flow chart layers"
          className="flex flex-wrap items-center gap-2"
        >
          {(
            [
              { key: 'projected', label: 'Projected Cash Flow', dot: 'bg-emerald-500 dark:bg-emerald-400' },
              { key: 'actual', label: 'Actual Performance', dot: 'bg-zinc-950 dark:bg-white' },
              { key: 'drawdowns', label: 'Credit Drawdowns', dot: 'bg-sky-600 dark:bg-sky-400' },
              { key: 'opex', label: 'Operational Expenses', dot: 'bg-amber-600 dark:bg-[#facc15]' },
              { key: 'safetyFloor', label: 'Safety Floor', dot: 'bg-red-600 dark:bg-[#ff4d4d]' },
            ] as const
          ).map((item) => {
            const active = layers[item.key];
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                onClick={() => toggleLayer(item.key)}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-zinc-400 bg-zinc-200 text-zinc-950 dark:border-[#2e2e32] dark:bg-[#1d1d1f] dark:text-white'
                    : 'border-zinc-300 bg-white text-zinc-600 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#88888b] dark:hover:text-white'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-xs ${active ? item.dot : 'bg-zinc-400 dark:bg-[#52525b]'}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                {active ? (
                  <Eye className="h-3 w-3 text-zinc-700 dark:text-[#d4d4d8]" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-3 w-3 text-zinc-500 dark:text-[#88888b]" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex min-h-[34px] items-center gap-1.5 self-start rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#0b0b0c] dark:text-[#d4d4d8] dark:hover:bg-[#1d1d1f] dark:hover:text-white whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset View
        </button>
      </div>

      {/* Sliders Row: Time Horizon + Interactive Drawdown / Payment Feedback Loop */}
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
        <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="smart-trend-horizon" className="font-medium text-zinc-800 dark:text-[#d4d4d8]">
              Time Window Zoom
            </label>
            <span className="font-mono font-semibold tabular-nums text-zinc-950 dark:text-white">
              {horizonLabel}
            </span>
          </div>
          <input
            id="smart-trend-horizon"
            type="range"
            min={1}
            max={6}
            step={1}
            value={horizonMonths}
            onChange={(e) => {
              setPinnedIdx(null);
              onChangeHorizonMonths(Number(e.target.value));
            }}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-amber-600 dark:bg-[#1d1d1f] dark:accent-[#facc15]"
          />
          <div className="mt-1 flex justify-between font-mono text-[11px] text-zinc-600 dark:text-[#88888b]">
            <span>Next 30 Days</span>
            <span>3 Months</span>
            <span>6 Months</span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 dark:border-[#1d1d1f] dark:bg-[#0b0b0c]">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="smart-trend-schedule" className="font-medium text-zinc-800 dark:text-[#d4d4d8]">
              Planned Drawdown / Payment Timing
            </label>
            <span
              className={`font-mono font-semibold tabular-nums ${
                scheduleAdjustmentUsd > 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : scheduleAdjustmentUsd < 0
                    ? 'text-amber-800 dark:text-[#facc15]'
                    : 'text-zinc-950 dark:text-white'
              }`}
            >
              {scheduleAdjustmentUsd === 0
                ? 'Baseline ($0)'
                : `${scheduleAdjustmentUsd > 0 ? '+' : ''}${formatAxisCurrency(scheduleAdjustmentUsd, 'short')}`}
            </span>
          </div>
          <input
            id="smart-trend-schedule"
            type="range"
            min={-1800000}
            max={1000000}
            step={100000}
            value={scheduleAdjustmentUsd}
            onChange={(e) => onChangeScheduleAdjustment(Number(e.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-amber-600 dark:bg-[#1d1d1f] dark:accent-[#facc15]"
          />
          <div className="mt-1 flex justify-between font-mono text-[11px] text-zinc-600 dark:text-[#88888b]">
            <span>-$1.8M Payment</span>
            <span>Baseline</span>
            <span>+$1M Drawdown</span>
          </div>
        </div>
      </div>

      {/* Legend + Human-Readable Status Line */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-700 dark:text-[#a1a1aa]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs border border-emerald-600 bg-emerald-500/25 dark:border-emerald-400 dark:bg-emerald-500/35" aria-hidden="true" />
            Surplus Period
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs border border-amber-600 bg-amber-500/25 dark:border-[#facc15] dark:bg-[#facc15]/35" aria-hidden="true" />
            Burn Period
          </span>
          {layers.safetyFloor && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-red-600 dark:border-[#ff4d4d]" aria-hidden="true" />
              Safety Floor ({formatAxisCurrency(summary.safetyFloorUsd, axisMode)})
            </span>
          )}
        </div>
        <span className="text-zinc-600 dark:text-[#88888b]">
          Hover or click any period for plain-English insight
        </span>
      </div>

      {/* D3 SVG Visualization Canvas */}
      <div className="relative w-full">
        <svg
          width={containerWidth}
          height={chartHeight}
          viewBox={`0 0 ${containerWidth} ${chartHeight}`}
          className="block w-full overflow-visible"
          role="img"
          aria-label="Smart Trend projected vs actual cash flow area chart"
          data-testid="smart-trend-svg"
        >
          <defs>
            <linearGradient
              id="ravfina-smart-trend-area"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              {gradientStops.map((stop) => (
                <stop
                  key={stop.id}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={isDark ? 0.22 : 0.18}
                />
              ))}
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Axes rendered via d3-axis */}
            <g ref={yAxisRef} data-testid="smart-trend-y-axis" />
            <g
              ref={xAxisRef}
              transform={`translate(0, ${innerHeight})`}
              data-testid="smart-trend-x-axis"
            />

            {/* Surplus (green) vs Burn (amber) Shaded Area */}
            {layers.projected && (
              <path
                ref={projectedAreaRef}
                d={projectedAreaD}
                fill="url(#ravfina-smart-trend-area)"
              />
            )}

            {/* Contextual Safety Floor Dotted Threshold Line */}
            {layers.safetyFloor && safetyFloorInView && (
              <g data-testid="safety-floor-line">
                <line
                  x1={0}
                  x2={innerWidth}
                  y1={safetyFloorY}
                  y2={safetyFloorY}
                  stroke={isDark ? '#ff4d4d' : '#dc2626'}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                />
                <text
                  x={innerWidth - 4}
                  y={Math.max(12, safetyFloorY - 6)}
                  textAnchor="end"
                  stroke={isDark ? '#111112' : '#ffffff'}
                  strokeWidth={4}
                  paintOrder="stroke"
                  className="fill-red-700 font-mono text-[11px] font-semibold dark:fill-[#ff4d4d]"
                >
                  Safety Floor · {formatAxisCurrency(summary.safetyFloorUsd, axisMode)}
                </text>
              </g>
            )}

            {/* Optional Layer: Operational Expenses */}
            {layers.opex && (
              <path
                ref={opexPathRef}
                d={opexLineD}
                fill="none"
                stroke={isDark ? '#facc15' : '#d97706'}
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}

            {/* Projected Cash Flow Smoothed Line */}
            {layers.projected && (
              <path
                ref={projectedPathRef}
                d={projectedLineD}
                fill="none"
                stroke={isDark ? '#10b981' : '#059669'}
                strokeWidth={2.75}
              />
            )}

            {/* Actual Performance Solid Line */}
            {layers.actual && actualLineD && (
              <path
                ref={actualPathRef}
                d={actualLineD}
                fill="none"
                stroke={isDark ? '#ffffff' : '#09090b'}
                strokeWidth={2.75}
              />
            )}

            {/* Optional Layer: Credit Drawdown Markers */}
            {layers.drawdowns &&
              points.map((pt) => {
                if (pt.creditDrawdownUsd <= 0) return null;
                const cx = xScale(pt.monthShort) ?? 0;
                const cy = yScale(pt.projectedCashUsd);
                const drawStroke = isDark ? '#38bdf8' : '#0284c7';
                return (
                  <g key={`draw-${pt.id}`}>
                    <line
                      x1={cx}
                      x2={cx}
                      y1={innerHeight}
                      y2={cy}
                      stroke={drawStroke}
                      strokeWidth={2}
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={7}
                      fill={isDark ? '#0b0b0c' : '#ffffff'}
                      stroke={drawStroke}
                      strokeWidth={2}
                    />
                    <text
                      x={cx}
                      y={Math.max(12, cy - 12)}
                      textAnchor="middle"
                      stroke={isDark ? '#111112' : '#ffffff'}
                      strokeWidth={4}
                      paintOrder="stroke"
                      className="fill-sky-700 font-mono text-[10px] font-semibold dark:fill-[#38bdf8]"
                    >
                      +{formatAxisCurrency(pt.creditDrawdownUsd, 'short')}
                    </text>
                  </g>
                );
              })}

            {/* Interactive Data Points & Hover Guides */}
            {points.map((pt, idx) => {
              const cx = xScale(pt.monthShort) ?? 0;
              const projY = yScale(pt.projectedCashUsd);
              const actY =
                pt.actualCashUsd !== null ? yScale(pt.actualCashUsd) : null;
              const isSelected = activeIdx === idx;
              const hitW = Math.max(34, innerWidth / Math.max(points.length, 1));
              const haloStroke = isDark ? '#111112' : '#ffffff';

              return (
                <g key={pt.id}>
                  {isSelected && (
                    <line
                      x1={cx}
                      x2={cx}
                      y1={0}
                      y2={innerHeight}
                      stroke={isDark ? '#52525b' : '#a1a1aa'}
                      strokeWidth={1}
                      strokeDasharray="2 2"
                    />
                  )}

                  {layers.projected && (
                    <circle
                      cx={cx}
                      cy={projY}
                      r={isSelected ? 5.5 : 4}
                      fill={
                        pt.status === 'surplus'
                          ? isDark
                            ? '#10b981'
                            : '#059669'
                          : isDark
                            ? '#facc15'
                            : '#d97706'
                      }
                      stroke={haloStroke}
                      strokeWidth={2}
                    />
                  )}

                  {layers.actual && actY !== null && (
                    <circle
                      cx={cx}
                      cy={actY}
                      r={isSelected ? 5.5 : 4}
                      fill={isDark ? '#ffffff' : '#09090b'}
                      stroke={haloStroke}
                      strokeWidth={2}
                    />
                  )}

                  <rect
                    x={cx - hitW / 2}
                    y={0}
                    width={hitW}
                    height={innerHeight}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={pt.humanSummary}
                    className="cursor-pointer outline-none"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onFocus={() => setHoveredIdx(idx)}
                    onBlur={() => setHoveredIdx(null)}
                    onClick={() => setPinnedIdx(pinnedIdx === idx ? null : idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPinnedIdx(pinnedIdx === idx ? null : idx);
                      }
                    }}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {/* Human-Readable Floating Tooltip */}
        {activePoint && (
          <div
            role="status"
            data-testid="smart-trend-tooltip"
            className="mt-3 rounded-xl border border-zinc-300 bg-white p-3.5 shadow-xl @md:absolute @md:top-2 @md:mt-0 @md:w-72 dark:border-[#2e2e32] dark:bg-[#0d0d0e] dark:shadow-2xl"
            style={
              !isCompact
                ? {
                    left:
                      activeX > innerWidth * 0.55
                        ? `${Math.max(margin.left, margin.left + activeX - 304)}px`
                        : `${Math.min(containerWidth - 296, margin.left + activeX + 16)}px`,
                  }
                : undefined
            }
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-xs font-bold text-zinc-950 dark:text-white">
                {activePoint.monthLong}
              </span>
              <span
                className={`text-xs font-semibold ${
                  activePoint.status === 'surplus'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-800 dark:text-[#facc15]'
                }`}
              >
                {activePoint.status === 'surplus' ? 'Surplus Period' : 'Burn Period'}
              </span>
            </div>

            <p className="mt-1 text-xs font-semibold text-zinc-950 dark:text-white">
              {activePoint.humanSummary}
            </p>
            <p className="mt-0.5 text-xs text-zinc-700 dark:text-[#a1a1aa]">
              {activePoint.projectedCashUsd < activePoint.safetyFloorUsd
                ? `Caution: ${formatCurrency(activePoint.safetyFloorUsd - activePoint.projectedCashUsd)} below your ${formatAxisCurrency(activePoint.safetyFloorUsd, 'short')} safety floor.`
                : `Projected cash of ${formatCurrency(activePoint.projectedCashUsd)} stays safely above your ${formatAxisCurrency(activePoint.safetyFloorUsd, 'short')} floor.`}
            </p>

            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-zinc-200 pt-2 font-mono text-[11px] tabular-nums text-zinc-600 dark:border-[#1d1d1f] dark:text-[#88888b]">
              <span>Projected Cash</span>
              <span className="text-right font-semibold text-zinc-950 dark:text-white">
                {formatCurrency(activePoint.projectedCashUsd)}
              </span>
              {activePoint.actualCashUsd !== null && (
                <>
                  <span>Actual Cash</span>
                  <span className="text-right font-semibold text-zinc-950 dark:text-white">
                    {formatCurrency(activePoint.actualCashUsd)}
                  </span>
                </>
              )}
              <span>Operational Burn</span>
              <span className="text-right text-amber-800 dark:text-[#facc15]">
                {formatCurrency(activePoint.opexUsd)}
              </span>
              {activePoint.creditDrawdownUsd > 0 && (
                <>
                  <span>Credit Drawdown</span>
                  <span className="text-right font-semibold text-sky-700 dark:text-sky-400">
                    +{formatCurrency(activePoint.creditDrawdownUsd)}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
