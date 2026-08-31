import { inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ImageCreateRequest, ImageResponse, ImageUpdateRequest, ImageUploadOptions, PageQuery, PageResponse } from '../models';
import { toHttpParams } from '../../shared/utils/http-params.util';

/**
 * Shared implementation for /api/inventory/{id}/images and /api/users/information/{id}/images,
 * which are structurally identical CRUD-plus-upload resources scoped to a different owner id.
 */
export abstract class ImageApiBase {
  protected readonly http = inject(HttpClient);

  protected abstract collectionUrl(ownerId: string): string;
  protected abstract uploadUrl(ownerId: string): string;
  protected abstract itemUrl(ownerId: string, imageId: string): string;

  list(ownerId: string, query?: PageQuery): Observable<PageResponse<ImageResponse>> {
    return this.http.get<PageResponse<ImageResponse>>(this.collectionUrl(ownerId), { params: toHttpParams(query) });
  }

  getById(ownerId: string, imageId: string): Observable<ImageResponse> {
    return this.http.get<ImageResponse>(this.itemUrl(ownerId, imageId));
  }

  createFromUrl(ownerId: string, request: ImageCreateRequest): Observable<ImageResponse> {
    return this.http.post<ImageResponse>(this.collectionUrl(ownerId), request);
  }

  update(ownerId: string, imageId: string, request: ImageUpdateRequest): Observable<ImageResponse> {
    return this.http.put<ImageResponse>(this.itemUrl(ownerId, imageId), request);
  }

  remove(ownerId: string, imageId: string): Observable<void> {
    return this.http.delete<void>(this.itemUrl(ownerId, imageId));
  }

  /** Multipart upload with progress events, for a live upload-progress indicator. */
  upload(ownerId: string, file: File, options?: ImageUploadOptions): Observable<HttpEvent<ImageResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    const params = toHttpParams({
      thumbnailUrl: options?.thumbnailUrl,
      width: options?.width,
      height: options?.height,
      displayOrder: options?.displayOrder,
      isPrimary: options?.isPrimary,
    });

    const request = new HttpRequest<FormData>('POST', this.uploadUrl(ownerId), formData, {
      params,
      reportProgress: true,
    });
    return this.http.request<ImageResponse>(request);
  }
}
