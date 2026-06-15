import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { MessageInitShape } from "@bufbuild/protobuf";
import { api } from "./client";
import type {
  ApplicationStatus,
  CreateApplicationRequestSchema,
  UpdateApplicationRequestSchema,
} from "../gen/job_tracker_pb";

export type CreateApplicationInput = MessageInitShape<
  typeof CreateApplicationRequestSchema
>;
export type UpdateApplicationInput = MessageInitShape<
  typeof UpdateApplicationRequestSchema
>;

export function useApplications(
  statusFilter: ApplicationStatus,
  search: string,
) {
  return useQuery({
    queryKey: ["applications", statusFilter, search],
    queryFn: () => api.listApplications({ statusFilter, search }),
    select: (response) => response.applications,
    placeholderData: keepPreviousData,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.getDashboardStats({}),
  });
}

/** Every write touches both the list and the stats. */
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["applications"] });
    void queryClient.invalidateQueries({ queryKey: ["stats"] });
  };
}

export function useCreateApplication() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: CreateApplicationInput) =>
      api.createApplication(input),
    onSuccess: invalidate,
  });
}

export function useUpdateApplication() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: UpdateApplicationInput) =>
      api.updateApplication(input),
    onSuccess: invalidate,
  });
}

export function useUpdateStatus() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: { id: string; status: ApplicationStatus }) =>
      api.updateStatus(input),
    onSuccess: invalidate,
  });
}

export function useDeleteApplication() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.deleteApplication({ id }),
    onSuccess: invalidate,
  });
}
