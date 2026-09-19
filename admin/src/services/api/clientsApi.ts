import { api } from "./client";
import type { ClientDetailResponse, ClientListQuery, ClientListResponse, ClientStatus, UpdateClientStatusResponse } from "../../types/client";

export function listClients(query: ClientListQuery = {}, signal?: AbortSignal): Promise<ClientListResponse> {
  return api.get<ClientListResponse>("/api/admin/clients", { query, signal });
}

export function getClient(id: string, signal?: AbortSignal): Promise<ClientDetailResponse> {
  return api.get<ClientDetailResponse>(`/api/admin/clients/${id}`, { signal });
}

export function updateClientStatus(id: string, status: ClientStatus): Promise<UpdateClientStatusResponse> {
  return api.patch<UpdateClientStatusResponse>(`/api/admin/clients/${id}/status`, { status });
}
