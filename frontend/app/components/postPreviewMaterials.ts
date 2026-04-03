export type PostPreviewMaterialId = 'easy-peel-stick' | 'premium-matte' | 'premium-textured-3d'
export type MeasurementUnit = 'metric' | 'imperial'

export const SQFT_PER_SQM = 10.7639

export interface PostPreviewMaterial {
  id: PostPreviewMaterialId
  name: string
  code: string
  ratePerSqm: number
  finishLabel: string
  features: string[]
  swatchImage: string
}

export const POST_PREVIEW_MATERIALS: PostPreviewMaterial[] = [
  {
    id: 'easy-peel-stick',
    name: 'Easy Peel & Stick',
    code: '#EPS 0101',
    ratePerSqm: 29.99,
    finishLabel: 'Easy Peel & Stick',
    swatchImage: '/material-swatches/easy-peel-stick.webp',
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
    ratePerSqm: 39.99,
    finishLabel: 'Premium Matte',
    swatchImage: '/material-swatches/premium-matte.webp',
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
    ratePerSqm: 49.99,
    finishLabel: 'Premium 3D Textured',
    swatchImage: '/material-swatches/premium-textured-3d.webp',
    features: [
      'Heavy, Thick Fabric Material',
      'Installed Using Wallpaper Paste',
      'Easy Seamless Installation',
      'Deeply Textured Matte Finish',
    ],
  },
]
