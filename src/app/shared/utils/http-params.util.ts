import { HttpParams } from '@angular/common/http';

/**
 * Builds HttpParams from a plain object, skipping undefined/null/empty-string values and
 * appending each element of an array value as a repeated param (e.g. multiple `sort` values).
 */
export function toHttpParams(query: object | undefined): HttpParams {
  let params = new HttpParams();
  if (!query) {
    return params;
  }
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        params = params.append(key, String(entry));
      }
    } else {
      params = params.append(key, String(value));
    }
  }
  return params;
}
