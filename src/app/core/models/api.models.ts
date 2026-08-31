/** Mirrors Spring Data's default Jackson serialization of `Page<T>`. */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

/** Standard query params accepted by every paginated backend endpoint. */
export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string | string[];
}

/** Mirrors `GlobalExceptionHandler`'s `ApiError` record. */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors: Record<string, string>;
}
