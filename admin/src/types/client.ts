import type { ApiResponse, PaginatedQuery, Pagination } from "./api";

export type ClientStatus = "active" | "inactive" | "suspended";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: ClientStatus;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  force_password_change: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientListQuery extends PaginatedQuery {
  status?: ClientStatus;
  search?: string;
}

export type ClientListResponse = ApiResponse<{ clients: Client[]; pagination: Pagination }>;
export type ClientDetailResponse = ApiResponse<{ client: Client }>;
export type UpdateClientStatusResponse = ApiResponse<{ client: Pick<Client, "id" | "status" | "updated_at"> }>;
