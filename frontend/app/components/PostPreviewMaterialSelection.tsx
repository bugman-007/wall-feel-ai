'use client'

import {
  POST_PREVIEW_MATERIALS,
  SQFT_PER_SQM,
  type MeasurementUnit,
  type PostPreviewMaterialId,
} from './postPreviewMaterials'

interface PostPreviewMaterialSelectionProps {
  previewImageUrl: string
  selectedMaterialId: PostPreviewMaterialId | null
  onSelectMaterial: (materialId: PostPreviewMaterialId) => void
  measurementUnit: MeasurementUnit
  onMeasurementUnitChange: (unit: MeasurementUnit) => void
  wallWidth: string
  wallHeight: string
  onWallWidthChange: (value: string) => void
  onWallHeightChange: (value: string) => void
  areaDisplay: number | null
  areaDisplayUnit: 'sqm' | 'sqft'
  areaSqm: number | null
  totalPrice: number | null
  cartNotice: string | null
  onAddToCart: () => void
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

export default function PostPreviewMaterialSelection({
  previewImageUrl,
  selectedMaterialId,
  onSelectMaterial,
  measurementUnit,
  onMeasurementUnitChange,
  wallWidth,
  wallHeight,
  onWallWidthChange,
  onWallHeightChange,
  areaDisplay,
  areaDisplayUnit,
  areaSqm,
  totalPrice,
  cartNotice,
  onAddToCart,
}: PostPreviewMaterialSelectionProps) {
  const selectedMaterial = POST_PREVIEW_MATERIALS.find((material) => material.id === selectedMaterialId) || null
  const isReadyForCart = Boolean(selectedMaterial && totalPrice !== null && areaSqm !== null && areaSqm > 0)

  return (
    <section className="material-selection-shell">
      <div
        className="material-selection-hero"
        style={{
          backgroundImage: `var(--material-hero-overlay), url(${previewImageUrl})`,
        }}
      >
        <div className="material-selection-glow" />

        <div className="material-selection-header">
          <div className="material-brand-lockup">
            <span className="material-brand-icon" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="material-brand-name">WALLFEEL</span>
          </div>
          <h3>Smart Material Selection</h3>
          <p>
            Explore our premium textured wall coverings, tailored for quality and style.
          </p>
        </div>

        <div className="material-card-grid">
          {POST_PREVIEW_MATERIALS.map((material) => {
            const pricePerSqft = material.ratePerSqm / SQFT_PER_SQM
            const isSelected = material.id === selectedMaterialId

            return (
              <button
                key={material.id}
                type="button"
                onClick={() => onSelectMaterial(material.id)}
                className={`material-card ${isSelected ? 'is-selected' : ''}`}
              >
                <div className="material-card-cap">{material.finishLabel}</div>
                <div className="material-card-body">
                  <h4>{material.name}</h4>
                  <p className="material-card-code">{material.code}</p>

                  <div className={`material-swatch ${material.swatchClassName}`}>
                    <span className="material-swatch-roll" />
                  </div>

                  <ul className="material-feature-list">
                    {material.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>

                  <div className="material-rate-block">
                    <p>{formatPrice(material.ratePerSqm)} / sqm</p>
                    <p>{formatPrice(pricePerSqft)} / sqft</p>
                  </div>

                  <p className="material-card-code material-card-code-bottom">{material.code}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="material-pricing-panel">
          <div className="material-pricing-head">
            <div>
              <p className="material-pricing-kicker">Wall Dimensions</p>
              <h4>Calculate your wall area and total estimate</h4>
            </div>

            <div className="material-unit-toggle" role="tablist" aria-label="Measurement unit">
              <button
                type="button"
                onClick={() => onMeasurementUnitChange('metric')}
                className={measurementUnit === 'metric' ? 'is-active' : ''}
              >
                m × m
              </button>
              <button
                type="button"
                onClick={() => onMeasurementUnitChange('imperial')}
                className={measurementUnit === 'imperial' ? 'is-active' : ''}
              >
                ft × ft
              </button>
            </div>
          </div>

          <div className="material-input-grid">
            <label className="material-input-card">
              <span>Wall width</span>
              <div className="material-input-wrap">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={measurementUnit === 'metric' ? 'e.g. 4.20' : 'e.g. 13.75'}
                  value={wallWidth}
                  onChange={(event) => onWallWidthChange(event.target.value)}
                />
                <strong>{measurementUnit === 'metric' ? 'm' : 'ft'}</strong>
              </div>
            </label>

            <label className="material-input-card">
              <span>Wall height</span>
              <div className="material-input-wrap">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={measurementUnit === 'metric' ? 'e.g. 2.80' : 'e.g. 9.20'}
                  value={wallHeight}
                  onChange={(event) => onWallHeightChange(event.target.value)}
                />
                <strong>{measurementUnit === 'metric' ? 'm' : 'ft'}</strong>
              </div>
            </label>
          </div>

          <div className="material-summary-grid">
            <div className="material-summary-card">
              <span>Selected material</span>
              <strong>{selectedMaterial ? selectedMaterial.name : 'Choose a material card above'}</strong>
            </div>
            <div className="material-summary-card">
              <span>Wall area</span>
              <strong>
                {areaDisplay !== null
                  ? `${formatNumber(areaDisplay)} ${areaDisplayUnit}`
                  : `Enter width and height in ${measurementUnit === 'metric' ? 'meters' : 'feet'}`}
              </strong>
              <p>
                {areaSqm !== null ? `${formatNumber(areaSqm)} sqm billable area` : 'Pricing is normalized to square meters.'}
              </p>
            </div>
            <div className="material-summary-card total-card">
              <span>Total price</span>
              <strong>{totalPrice !== null ? formatPrice(totalPrice) : 'Select material and dimensions'}</strong>
              <p>{selectedMaterial ? `${formatPrice(selectedMaterial.ratePerSqm)} per sqm` : 'Pricing unlocks after material selection.'}</p>
            </div>
          </div>
        </div>

        <div className="material-selection-actions">
          <button
            type="button"
            className="material-select-btn"
            onClick={onAddToCart}
            disabled={!isReadyForCart}
          >
            Add to Cart
          </button>
          <p className="material-selection-footnote">
            Estimates are shown in GBP and based on the selected wall area.
          </p>
          {cartNotice && <p className="material-selection-notice">{cartNotice}</p>}
        </div>
      </div>
    </section>
  )
}
