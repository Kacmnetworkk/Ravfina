import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  formatCurrency,
  type MonthlyCashflowPoint,
  type PortfolioHolding,
} from '../domain/treasury';

interface CashflowChartProps {
  data: MonthlyCashflowPoint[];
}

export function CashflowChart({ data }: CashflowChartProps) {
  const { isDark } = useTheme();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxVal = Math.max(...data.map((d) => Math.max(d.inflowsUsd, d.opexUsd)), 1600000);
  const chartHeight = 200;
  const chartWidth = 560;
  const paddingLeft = 56;
  const paddingBottom = 28;
  const usableHeight = chartHeight - paddingBottom - 16;
  const barGroupWidth = (chartWidth - paddingLeft - 16) / data.length;

  const yTicks = [0, 0.5, 1].map((ratio) => Math.round(maxVal * ratio));

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5 text-xs text-zinc-700 dark:text-[#a1a1aa]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-xs bg-zinc-900 dark:bg-white" aria-hidden="true" />
            Operating Inflows
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
            Operational Spend
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-500 dark:bg-[#facc15]" aria-hidden="true" />
            Treasury Yield
          </span>
        </div>
        {hoveredIdx !== null && data[hoveredIdx] ? (
          <div className="text-xs font-mono tabular-nums text-amber-800 dark:text-[#facc15]">
            {data[hoveredIdx].month}: In {formatCurrency(data[hoveredIdx].inflowsUsd)} · Spend{' '}
            {formatCurrency(data[hoveredIdx].opexUsd)} · Yield{' '}
            {formatCurrency(data[hoveredIdx].treasuryYieldUsd)}
          </div>
        ) : (
          <div className="text-xs text-zinc-600 dark:text-[#88888b]">6-month rolling liquidity &amp; burn</div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="h-52 w-full overflow-visible"
        role="img"
        aria-label="Six month cashflow and operational expense comparison chart"
      >
        {yTicks.map((tick, idx) => {
          const y = 16 + usableHeight - (tick / maxVal) * usableHeight;
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                x2={chartWidth - 8}
                y1={y}
                y2={y}
                stroke={isDark ? '#1d1d1f' : '#e4e4e7'}
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-zinc-600 dark:fill-[#88888b] font-mono text-[10px]"
              >
                ${Math.round(tick / 1000)}k
              </text>
            </g>
          );
        })}

        {data.map((point, idx) => {
          const xBase = paddingLeft + idx * barGroupWidth + 10;
          const inflowH = (point.inflowsUsd / maxVal) * usableHeight;
          const opexH = (point.opexUsd / maxVal) * usableHeight;
          const yieldH = Math.max(4, (point.treasuryYieldUsd / maxVal) * usableHeight * 8);
          const barW = Math.min(20, (barGroupWidth - 22) / 2);

          return (
            <g
              key={point.month}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={xBase - 4}
                y={12}
                width={barGroupWidth - 10}
                height={usableHeight + 8}
                fill={hoveredIdx === idx ? (isDark ? '#1d1d1f' : '#e4e4e7') : 'transparent'}
                rx={4}
              />
              <rect
                x={xBase}
                y={16 + usableHeight - inflowH}
                width={barW}
                height={inflowH}
                fill={isDark ? '#ffffff' : '#18181b'}
                rx={2}
              />
              <rect
                x={xBase + barW + 4}
                y={16 + usableHeight - opexH}
                width={barW}
                height={opexH}
                fill={isDark ? '#10b981' : '#059669'}
                rx={2}
              />
              <rect
                x={xBase + barW + 4}
                y={16 + usableHeight - opexH - yieldH - 2}
                width={barW}
                height={yieldH}
                fill={isDark ? '#facc15' : '#d97706'}
                rx={1}
              />
              <text
                x={xBase + barW}
                y={chartHeight - 6}
                textAnchor="middle"
                className="fill-zinc-600 dark:fill-[#88888b] text-[11px] font-medium"
              >
                {point.month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface PortfolioAllocationChartProps {
  holdings: PortfolioHolding[];
}

export function PortfolioAllocationChart({ holdings }: PortfolioAllocationChartProps) {
  const { isDark } = useTheme();
  const sliceColors = isDark
    ? ['#facc15', '#10b981', '#e4e4e7', '#64748b']
    : ['#eab308', '#059669', '#18181b', '#64748b'];

  const total = holdings.reduce((acc, h) => acc + h.allocationUsd, 0) || 1;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  const slices = holdings.reduce<
    {
      item: PortfolioHolding;
      fraction: number;
      dashLength: number;
      offset: number;
      color: string;
    }[]
  >((acc, item, idx) => {
    const prevUsed = acc.reduce((sum, s) => sum + s.fraction, 0);
    const fraction = item.allocationUsd / total;
    const dashLength = fraction * circumference;
    const offset = -prevUsed * circumference;
    acc.push({
      item,
      fraction,
      dashLength,
      offset,
      color: sliceColors[idx % sliceColors.length],
    });
    return acc;
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-5">
        <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
          <svg
            viewBox="0 0 140 140"
            className="h-32 w-32 -rotate-90"
            role="img"
            aria-label="Treasury portfolio allocation chart"
          >
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={isDark ? '#1d1d1f' : '#e4e4e7'}
              strokeWidth="16"
            />
            {slices.map((s) => (
              <circle
                key={s.item.id}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth="16"
                strokeDasharray={`${s.dashLength} ${circumference}`}
                strokeDashoffset={s.offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-[#88888b]">Invested</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
              ${(total / 1000000).toFixed(2)}M
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1 text-xs text-zinc-700 dark:text-[#a1a1aa]">
          <div className="font-medium text-zinc-950 dark:text-white">Liquidity Tiering</div>
          <p className="leading-relaxed">
            Segmented across T+0 same-day money market liquidity and laddered 90-day US Treasury
            Bills.
          </p>
        </div>
      </div>

      <div className="space-y-3 border-t border-zinc-200 dark:border-[#1d1d1f] pt-4">
        {slices.map((s) => (
          <div key={s.item.id} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-xs"
                  style={{ backgroundColor: s.color }}
                  aria-hidden="true"
                />
                <span className="truncate font-medium text-zinc-950 dark:text-white">{s.item.instrument}</span>
              </div>
              <div className="pl-4.5 text-xs text-zinc-600 dark:text-[#88888b]">
                {s.item.apyPct.toFixed(2)}% APY · {s.item.maturityLabel}
              </div>
            </div>
            <div className="shrink-0 text-right font-mono tabular-nums">
              <div className="text-sm font-medium text-amber-800 dark:text-[#facc15]">
                {formatCurrency(s.item.allocationUsd)}
              </div>
              <div className="text-xs text-zinc-600 dark:text-[#88888b]">{(s.fraction * 100).toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
