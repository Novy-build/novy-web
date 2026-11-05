export function ListNodeView({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-tile border border-dashed border-hairline bg-surface text-sm text-ink-muted">
        No items yet
      </div>
    );
  }
  return (
    <ul className="h-full w-full divide-y divide-hairline overflow-hidden rounded-tile border border-hairline bg-surface">
      {items.map((item, index) => (
        <li className="px-3 py-2 text-sm text-ink" key={`${item}-${index}`}>
          {item}
        </li>
      ))}
    </ul>
  );
}
