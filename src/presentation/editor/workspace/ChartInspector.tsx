import {
  CHART_TYPES,
  DEFAULT_CHART_PALETTE,
  MAX_CHART_CATEGORIES,
  MAX_CHART_PALETTE,
  MAX_CHART_SERIES,
  type ChartDataSource,
  type ChartProps,
  type ChartStaticSeries,
  type ChartType,
} from '@domain/entities/componentNode';
import { FieldHelpLabel } from '@presentation/components/ui/FieldHelp';
import { TextInput } from '@presentation/components/ui/TextInput';

interface ChartInspectorProps {
  props: ChartProps;
  onChange: (props: Partial<ChartProps>) => void;
}

function createSeries(index: number): ChartStaticSeries {
  return { id: `series_${index + 1}_${Date.now().toString(36)}`, label: `Series ${index + 1}`, values: [] };
}

function withCategoryValues(series: readonly ChartStaticSeries[], categories: readonly string[]): ChartStaticSeries[] {
  return series.map((item) => ({
    ...item,
    values: categories.map((_, index) => item.values[index] ?? 0),
  }));
}

/** Chart-specific content controls; layout/appearance stay in the shared Inspector sections. */
export function ChartInspector({ props, onChange }: ChartInspectorProps) {
  const source = props.dataSource;

  function changeDataSource(next: ChartDataSource): void {
    onChange({ dataSource: next });
  }

  function changeStaticCategories(categories: string[]): void {
    const bounded = categories.slice(0, MAX_CHART_CATEGORIES);
    changeDataSource({
      kind: 'static',
      categories: bounded,
      series: withCategoryValues(source.series, bounded),
    });
  }

  function changeStaticSeries(series: ChartStaticSeries[]): void {
    changeDataSource({ kind: 'static', categories: source.categories, series: series.slice(0, MAX_CHART_SERIES) });
  }

  return (
    <div className="mt-4 grid gap-3">
      <p className="inspector-section-label">Chart</p>
      <TextInput
        label="Title"
        name="inspector-chart-title"
        onChange={(event) => onChange({ title: event.target.value })}
        value={props.title}
      />
      <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-chart-type">
        <FieldHelpLabel label="Chart type" />
      </label>
      <select
        className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
        id="inspector-chart-type"
        onChange={(event) => {
          const chartType = event.target.value as ChartType;
          if ((CHART_TYPES as readonly string[]).includes(chartType)) onChange({ chartType });
        }}
        value={props.chartType}
      >
        <option value="bar">Bar</option>
        <option value="line">Line</option>
        <option value="pie">Pie</option>
      </select>

      <p className="text-xs text-ink-muted">
        Use the Logic Builder’s Load Chart Data node to populate this chart from a collection.
      </p>
      <>
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-chart-categories">
            <FieldHelpLabel label="Categories (one per line)" />
          </label>
          <textarea
            className="min-h-20 rounded-tile border border-hairline bg-surface px-2 py-1.5 text-sm text-ink"
            id="inspector-chart-categories"
            onChange={(event) => changeStaticCategories(event.target.value.split('\n'))}
            value={source.categories.join('\n')}
          />
          {source.series.map((series, index) => (
            <div className="grid gap-2 rounded-tile border border-hairline p-2" key={series.id}>
              <TextInput
                label={`Series ${index + 1} label`}
                name={`inspector-chart-series-label-${index}`}
                onChange={(event) => {
                  const next = [...source.series];
                  next[index] = { ...series, label: event.target.value };
                  changeStaticSeries(next);
                }}
                value={series.label}
              />
              <TextInput
                label="Values (comma-separated)"
                name={`inspector-chart-series-values-${index}`}
                onChange={(event) => {
                  const values = event.target.value
                    .split(',')
                    .map((candidate) => Number(candidate.trim()))
                    .map((value) => (Number.isFinite(value) ? value : 0));
                  const next = [...source.series];
                  next[index] = { ...series, values };
                  changeStaticSeries(next);
                }}
                value={series.values.join(', ')}
              />
              <button
                className="justify-self-start rounded-tile border border-hairline px-2 py-1 text-xs font-medium text-ink-muted hover:bg-canvas"
                onClick={() => changeStaticSeries(source.series.filter((item) => item.id !== series.id))}
                type="button"
              >
                Remove series
              </button>
            </div>
          ))}
          <button
            className="justify-self-start rounded-tile border border-hairline px-2 py-1 text-xs font-medium text-ink-muted hover:bg-canvas"
            disabled={source.series.length >= MAX_CHART_SERIES}
            onClick={() => changeStaticSeries([...source.series, createSeries(source.series.length)])}
            type="button"
          >
            Add series
          </button>
        </>

      <div className="grid gap-1">
        <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
          <input checked={props.showLegend} onChange={(event) => onChange({ showLegend: event.target.checked })} type="checkbox" />
          Show legend
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
          <input checked={props.showGrid} onChange={(event) => onChange({ showGrid: event.target.checked })} type="checkbox" />
          Show grid
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
          <input checked={props.showValues} onChange={(event) => onChange({ showValues: event.target.checked })} type="checkbox" />
          Show values
        </label>
      </div>

      <TextInput
        label="Empty text"
        name="inspector-chart-empty"
        onChange={(event) => onChange({ emptyText: event.target.value })}
        value={props.emptyText}
      />
      <TextInput
        label="Palette (comma-separated hex)"
        name="inspector-chart-palette"
        onChange={(event) => {
          const palette = event.target.value
            .split(',')
            .map((color) => color.trim())
            .filter((color) => color.length > 0)
            .slice(0, MAX_CHART_PALETTE);
          onChange({ palette });
        }}
        value={props.palette.join(', ')}
      />
      <button
        className="justify-self-start rounded-tile border border-hairline px-2 py-1 text-xs font-medium text-ink-muted hover:bg-canvas"
        onClick={() => onChange({ palette: [...DEFAULT_CHART_PALETTE] })}
        type="button"
      >
        Reset palette
      </button>
    </div>
  );
}
