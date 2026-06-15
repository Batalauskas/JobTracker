import { useDashboardStats } from "../api/queries";
import { ApplicationStatus } from "../gen/job_tracker_pb";
import { STATUS_META } from "../statusMeta";
import { useUiStore } from "../store/useUiStore";

export function Dashboard() {
  const { data: stats, isPending, isError } = useDashboardStats();

  if (isPending) {
    return <section className="dashboard dashboard--loading">Loading overview…</section>;
  }
  if (isError || !stats) {
    return (
      <section className="dashboard dashboard--loading">
        Overview unavailable — is the API running on port 5000?
      </section>
    );
  }

  return (
    <section className="dashboard" aria-label="Pipeline overview">
      <div className="stat-grid">
        <StatCard label="Tracked" value={stats.total} />
        <StatCard label="Active" value={stats.active} hint="applied · interview · offer" />
        <StatCard label="Interviews" value={stats.interviews} />
        <StatCard label="Response rate" value={`${stats.responseRate}%`} hint="of submitted" />
      </div>
      <PipelineStrip />
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="stat-card">
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
      {hint && <span className="stat-card__hint">{hint}</span>}
    </div>
  );
}

/**
 * The signature element: a machine-status ("andon") strip showing the funnel.
 * Segment width is proportional to the number of applications in that stage.
 */
function PipelineStrip() {
  const { data: stats } = useDashboardStats();
  const setStatusFilter = useUiStore((s) => s.setStatusFilter);
  const statusFilter = useUiStore((s) => s.statusFilter);

  const segments = (stats?.pipeline ?? []).filter((p) => p.count > 0);

  if (segments.length === 0) {
    return (
      <div className="pipeline pipeline--empty" role="img" aria-label="Empty pipeline">
        Pipeline is empty — log your first application to light it up.
      </div>
    );
  }

  return (
    <div className="pipeline" role="group" aria-label="Applications by stage">
      {segments.map((segment) => {
        const meta = STATUS_META[segment.status];
        const active =
          statusFilter === segment.status ||
          statusFilter === ApplicationStatus.UNSPECIFIED;
        return (
          <button
            key={segment.status}
            type="button"
            className={`pipeline__segment tone-bg--${meta.tone} ${active ? "" : "pipeline__segment--dim"}`}
            style={{ flexGrow: segment.count }}
            title={`${meta.label}: ${segment.count}`}
            onClick={() =>
              setStatusFilter(
                statusFilter === segment.status
                  ? ApplicationStatus.UNSPECIFIED
                  : segment.status,
              )
            }
          >
            <span className="pipeline__count">{segment.count}</span>
            <span className="pipeline__label">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
