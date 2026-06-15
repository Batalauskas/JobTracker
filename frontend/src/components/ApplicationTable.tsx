import {
  useApplications,
  useDeleteApplication,
  useUpdateStatus,
} from "../api/queries";
import type { JobApplication } from "../gen/job_tracker_pb";
import { ApplicationStatus } from "../gen/job_tracker_pb";
import { formatDate, formatSalaryRange } from "../format";
import { STATUS_META, STATUS_ORDER } from "../statusMeta";
import { useUiStore } from "../store/useUiStore";

export function ApplicationTable() {
  const statusFilter = useUiStore((s) => s.statusFilter);
  const search = useUiStore((s) => s.search);
  const openCreateForm = useUiStore((s) => s.openCreateForm);

  const { data: applications, isPending, isError, error, refetch } =
    useApplications(statusFilter, search);

  if (isPending) {
    return <div className="table-state">Loading applications…</div>;
  }

  if (isError) {
    return (
      <div className="table-state table-state--error">
        <p>Couldn't load applications: {error.message}</p>
        <button type="button" className="btn" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  if (applications.length === 0) {
    const filtered =
      statusFilter !== ApplicationStatus.UNSPECIFIED || search !== "";
    return (
      <div className="table-state">
        {filtered ? (
          <p>No applications match the current filter.</p>
        ) : (
          <>
            <p>Nothing tracked yet.</p>
            <button type="button" className="btn btn--primary" onClick={openCreateForm}>
              Log your first application
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="app-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Position</th>
            <th>Stage</th>
            <th className="num">Salary (EUR/yr)</th>
            <th>Applied</th>
            <th>Source</th>
            <th>
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <ApplicationRow key={app.id} application={app} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApplicationRow({ application }: { application: JobApplication }) {
  const openEditForm = useUiStore((s) => s.openEditForm);
  const updateStatus = useUpdateStatus();
  const deleteApplication = useDeleteApplication();

  const meta = STATUS_META[application.status];

  const handleDelete = () => {
    const ok = window.confirm(
      `Delete the application at ${application.companyName}? This can't be undone.`,
    );
    if (ok) deleteApplication.mutate(application.id);
  };

  return (
    <tr>
      <td>
        <div className="cell-company">
          <span className="cell-company__name">{application.companyName}</span>
          {application.location && (
            <span className="cell-company__location">{application.location}</span>
          )}
        </div>
      </td>
      <td>
        <div className="cell-position">
          {application.position}
          {application.jobUrl && (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="job-link"
              aria-label={`Open job listing for ${application.position} at ${application.companyName}`}
            >
              ↗
            </a>
          )}
        </div>
      </td>
      <td>
        <select
          className={`status-select tone--${meta.tone}`}
          value={application.status}
          aria-label={`Stage for ${application.companyName}`}
          disabled={updateStatus.isPending}
          onChange={(e) =>
            updateStatus.mutate({
              id: application.id,
              status: Number(e.target.value) as ApplicationStatus,
            })
          }
        >
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_META[status].label}
            </option>
          ))}
        </select>
      </td>
      <td className="num mono">
        {formatSalaryRange(application.salaryMin, application.salaryMax)}
      </td>
      <td className="mono">{formatDate(application.appliedAt)}</td>
      <td className="muted">{application.source || "—"}</td>
      <td>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => openEditForm(application)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--danger"
            onClick={handleDelete}
            disabled={deleteApplication.isPending}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
