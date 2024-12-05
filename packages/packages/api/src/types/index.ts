export interface BaseResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  code?: string;
} 