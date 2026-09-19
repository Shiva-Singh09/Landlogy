import { api } from './client';

/** GET /api/admin/property-types */
export function listPropertyTypes(signal?: AbortSignal): Promise<{ propertyTypes: Array<{ id: string; name: string }> }> {
  return api.get('/api/admin/property-types', { signal });
}

/** GET /api/admin/property-categories */
export function listPropertyCategories(signal?: AbortSignal): Promise<{ propertyCategories: Array<{ id: string; name: string }> }> {
  return api.get('/api/admin/property-categories', { signal });
}
