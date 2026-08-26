/**
 * Shared TypeScript types for MAHALO3 frontend.
 */

export type UserRole = "product_manager" | "developer" | "executive";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
}

export interface Integration {
  id: number;
  type: "jira" | "confluence" | "github";
  url: string;
  token: string;
  project_scope: string;
  created_at: string;
}
