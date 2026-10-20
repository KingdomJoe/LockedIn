import type { ReactNode } from 'react';

interface ViewHeaderProps {
  index: string;
  title: string;
  description: string;
  actions?: ReactNode;
  metrics?: { label: string; value: string }[];
}

export default function ViewHeader({
  index,
  title,
  description,
  actions,
  metrics = [],
}: ViewHeaderProps) {
  return (
    <header className="border-b border-subtle pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-caps text-primary">{index} // Command Center</p>
          <h1 className="mt-2 font-display text-[30px] font-bold leading-none tracking-[-0.03em] text-content sm:text-[36px]">
            {title}
          </h1>
          <p className="mt-2.5 max-w-2xl text-[12px] leading-[1.6] text-muted">{description}</p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {metrics.length > 0 && (
        <div className="density-detail mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded border border-subtle bg-well px-3 py-2.5"
            >
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
                {metric.label}
              </p>
              <p className="mt-1 font-mono text-[13px] font-bold text-content">{metric.value}</p>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
