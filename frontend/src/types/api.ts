/** Mirrors backend `ErrorResponseDto`. */
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: ApiErrorDetail[];
}

/** Mirrors backend `HealthResponseDto`. */
export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
}
