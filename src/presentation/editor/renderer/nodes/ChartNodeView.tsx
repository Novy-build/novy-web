import {
  DEFAULT_CHART_PALETTE,
  type ChartDataSource,
  type ChartProps,
} from '@domain/entities/componentNode';

const TEXT_COLOR = 'var(--novy-component-text, var(--novy-app-text, #0e1013))';
const MUTED_TEXT_COLOR = 'var(--novy-component-text, var(--novy-app-text-muted, #565b66))';
const GRID_COLOR = 'var(--novy-app-border, var(--color-hairline, #e5e6ea))';

interface ResolvedSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
}

interface ResolvedChartData {
  categories: string[];
  series: ResolvedSeries[];
}

/** Resolves authored or Logic-provided static data into one render-ready shape. */
export function resolveChartData(
  props: ChartProps,
  override?: ChartDataSource,
): ResolvedChartData {
  const palette = props.palette.length > 0 ? props.palette : DEFAULT_CHART_PALETTE;
  const source = override ?? props.dataSource;
  return {
    categories: source.categories,
    series: source.series.map((series, index) => ({
      id: series.id,
      label: series.label,
      color: series.color ?? palette[index % palette.length]!,
      values: series.values,
    })),
  };
}

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function axisTicks(min: number, max: number, count = 4): number[] {
  if (max === min) return [min];
  return Array.from({ length: count + 1 }, (_, index) => min + ((max - min) * index) / count);
}

interface PlotBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function truncateLabel(value: string, pixelWidth: number, fontSize: number): string {
  const maximum = Math.max(1, Math.floor(pixelWidth / Math.max(1, fontSize * 0.58)));
  return value.length > maximum ? `${value.slice(0, Math.max(1, maximum - 1))}…` : value;
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="novy-widget-text-muted flex h-full w-full items-center justify-center rounded-tile border border-dashed border-hairline bg-surface text-sm">
      {text || 'No chart data yet'}
    </div>
  );
}

