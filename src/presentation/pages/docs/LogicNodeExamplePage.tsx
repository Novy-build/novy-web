import { ArrowRight } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';
import { LogicNodeIcon, logicNodeIconKey } from '@presentation/editor/logic/LogicNodeIcons';
import { getLogicNodeHelpById } from '@presentation/editor/logic/logicNodeHelpContent';

/** Full "how to use" guide for a Logic node, opened from the node library's (?) icon. */
export function LogicNodeExamplePage() {
  const { nodeId = '' } = useParams<{ nodeId: string }>();
  const [searchParams] = useSearchParams();
  const content = getLogicNodeHelpById(nodeId);
  const requestedFrom = searchParams.get('from');
  const backToEditor = requestedFrom?.startsWith('/project/') && !requestedFrom.startsWith('//')
    ? requestedFrom
    : null;

  if (!content) {
    return (
      <div className="min-h-full bg-canvas px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-tile border border-hairline bg-surface p-6">
          <h1 className="text-xl font-semibold text-ink">Logic node guide not found</h1>
          <p className="mt-2 text-sm text-ink-muted">
            No guide is available for “{nodeId}”. Open the Logic editor and use the (?) icon next to a node.
          </p>
          <Link className="mt-4 inline-flex text-sm font-medium text-brand-600 hover:underline" to="/projects">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas px-5 py-8 sm:px-8">
      <article className="mx-auto max-w-4xl">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Logic node guide</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{content.title}</h1>
            <span className="rounded-full border border-hairline bg-surface px-2 py-0.5 text-[11px] text-ink-muted">
              {content.category}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">{content.description}</p>
          <nav aria-label="Guide navigation" className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-brand-600">
            {backToEditor ? <Link className="hover:underline" to={backToEditor}>← Back to editor</Link> : null}
            <Link className="hover:underline" to="/projects">Projects</Link>
          </nav>
        </header>

        <section
          aria-labelledby="logic-node-how-to"
          className="mt-6 rounded-tile border border-hairline bg-surface p-5"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink" id="logic-node-how-to">
            How to use it
          </h2>
          <ol className="mt-4 grid gap-3">
            {content.steps.map((step, index) => (
              <li className="flex gap-3" key={step}>
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white"
                >
                  {index + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed text-ink">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="logic-node-example"
          className="mt-5 rounded-tile border border-hairline bg-surface p-5"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink" id="logic-node-example">
            Visual example
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{content.example.title}</p>
          <ol className="mt-4 flex flex-wrap items-stretch gap-2">
            {content.example.nodes.map((node, index) => (
              <li className="flex items-stretch gap-2" key={`${node.label}-${index}`}>
                <div className="flex w-56 flex-col rounded-tile border border-hairline bg-canvas p-3">
                  <div className="flex items-center gap-2">
                    <LogicNodeIcon iconKey={logicNodeIconKey(node.iconKey ?? '')} />
                    <p className="text-xs font-semibold text-ink">{node.label}</p>
                  </div>
                  <p className="mt-1.5 flex-1 text-[11px] leading-relaxed text-ink-muted">{node.detail}</p>
                  <span className="mt-2 self-start rounded bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-muted">
                    {node.kind}
                  </span>
                </div>
                {index < content.example.nodes.length - 1 ? (
                  <ArrowRight aria-hidden="true" className="self-center text-ink-muted" size={16} />
                ) : null}
              </li>
            ))}
          </ol>
          {content.example.note ? (
            <p className="mt-3 rounded-md bg-canvas px-3 py-2 text-xs leading-relaxed text-ink-muted">
              {content.example.note}
            </p>
          ) : null}
        </section>

        <section
          aria-labelledby="logic-node-fields"
          className="mt-5 rounded-tile border border-hairline bg-surface p-5"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink" id="logic-node-fields">
            Fields and options
          </h2>
          <div className="mt-3 overflow-hidden rounded-tile border border-hairline">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas text-[11px] uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold" scope="col">Field</th>
                  <th className="px-4 py-2 font-semibold" scope="col">What it does</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-surface">
                {content.fields.map((field) => (
                  <tr key={field.name}>
                    <th className="px-4 py-3 align-top font-medium text-ink" scope="row">{field.name}</th>
                    <td className="px-4 py-3 align-top text-ink-muted">{field.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {content.isCurated ? null : (
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
              This guide is generated from the node’s default fields. Select the node on the canvas to see its
              exact Inspector controls.
            </p>
          )}
        </section>
      </article>
    </div>
  );
}
