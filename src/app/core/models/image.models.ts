/** Shared response shape for both inventory images and user profile images. */
export interface ImageResponse {
  id: string;
  /** The parent inventory id, or user information id, depending on which endpoint returned it. */
  ownerId: string;
  storageKey: string;
  url: string;
  thumbnailUrl: string | null;
  contentType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  displayOrder: number;
  isPrimary: boolean;
  active: boolean;
  createDate: string;
  updateDate: string;
  updateUser: string;
  version: number;
}

export interface ImageCreateRequest {
  url: string;
  thumbnailUrl?: string;
  contentType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  displayOrder?: number;
  isPrimary: boolean;
}

export interface ImageUpdateRequest extends ImageCreateRequest {
  active: boolean;
}

/** Optional query params accepted by the multipart /upload endpoints (besides the `file` part). */
export interface ImageUploadOptions {
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  displayOrder?: number;
  isPrimary?: boolean;
}

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // matches app.images.max-file-size default (10MB)
export const ACCEPTED_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
