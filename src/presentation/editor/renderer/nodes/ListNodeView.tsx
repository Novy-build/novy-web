import type { ListProps } from '@domain/entities/componentNode';

export function ListNodeView({ props }: { props: ListProps }) {
  if (props.items.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-tile border border-dashed border-hairline bg-surface text-sm text-ink-muted">
        No items yet
      </div>
    );
  }
  return (
    <ul className="h-full w-full divide-y divide-hairline overflow-hidden rounded-tile border border-hairline bg-surface">
      {props.items.map((item) => (
        <li className="px-3 py-2 text-sm text-ink" key={item}>
          {item}
        </li>
      ))}
    </ul>
  );
}