function ChartLegend({ series, width, x: xOffset, y, fontSize }: { series: readonly ResolvedSeries[]; width: number; x: number; y: number; fontSize: number }) {
  const itemWidth = clamp(width / Math.max(1, Math.min(series.length, Math.floor(width / 92))), 82, 132);
  const columns = Math.max(1, Math.floor(width / itemWidth));
  return (
    <g>
      {series.map((item, index) => {
        const x = xOffset + index % columns * itemWidth;
        const rowY = y + Math.floor(index / columns) * (fontSize + 5);
        return (
          <g key={item.id}>
            <title>{item.label}</title>
            <rect fill={item.color} height={fontSize - 2} rx={2} width={fontSize - 2} x={x} y={rowY - fontSize + 2} />
            <text fill={MUTED_TEXT_COLOR} fontSize={fontSize} x={x + fontSize + 3} y={rowY}>
              {truncateLabel(item.label, itemWidth - fontSize - 6, fontSize)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function BarChart({
  data,
  props,
  bounds,
  labelFont,
  showAxisLabels,
  showValueLabels,
}: {
  data: ResolvedChartData;
  props: ChartProps;
  bounds: PlotBounds;
  labelFont: number;
  showAxisLabels: boolean;
  showValueLabels: boolean;
}) {
  const allValues = data.series.flatMap((series) => series.values);
  const min = Math.min(0, ...allValues);
  const max = Math.max(0, ...allValues, 1);
  const span = max - min || 1;
  const plotWidth = bounds.right - bounds.left;
  const plotHeight = bounds.bottom - bounds.top;
  const groupWidth = plotWidth / Math.max(1, data.categories.length);
  const barWidth = Math.max(2, (groupWidth * 0.68) / Math.max(1, data.series.length));
  const scaleY = (value: number) => bounds.bottom - ((value - min) / span) * plotHeight;
  const baseline = scaleY(0);
  const ticks = axisTicks(min, max, clamp(Math.floor(plotHeight / 48), 2, 4));
  const visibleStep = Math.max(1, Math.ceil(data.categories.length / Math.max(1, Math.floor(plotWidth / 46))));

  return (
    <g>
      {props.showGrid
        ? ticks.map((tick) => (
            <g key={tick}>
              <line
                stroke={GRID_COLOR}
                strokeDasharray="4 4"
                x1={bounds.left}
                x2={bounds.right}
                y1={scaleY(tick)}
                y2={scaleY(tick)}
              />
              <text fill={MUTED_TEXT_COLOR} fontSize={labelFont} textAnchor="end" x={bounds.left - 5} y={scaleY(tick) + labelFont / 3}>
                {formatValue(tick)}
              </text>
            </g>
          ))
        : null}
      <line stroke={GRID_COLOR} x1={bounds.left} x2={bounds.right} y1={baseline} y2={baseline} />
      {data.categories.map((category, categoryIndex) => {
        const groupStart = bounds.left + categoryIndex * groupWidth;
        const barsWidth = barWidth * data.series.length;
        const seriesStart = groupStart + (groupWidth - barsWidth) / 2;
        return (
          <g key={`${category}-${categoryIndex}`}>
            {data.series.map((series, seriesIndex) => {
              const value = series.values[categoryIndex] ?? 0;
              const y = scaleY(Math.max(value, 0));
              const height = Math.max(1, Math.abs(baseline - scaleY(value)));
              return (
                <g key={series.id}>
                  <rect
                    fill={series.color}
                    height={height}
                    rx={2}
                    width={barWidth - 2}
                    x={seriesStart + seriesIndex * barWidth}
                    y={value >= 0 ? y : baseline}
                  />
                  {showValueLabels ? (
                    <text
                      fill={MUTED_TEXT_COLOR}
                      fontSize={labelFont}
                      textAnchor="middle"
                      x={seriesStart + seriesIndex * barWidth + (barWidth - 2) / 2}
                      y={value >= 0 ? y - 4 : baseline + height + 10}
                    >
                      {formatValue(value)}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {showAxisLabels && categoryIndex % visibleStep === 0 ? (
              <text fill={MUTED_TEXT_COLOR} fontSize={labelFont} textAnchor="middle" x={groupStart + groupWidth / 2} y={bounds.bottom + labelFont + 5}>
                <title>{category}</title>
                {truncateLabel(category, groupWidth * visibleStep - 4, labelFont)}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function LineChart({
  data,
  props,
  bounds,
  labelFont,
  showAxisLabels,
  showValueLabels,
}: {
  data: ResolvedChartData;
  props: ChartProps;
  bounds: PlotBounds;
  labelFont: number;
  showAxisLabels: boolean;
  showValueLabels: boolean;
}) {
  const allValues = data.series.flatMap((series) => series.values);
  const min = Math.min(0, ...allValues);
  const max = Math.max(0, ...allValues, 1);
  const span = max - min || 1;
  const plotWidth = bounds.right - bounds.left;
  const plotHeight = bounds.bottom - bounds.top;
  const step = plotWidth / Math.max(1, data.categories.length - 1);
  const scaleY = (value: number) => bounds.bottom - ((value - min) / span) * plotHeight;
  const ticks = axisTicks(min, max, clamp(Math.floor(plotHeight / 48), 2, 4));
  const visibleStep = Math.max(1, Math.ceil(data.categories.length / Math.max(1, Math.floor(plotWidth / 46))));

  return (
    <g>
      {props.showGrid
        ? ticks.map((tick) => (
            <g key={tick}>
              <line
                stroke={GRID_COLOR}
                strokeDasharray="4 4"
                x1={bounds.left}
                x2={bounds.right}
                y1={scaleY(tick)}
                y2={scaleY(tick)}
              />
              <text fill={MUTED_TEXT_COLOR} fontSize={labelFont} textAnchor="end" x={bounds.left - 5} y={scaleY(tick) + labelFont / 3}>
                {formatValue(tick)}
              </text>
            </g>
          ))
        : null}
      {data.series.map((series) => {
        const points = data.categories
          .map((_, index) => `${bounds.left + step * index},${scaleY(series.values[index] ?? 0)}`)
          .join(' ');
        return (
          <g key={series.id}>
            <polyline fill="none" points={points} stroke={series.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
            {data.categories.map((category, index) => (
              <circle
                cx={bounds.left + step * index}
                cy={scaleY(series.values[index] ?? 0)}
                fill={series.color}
                key={`${series.id}-${category}-${index}`}
                r={3}
              />
            ))}
          </g>
        );
      })}
      {showValueLabels
        ? data.series.flatMap((series) =>
            data.categories.map((category, index) => (
              <text
                fill={MUTED_TEXT_COLOR}
                fontSize={labelFont}
                key={`${series.id}-value-${category}-${index}`}
                textAnchor="middle"
                x={bounds.left + step * index}
                y={scaleY(series.values[index] ?? 0) - 8}
              >
                {formatValue(series.values[index] ?? 0)}
              </text>
            )),
          )
        : null}
      {showAxisLabels ? data.categories.map((category, index) => index % visibleStep === 0 ? (
        <text fill={MUTED_TEXT_COLOR} fontSize={labelFont} key={`${category}-${index}`} textAnchor="middle" x={bounds.left + step * index} y={bounds.bottom + labelFont + 5}>
          <title>{category}</title>
          {truncateLabel(category, Math.max(40, step * visibleStep - 4), labelFont)}
        </text>
      ) : null) : null}
    </g>
  );
}

function polarPoint(centerX: number, centerY: number, radius: number, angle: number): { x: number; y: number } {
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

function PieChart({
  data,
  props,
  bounds,
  legend,
  labelFont,
}: {
  data: ResolvedChartData;
  props: ChartProps;
  bounds: PlotBounds;
  legend: { mode: 'side' | 'bottom' | 'hidden'; x: number; y: number; width: number; columns: number };
  labelFont: number;
}) {
  const series = data.series[0];
  const values = series?.values ?? [];
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (!series || total <= 0) return null;
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const radius = Math.max(4, Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top) / 2 - 4);
  const palette = props.palette.length > 0 ? props.palette : DEFAULT_CHART_PALETTE;
  let angle = -Math.PI / 2;
  return (
    <g>
      {values.map((value, index) => {
        const sweep = (Math.max(0, value) / total) * Math.PI * 2;
        const start = angle;
        const end = angle + sweep;
        angle = end;
        const startPoint = polarPoint(centerX, centerY, radius, start);
        const endPoint = polarPoint(centerX, centerY, radius, end);
        const largeArc = sweep > Math.PI ? 1 : 0;
        const midAngle = start + sweep / 2;
        const labelPoint = polarPoint(centerX, centerY, radius * 0.62, midAngle);
        const color = palette[index % palette.length]!;
        return (
          <g key={`${data.categories[index]}-${index}`}>
            <title>{`${data.categories[index] ?? `Item ${index + 1}`}: ${formatValue(value)}`}</title>
            <path
              d={`M ${centerX} ${centerY} L ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y} Z`}
              fill={color}
              stroke="var(--novy-app-surface, #ffffff)"
              strokeWidth={1}
            />
            {props.showValues && sweep > 0.25 ? (
              <text fill="#ffffff" fontSize={10} textAnchor="middle" x={labelPoint.x} y={labelPoint.y + 3}>
                {Math.round((Math.max(0, value) / total) * 100)}%
              </text>
            ) : null}
          </g>
        );
      })}
      {legend.mode !== 'hidden' ? <g>
        {data.categories.slice(0, legend.mode === 'side'
          ? Math.max(1, Math.floor((bounds.bottom - legend.y + labelFont) / (labelFont + 5))) * legend.columns
          : data.categories.length).map((category, index) => {
          const column = index % legend.columns;
          const row = Math.floor(index / legend.columns);
          const itemWidth = legend.width / legend.columns;
          const x = legend.x + column * itemWidth;
          const y = legend.y + row * (labelFont + 5);
          return (
            <g key={`${category}-${index}`}>
              <title>{category}</title>
              <rect fill={palette[index % palette.length]!} height={labelFont - 2} rx={1} width={labelFont - 2} x={x} y={y - labelFont + 2} />
              <text fill={MUTED_TEXT_COLOR} fontSize={labelFont} x={x + labelFont + 2} y={y}>
                {truncateLabel(category, itemWidth - labelFont - 5, labelFont)}
              </text>
            </g>
          );
        })}
      </g> : null}
    </g>
  );
}

/**
 * Accessible size-aware SVG chart used by canvas, preview, and thumbnails.
 * Logic-provided data is passed in without coupling the widget to a database.
 */
export function ChartNodeView({
  props,
  dataSource,
  width,
  height,
}: {
  props: ChartProps;
  dataSource?: ChartDataSource;
  width: number;
  height: number;
}) {
  const data = resolveChartData(props, dataSource);
  const hasData = data.categories.length > 0 && data.series.length > 0;
  if (!hasData) {
    return <EmptyChart text={props.emptyText} />;
  }
  const viewWidth = Math.max(80, width);
  const viewHeight = Math.max(60, height);
  const padding = clamp(Math.min(viewWidth, viewHeight) / 24, 6, 20);
  const titleFont = clamp(Math.min(viewWidth / 28, viewHeight / 16), 10, 16);
  const labelFont = clamp(titleFont * 0.7, 7, 11);
  const title = props.title.trim();
  const titleSpace = title ? titleFont + 7 : 0;
  const compact = viewWidth < 220 || viewHeight < 150;
  const showAxisLabels = !compact && viewHeight >= 120;
  const showValueLabels = props.showValues && !compact;
  const seriesLegendVisible = props.showLegend && props.chartType !== 'pie' && !compact;
  const legendColumns = Math.max(1, Math.floor((viewWidth - padding * 2) / 92));
  const seriesLegendRows = seriesLegendVisible ? Math.ceil(data.series.length / legendColumns) : 0;
  const seriesLegendHeight = seriesLegendRows * (labelFont + 5);
  const pieSideLegend = props.chartType === 'pie' && props.showLegend && viewWidth >= 360 && viewHeight >= 170;
  const pieBottomLegend = props.chartType === 'pie' && props.showLegend && !pieSideLegend && !compact && viewHeight >= 180;
  const pieLegendColumns = pieBottomLegend ? Math.max(1, Math.floor((viewWidth - padding * 2) / 90)) : 1;
  const pieLegendHeight = pieBottomLegend ? Math.ceil(data.categories.length / pieLegendColumns) * (labelFont + 5) : 0;
  const sideLegendWidth = pieSideLegend ? clamp(viewWidth * 0.25, 92, 150) : 0;
  const bounds: PlotBounds = {
    left: props.chartType === 'pie' ? padding : Math.max(padding + (props.showGrid ? 28 : 0), padding),
    right: Math.max(padding + 12, viewWidth - padding - sideLegendWidth),
    top: padding + titleSpace + seriesLegendHeight,
    bottom: Math.max(padding + titleSpace + seriesLegendHeight + 12, viewHeight - padding - (showAxisLabels && props.chartType !== 'pie' ? labelFont + 7 : 0) - pieLegendHeight),
  };
  const pieLegend = pieSideLegend
    ? { mode: 'side' as const, x: bounds.right + 7, y: bounds.top + labelFont, width: sideLegendWidth - 7, columns: 1 }
    : pieBottomLegend
      ? { mode: 'bottom' as const, x: padding, y: bounds.bottom + labelFont + 5, width: viewWidth - padding * 2, columns: pieLegendColumns }
      : { mode: 'hidden' as const, x: 0, y: 0, width: 0, columns: 1 };
  const description = `${title || 'Chart'}: ${props.chartType} chart with ${data.categories.length} categories and ${data.series.length} series.`;

  return (
    <div className="h-full w-full overflow-hidden rounded-tile border border-hairline bg-surface">
      <svg
        aria-label={description}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      >
        <title>{description}</title>
        {title ? (
          <text fill={TEXT_COLOR} fontSize={titleFont} fontWeight={600} x={padding} y={padding + titleFont}>
            <title>{title}</title>
            {truncateLabel(title, viewWidth - padding * 2, titleFont)}
          </text>
        ) : null}
        {seriesLegendVisible ? <ChartLegend fontSize={labelFont} series={data.series} width={viewWidth - padding * 2} x={padding} y={padding + titleSpace + labelFont} /> : null}
        {props.chartType === 'bar' ? <BarChart bounds={bounds} data={data} labelFont={labelFont} props={props} showAxisLabels={showAxisLabels} showValueLabels={showValueLabels} /> : null}
        {props.chartType === 'line' ? <LineChart bounds={bounds} data={data} labelFont={labelFont} props={props} showAxisLabels={showAxisLabels} showValueLabels={showValueLabels} /> : null}
        {props.chartType === 'pie' ? <PieChart bounds={bounds} data={data} labelFont={labelFont} legend={pieLegend} props={props} /> : null}
      </svg>
    </div>
  );
}
