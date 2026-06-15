import { ApplicationStatus } from "./gen/job_tracker_pb";

export interface StatusMeta {
  label: string;
  /** CSS suffix used by badges, chips and pipeline segments. */
  tone: string;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  [ApplicationStatus.UNSPECIFIED]: { label: "All", tone: "all" },
  [ApplicationStatus.DRAFT]: { label: "Draft", tone: "draft" },
  [ApplicationStatus.APPLIED]: { label: "Applied", tone: "applied" },
  [ApplicationStatus.INTERVIEW]: { label: "Interview", tone: "interview" },
  [ApplicationStatus.OFFER]: { label: "Offer", tone: "offer" },
  [ApplicationStatus.REJECTED]: { label: "Rejected", tone: "rejected" },
  [ApplicationStatus.WITHDRAWN]: { label: "Withdrawn", tone: "withdrawn" },
};

/** Concrete statuses in pipeline order (no UNSPECIFIED). */
export const STATUS_ORDER: ApplicationStatus[] = [
  ApplicationStatus.DRAFT,
  ApplicationStatus.APPLIED,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
];
