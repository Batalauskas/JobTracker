import { useDashboardStats } from "../api/queries";
import { ApplicationStatus } from "../gen/job_tracker_pb";
import { STATUS_META, STATUS_ORDER } from "../statusMeta";
import { useUiStore } from "../store/useUiStore";

export function FilterBar() {
  const { statusFilter, search, setStatusFilter, setSearch } = useUiStore();
  const { data: stats } = useDashboardStats();

  const countFor = (status: ApplicationStatus) =>
    stats?.pipeline.find((p) => p.status === status)?.count ?? 0;

  return (
    <section className="filter-bar" aria-label="Filter applications">
      <div className="chips" role="group" aria-label="Filter by stage">
        <Chip
          label="All"
          tone="all"
          count={stats?.total}
          active={statusFilter === ApplicationStatus.UNSPECIFIED}
          onClick={() => setStatusFilter(ApplicationStatus.UNSPECIFIED)}
        />
        {STATUS_ORDER.map((status) => (
          <Chip
            key={status}
            label={STATUS_META[status].label}
            tone={STATUS_META[status].tone}
            count={countFor(status)}
            active={statusFilter === status}
            onClick={() =>
              setStatusFilter(
                statusFilter === status ? ApplicationStatus.UNSPECIFIED : status,
              )
            }
          />
        ))}
      </div>
      <input
        type="search"
        className="search-input"
        placeholder="Search company, position, city…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search applications"
      />
    </section>
  );
}

function Chip({
  label,
  tone,
  count,
  active,
  onClick,
}: {
  label: string;
  tone: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`chip tone--${tone} ${active ? "chip--active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
      {count !== undefined && <span className="chip__count">{count}</span>}
    </button>
  );
}
