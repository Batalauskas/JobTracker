import { createClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { JobApplicationService } from "../gen/job_tracker_pb";

const transport = createGrpcWebTransport({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:5000",
});

/** Typed gRPC-Web client for the JobTracker backend. */
export const api = createClient(JobApplicationService, transport);
