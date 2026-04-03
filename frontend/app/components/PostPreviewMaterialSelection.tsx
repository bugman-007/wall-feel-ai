'use client'

import Image from 'next/image'
import {
  POST_PREVIEW_MATERIALS,
  SQFT_PER_SQM,
  type MeasurementUnit,
  type PostPreviewMaterialId,
} from './postPreviewMaterials'
import { useLocalization } from '../contexts/LocalizationContext'
import { formatCurrencySelectorLabel } from '../lib/localization'

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
  areaDisplayUnit: 'sqm' | 'sqft' | 'sqin'
  areaSqm: number | null
  totalPrice: number | null
  cartNotice: string | null
  onAddToCart: () => void
}

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
  const { currency, formatNumber, formatPriceFromUsd, messages } = useLocalization()
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
            <span className="material-brand-name">WallFeel.</span>
          </div>
          <h3>{messages.materials.title}</h3>
          <p>{messages.materials.subtitle}</p>
        </div>

        <div className="material-card-grid">
          {POST_PREVIEW_MATERIALS.map((material) => {
            const materialCopy = messages.materials.materialMap[material.id]
            const pricePerSqft = material.ratePerSqmUsd / SQFT_PER_SQM
            const isSelected = material.id === selectedMaterialId

            return (
              <button
                key={material.id}
                type="button"
                onClick={() => onSelectMaterial(material.id)}
                className={`material-card ${isSelected ? 'is-selected' : ''}`}
              >
                <div className="material-card-cap">{materialCopy?.finishLabel || material.finishLabel}</div>
                <div className="material-card-body">
                  <h4>{materialCopy?.name || material.name}</h4>
                  <p className="material-card-code">{material.code}</p>

                  <div className="material-swatch">
                    <Image
                      src={material.swatchImage}
                      alt={`${materialCopy?.name || material.name} material sample`}
                      fill
                      className="material-swatch-image"
                      style={{ objectPosition: material.swatchObjectPosition || 'center center' }}
                      sizes="(max-width: 980px) 100vw, (max-width: 1120px) 50vw, 28vw"
                    />
                  </div>

                  <ul className="material-feature-list">
                    {(materialCopy?.features || material.features).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>

                  <div className="material-rate-block">
                    <p>{formatPriceFromUsd(material.ratePerSqmUsd)} / {messages.materials.unitSqm}</p>
                    <p>{formatPriceFromUsd(pricePerSqft)} / {messages.materials.unitSqft}</p>
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
              <p className="material-pricing-kicker">{messages.materials.pricingKicker}</p>
              <h4>{messages.materials.pricingTitle}</h4>
            </div>

            <div className="material-unit-toggle" role="tablist" aria-label={messages.materials.measurementAria}>
              <button
                type="button"
                onClick={() => onMeasurementUnitChange('metric')}
                className={measurementUnit === 'metric' ? 'is-active' : ''}
              >
                {messages.materials.unitMetric}
              </button>
              <button
                type="button"
                onClick={() => onMeasurementUnitChange('imperial')}
                className={measurementUnit === 'imperial' ? 'is-active' : ''}
              >
                {messages.materials.unitImperial}
              </button>
              <button
                type="button"
                onClick={() => onMeasurementUnitChange('inch')}
                className={measurementUnit === 'inch' ? 'is-active' : ''}
              >
                {messages.materials.unitInches}
              </button>
            </div>
          </div>

          <div className="material-input-grid">
            <label className="material-input-card">
              <span>{messages.materials.wallWidth}</span>
              <div className="material-input-wrap">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={
                    measurementUnit === 'metric'
                      ? 'e.g. 4.20'
                      : measurementUnit === 'imperial'
                        ? 'e.g. 13.75'
                        : 'e.g. 165.35'
                  }
                  value={wallWidth}
                  onChange={(event) => onWallWidthChange(event.target.value)}
                />
                <strong>
                  {measurementUnit === 'metric' ? 'm' : measurementUnit === 'imperial' ? 'ft' : 'in'}
                </strong>
              </div>
            </label>

            <label className="material-input-card">
              <span>{messages.materials.wallHeight}</span>
              <div className="material-input-wrap">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={
                    measurementUnit === 'metric'
                      ? 'e.g. 2.80'
                      : measurementUnit === 'imperial'
                        ? 'e.g. 9.20'
                        : 'e.g. 110.24'
                  }
                  value={wallHeight}
                  onChange={(event) => onWallHeightChange(event.target.value)}
                />
                <strong>
                  {measurementUnit === 'metric' ? 'm' : measurementUnit === 'imperial' ? 'ft' : 'in'}
                </strong>
              </div>
            </label>
          </div>

          <div className="material-summary-grid">
            <div className="material-summary-card">
              <span>{messages.materials.selectedMaterial}</span>
              <strong>
                {selectedMaterial
                  ? messages.materials.materialMap[selectedMaterial.id]?.name || selectedMaterial.name
                  : messages.materials.chooseMaterial}
              </strong>
            </div>
            <div className="material-summary-card">
              <span>{messages.materials.wallArea}</span>
              <strong>
                {areaDisplay !== null
                  ? `${formatNumber(areaDisplay)} ${messages.materials[areaDisplayUnit === 'sqm' ? 'unitSqm' : areaDisplayUnit === 'sqft' ? 'unitSqft' : 'unitSqin']}`
                  : `${
                    measurementUnit === 'metric'
                      ? messages.materials.enterMetric
                      : measurementUnit === 'imperial'
                        ? messages.materials.enterImperial
                        : messages.materials.enterInches
                  }`}
              </strong>
              <p>
                {areaSqm !== null
                  ? messages.materials.billableArea.replace('{value}', formatNumber(areaSqm))
                  : messages.materials.normalizedPricing}
              </p>
            </div>
            <div className="material-summary-card total-card">
              <span>{messages.materials.totalPrice}</span>
              <strong>{totalPrice !== null ? formatPriceFromUsd(totalPrice) : messages.materials.selectMaterialAndDimensions}</strong>
              <p>
                {selectedMaterial
                  ? `${formatPriceFromUsd(selectedMaterial.ratePerSqmUsd)} ${messages.materials.perSqm}`
                  : messages.materials.pricingUnlocks}
              </p>
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
              <svg
                className="material-select-btn-icon"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              >
                <circle cx="9" cy="19" r="1.7" />
                <circle cx="18" cy="19" r="1.7" />
                <path d="M3 5h2.2l2.1 9.4a1 1 0 0 0 .98.78h8.96a1 1 0 0 0 .97-.76L20.2 8H7.1" />
              </svg>
            <span>{messages.materials.addToCart}</span>
          </button>
          <p className="material-selection-footnote">
            {messages.materials.footnote.replace('{currency}', formatCurrencySelectorLabel(currency))}
          </p>
          {cartNotice && <p className="material-selection-notice">{cartNotice}</p>}
        </div>
      </div>
    </section>
  )
}
