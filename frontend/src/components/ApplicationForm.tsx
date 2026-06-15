import { useState } from "react";
import type { FormEvent } from "react";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { useCreateApplication, useUpdateApplication } from "../api/queries";
import { ApplicationStatus } from "../gen/job_tracker_pb";
import { toDateInputValue } from "../format";
import { STATUS_META, STATUS_ORDER } from "../statusMeta";
import { useUiStore } from "../store/useUiStore";

interface FormValues {
  companyName: string;
  position: string;
  location: string;
  status: ApplicationStatus;
  source: string;
  salaryMin: string;
  salaryMax: string;
  appliedAt: string; // yyyy-mm-dd
  jobUrl: string;
  contactPerson: string;
  notes: string;
}

export function ApplicationForm() {
  const editing = useUiStore((s) => s.editing);
  const closeForm = useUiStore((s) => s.closeForm);

  const create = useCreateApplication();
  const update = useUpdateApplication();
  const mutation = editing ? update : create;

  const [values, setValues] = useState<FormValues>(() =>
    editing
      ? {
          companyName: editing.companyName,
          position: editing.position,
          location: editing.location,
          status: editing.status,
          source: editing.source,
          salaryMin: editing.salaryMin ? String(editing.salaryMin) : "",
          salaryMax: editing.salaryMax ? String(editing.salaryMax) : "",
          appliedAt: toDateInputValue(editing.appliedAt),
          jobUrl: editing.jobUrl,
          contactPerson: editing.contactPerson,
          notes: editing.notes,
        }
      : {
          companyName: "",
          position: "",
          location: "",
          status: ApplicationStatus.APPLIED,
          source: "",
          salaryMin: "",
          salaryMax: "",
          appliedAt: new Date().toISOString().slice(0, 10),
          jobUrl: "",
          contactPerson: "",
          notes: "",
        },
  );

  const set =
    <K extends keyof FormValues>(key: K) =>
    (value: FormValues[K]) =>
      setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const payload = {
      companyName: values.companyName.trim(),
      position: values.position.trim(),
      location: values.location.trim(),
      status: values.status,
      source: values.source.trim(),
      salaryMin: values.salaryMin ? Number(values.salaryMin) : 0,
      salaryMax: values.salaryMax ? Number(values.salaryMax) : 0,
      jobUrl: values.jobUrl.trim(),
      contactPerson: values.contactPerson.trim(),
      notes: values.notes,
      appliedAt: values.appliedAt
        ? timestampFromDate(new Date(`${values.appliedAt}T00:00:00Z`))
        : undefined,
    };

    if (editing) {
      update.mutate({ ...payload, id: editing.id }, { onSuccess: closeForm });
    } else {
      create.mutate(payload, { onSuccess: closeForm });
    }
  };

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeForm();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <h2 id="form-title" className="modal__title">
          {editing ? `Edit · ${editing.companyName}` : "Log application"}
        </h2>

        <form onSubmit={handleSubmit} className="app-form">
          <label className="field field--half">
            <span>Company *</span>
            <input
              required
              autoFocus
              value={values.companyName}
              onChange={(e) => set("companyName")(e.target.value)}
            />
          </label>

          <label className="field field--half">
            <span>Position *</span>
            <input
              required
              value={values.position}
              onChange={(e) => set("position")(e.target.value)}
            />
          </label>

          <label className="field field--half">
            <span>Location</span>
            <input
              placeholder="Munich, remote, …"
              value={values.location}
              onChange={(e) => set("location")(e.target.value)}
            />
          </label>

          <label className="field field--half">
            <span>Stage</span>
            <select
              value={values.status}
              onChange={(e) =>
                set("status")(Number(e.target.value) as ApplicationStatus)
              }
            >
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {STATUS_META[status].label}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--third">
            <span>Salary min</span>
            <input
              type="number"
              min="0"
              step="1000"
              placeholder="75000"
              value={values.salaryMin}
              onChange={(e) => set("salaryMin")(e.target.value)}
            />
          </label>

          <label className="field field--third">
            <span>Salary max</span>
            <input
              type="number"
              min="0"
              step="1000"
              placeholder="90000"
              value={values.salaryMax}
              onChange={(e) => set("salaryMax")(e.target.value)}
            />
          </label>

          <label className="field field--third">
            <span>Applied on</span>
            <input
              type="date"
              value={values.appliedAt}
              onChange={(e) => set("appliedAt")(e.target.value)}
            />
          </label>

          <label className="field field--half">
            <span>Source</span>
            <input
              placeholder="LinkedIn, StepStone, referral…"
              value={values.source}
              onChange={(e) => set("source")(e.target.value)}
            />
          </label>

          <label className="field field--half">
            <span>Contact person</span>
            <input
              value={values.contactPerson}
              onChange={(e) => set("contactPerson")(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Job listing URL</span>
            <input
              type="url"
              placeholder="https://…"
              value={values.jobUrl}
              onChange={(e) => set("jobUrl")(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea
              rows={3}
              placeholder="Interview prep, salary talk, impressions…"
              value={values.notes}
              onChange={(e) => set("notes")(e.target.value)}
            />
          </label>

          {mutation.isError && (
            <p className="form-error" role="alert">
              {mutation.error.message}
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="btn" onClick={closeForm}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={mutation.isPending}
            >
              {editing ? "Save changes" : "Log application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
