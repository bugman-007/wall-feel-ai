/**
 * API Response Types for Wallfeel AI Visualizer
 * These types ensure type safety when interacting with the backend API
 */

// ============== Common Types ==============

export interface Material {
  variantId: string
  name: string
  price: number
  currency: string
  available: boolean
  compareAtPrice?: number | null
}

export interface ShopifyCollection {
  id: string
  title: string
  handle: string
  description?: string
  image?: {
    url: string
    altText?: string
  }
}

// ============== Product Types ==============

export interface WallpaperProduct {
  id: string
  handle: string
  title: string
  name: string
  description: string
  category: string
  appCategories?: string[]
  shopifyCollections?: string[]
  thumbnail_url: string
  image: string
  full_url: string
  materials?: Material[]
  tags?: string[]
  available?: boolean
  styleLabels?: string[]
  feelLabels?: string[]
  vendor?: string
  productType?: string
  priceRange?: {
    minVariantPrice: {
      amount: number
      currencyCode: string
    }
    maxVariantPrice: {
      amount: number
      currencyCode: string
    }
  }
}

export interface ProductApiResponse {
  products: WallpaperProduct[]
}

export interface ProductDetailApiResponse extends WallpaperProduct {
  shopify_id?: string
  availableForSale?: boolean
  featuredImage?: {
    url: string
    altText?: string
  }
  images?: Array<{
    url: string
    altText?: string
  }>
  options?: Array<{
    name: string
    values: string[]
  }>
}

// ============== Catalog Types ==============

export interface CatalogDesign {
  id: string
  name: string
  category: string
  thumbnail_url: string
  full_url: string
  description: string
  shopify_id?: string
  handle?: string
  materials?: Material[]
}

export interface CatalogApiResponse {
  designs: CatalogDesign[]
}

// ============== Classification Labels Types ==============

export interface ClassificationLabels {
  styles: string[]
  feels: string[]
}

export interface ClassificationLabelsApiResponse {
  styles: string[]
  feels: string[]
}

// ============== Collection Types ==============

export interface CategoryGroup {
  name: string
  categories: string[]
}

export interface CategoryGroupsApiResponse {
  groups: CategoryGroup[]
}

export interface CollectionsApiResponse {
  collections: ShopifyCollection[]
}

// ============== Upload Types ==============

export interface UploadApiResponse {
  success: boolean
  url: string
  public_url: string
  filename: string
  size: number
  content_type: string
}

// ============== Preview Generation Types ==============

export type QualityLevel = '1k' | '2k' | '4k' | '8k'

export interface TimingInfo {
  download_time: number
  generation_time: number
  postprocess_time: number
  upload_time: number
  total_time: number
}

export interface CustomDesignTimingInfo {
  download_time?: number
  texture_generation_time?: number
  apply_generation_time?: number
  postprocess_time: number
  upload_time: number
  total_time: number
}

export interface PreviewSuccessResponse {
  success: true
  fallback?: false
  preview_url: string
  provider: 'google' | 'mock'
  model: string
  quality: QualityLevel
  native_size?: string
  is_upscale_mode?: boolean
  output_dimensions?: string
  timing: TimingInfo | CustomDesignTimingInfo
}

export interface PreviewFallbackResponse {
  success: false
  fallback: true
  preview_url: null
  description: string
  provider: 'mock'
  error: string
  timing: {
    download_time: 0
    generation_time: 0
    postprocess_time: 0
    upload_time: 0
    total_time: 0
  }
}

export interface PreviewErrorResponse {
  success: false
  fallback?: boolean
  preview_url: null
  error: string
  user_message?: string
  error_type?: string
}

export type PreviewApiResponse =
  | PreviewSuccessResponse
  | PreviewFallbackResponse
  | PreviewErrorResponse

// ============== Wallpaper Texture Generation Types ==============

export interface WallpaperTextureSuccessResponse {
  success: true
  wallpaper_url: string
  wallpaper_urls: string[]
  public_url: string
  public_urls?: string[]
  provider: 'google'
  model: string
  timing: {
    generation_time: number
    upload_time: number
    total_time: number
  }
}

export interface WallpaperTextureErrorResponse {
  success: false
  error: string
  user_message?: string
  wallpaper_url: null
}

export type WallpaperTextureApiResponse =
  | WallpaperTextureSuccessResponse
  | WallpaperTextureErrorResponse

// ============== Custom Design Request Types ==============

export interface DirectPreviewRequest {
  image_url: string
  wallpaper_id: string
  quality?: QualityLevel
}

export interface CustomDesignRequest {
  prompt: string
  style_inspirations: string[]
}

export interface ApplyCustomWallpaperRequest {
  image_url: string
  wallpaper_url: string
  quality?: QualityLevel
}

export interface ApplyWallpaperRequest {
  image_url: string
  wallpaper_id?: string
  wallpaper_url?: string
  quality?: QualityLevel
}

// ============== Job Queue Types ==============

export type JobType = 'room_preview' | 'wallpaper_texture'
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface PreviewJob {
  id: string
  type: JobType
  status: JobStatus
  retry_count: number
  created_at: number
  updated_at: number
  result?: {
    preview_url?: string
    wallpaper_url?: string
    wallpaper_urls?: string[]
    [key: string]: unknown
  }
  error_message?: string
  raw_error?: string
  estimated_wait_seconds?: number
}

export interface PreviewJobCreateRequest {
  type: JobType
  image_url?: string
  wallpaper_id?: string
  wallpaper_url?: string
  quality?: QualityLevel
  prompt?: string
  style_inspirations?: string[]
}

export interface PreviewJobCreateResponse {
  job_id: string
  status: JobStatus
  type: JobType
}

export type PreviewJobResponse = PreviewJob

// ============== Order Types ==============

export type MaterialType = 'peel_stick' | 'traditional' | 'premium'

export interface CreateOrderRequest {
  preview_image_url: string
  original_image_url: string
  wallpaper_id: string
  wallpaper_name: string
  width: number
  height: number
  material: MaterialType
  price: number
  customer_email: string
}

export interface CreateOrderResponse {
  success: boolean
  order_id: string
  checkout_url: string
  mock?: boolean
  message?: string
  order_details?: {
    dimensions: string
    material: string
    price: number
    wallpaper: string
  }
}

// ============== Error Response Types ==============

export interface ApiError {
  detail?: string
  error?: string
  message?: string
}

export interface HttpErrorResponse {
  status: number
  statusText: string
  detail?: string
  error?: string
}

// ============== Helper Type Guards ==============

export function isPreviewSuccessResponse(response: unknown): response is PreviewSuccessResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as PreviewSuccessResponse).success === true &&
    'preview_url' in response
  )
}

export function isPreviewFallbackResponse(response: unknown): response is PreviewFallbackResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'fallback' in response &&
    (response as PreviewFallbackResponse).fallback === true
  )
}

export function isWallpaperTextureSuccessResponse(response: unknown): response is WallpaperTextureSuccessResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as WallpaperTextureSuccessResponse).success === true &&
    'wallpaper_url' in response
  )
}

export function isJobCompletedResponse(response: PreviewJobResponse): boolean {
  return response.status === 'completed' && response.result !== undefined
}

export function isJobFailedResponse(response: PreviewJobResponse): boolean {
  return response.status === 'failed'
}
