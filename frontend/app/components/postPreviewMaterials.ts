export type PostPreviewMaterialId = 'easy-peel-stick' | 'premium-matte' | 'premium-textured-3d'
export type MeasurementUnit = 'metric' | 'imperial' | 'inch'

export const SQFT_PER_SQM = 10.7639
export const SQIN_PER_SQM = 1550.0031

export interface PostPreviewMaterial {
  id: PostPreviewMaterialId
  name: string
  code: string
  ratePerSqmUsd: number
  finishLabel: string
  features: string[]
  swatchImage: string
  swatchObjectPosition?: string
}

export const POST_PREVIEW_MATERIALS: PostPreviewMaterial[] = [
  {
    id: 'easy-peel-stick',
    name: 'Easy Peel & Stick',
    code: '#EPS 0101',
    ratePerSqmUsd: 29.99,
    finishLabel: 'Easy Peel & Stick',
    swatchImage: '/material-swatches/easy-peel-stick.jpeg',
    swatchObjectPosition: 'center center',
    features: [
      'PVC-Free Vinyl Material',
      'Waterproof Surface',
      'Smooth Matte Finish',
      'Removable & Scratch-resistant',
    ],
  },
  {
    id: 'premium-matte',
    name: 'Premium Matte',
    code: '#PM 0101',
    ratePerSqmUsd: 39.99,
    finishLabel: 'Premium Matte',
    swatchImage: '/material-swatches/premium-matte.jpeg',
    swatchObjectPosition: 'center center',
    features: [
      'Lightweight Fabric Material',
      'Installed Using Wallpaper Paste',
      'Tear, Stain & Scratch-resistant',
      'Soft Premium Matte Finish',
    ],
  },
  {
    id: 'premium-textured-3d',
    name: 'Premium Textured 3D',
    code: '#P3D.T 0101',
    ratePerSqmUsd: 49.99,
    finishLabel: 'Premium 3D Textured',
    swatchImage: '/material-swatches/premium-textured-3d.jpeg',
    swatchObjectPosition: 'center center',
    features: [
      'Heavy, Thick Fabric Material',
      'Installed Using Wallpaper Paste',
      'Easy Seamless Installation',
      'Deeply Textured Matte Finish',
    ],
  },
]
