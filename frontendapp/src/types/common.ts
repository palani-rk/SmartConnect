// Common types used across the application

export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

export interface LoadingState {
  isLoading: boolean
  error?: string
}

export interface SelectOption {
  value: string
  label: string
}