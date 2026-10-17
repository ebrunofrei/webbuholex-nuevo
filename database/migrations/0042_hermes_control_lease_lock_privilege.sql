-- Migration 0042: Grant UPDATE on hermes_control.concurrency_leases to hermes_control_runtime
-- Required by PostgreSQL SELECT ... FOR UPDATE row-locking fencing during worker finalization
GRANT UPDATE ON TABLE "hermes_control"."concurrency_leases" TO hermes_control_runtime;
