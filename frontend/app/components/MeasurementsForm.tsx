'use client'

import { useState } from 'react'
import { MATERIALS, MaterialType, calculatePrice, formatPrice, validateDimensions } from '../utils/pricing'

interface MeasurementsFormProps {
  onProceedToCheckout: (data: {
    width: number
    height: number
    material: MaterialType
    price: number
  }) => void
}

export default function MeasurementsForm({ onProceedToCheckout }: MeasurementsFormProps) {
  const [width, setWidth] = useState<string>('3.2')
  const [height, setHeight] = useState<string>('2.4')
  const [material, setMaterial] = useState<MaterialType>('peel_stick')
  const [error, setError] = useState<string | null>(null)

  const widthNum = parseFloat(width) || 0
  const heightNum = parseFloat(height) || 0

  // Calculate pricing
  const pricing = widthNum > 0 && heightNum > 0
    ? calculatePrice(widthNum, heightNum, material)
    : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate dimensions
    const validationError = validateDimensions(widthNum, heightNum)
    if (validationError) {
      setError(validationError)
      return
    }

    if (!pricing) {
      setError('Please enter valid dimensions')
      return
    }

    // Proceed to checkout
    onProceedToCheckout({
      width: widthNum,
      height: heightNum,
      material,
      price: pricing.total
    })
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {/* Dimensions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Wall Dimensions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Width (meters)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="3.2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Height (meters)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="2.4"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Measure your wall width and height in meters (0.5m - 10m)
          </p>
        </div>

        {/* Material Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Material Type
          </h3>
          <div className="space-y-3">
            {(Object.keys(MATERIALS) as MaterialType[]).map((key) => {
              const mat = MATERIALS[key]
              return (
                <label
                  key={key}
                  className={`
                    flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${material === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="material"
                    value={key}
                    checked={material === key}
                    onChange={(e) => setMaterial(e.target.value as MaterialType)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {mat.name}
                      </span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatPrice(mat.price)}/m²
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {mat.description}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Price Breakdown */}
        {pricing && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Price Breakdown
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Wall area:</span>
                <span>{pricing.area.toFixed(2)} m²</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Material cost:</span>
                <span>{formatPrice(pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Waste allowance (10%):</span>
                <span>{formatPrice(pricing.total - pricing.subtotal)}</span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                  <span>Total:</span>
                  <span>{formatPrice(pricing.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!pricing}
          className={`
            w-full px-6 py-3 rounded-lg font-semibold text-white text-lg
            transition-all duration-200
            ${pricing
              ? 'bg-green-600 hover:bg-green-700 active:scale-95'
              : 'bg-gray-400 cursor-not-allowed'
            }
          `}
        >
          Proceed to Checkout
        </button>
      </form>
    </div>
  )
}
