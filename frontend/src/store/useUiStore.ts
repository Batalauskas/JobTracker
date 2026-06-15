import { create } from "zustand";
import { ApplicationStatus, type JobApplication } from "../gen/job_tracker_pb";

/**
 * Client-side UI state (filters, modal). Server data lives in TanStack Query —
 * this store deliberately holds nothing that the backend owns.
 */
interface UiState {
  statusFilter: ApplicationStatus;
  search: string;
  formOpen: boolean;
  editing: JobApplication | null;
  setStatusFilter: (status: ApplicationStatus) => void;
  setSearch: (search: string) => void;
  openCreateForm: () => void;
  openEditForm: (application: JobApplication) => void;
  closeForm: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  statusFilter: ApplicationStatus.UNSPECIFIED,
  search: "",
  formOpen: false,
  editing: null,
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearch: (search) => set({ search }),
  openCreateForm: () => set({ formOpen: true, editing: null }),
  openEditForm: (editing) => set({ formOpen: true, editing }),
  closeForm: () => set({ formOpen: false, editing: null }),
}));
