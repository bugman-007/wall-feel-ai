'use client'

import { createContext, useContext } from 'react'
import {
  convertUsdToCurrency,
  formatCurrencyValue,
  formatLocalizedNumber,
  getMessages,
  type SupportedCurrencyCode,
  type SupportedLocaleCode,
} from '../lib/localization'

interface LocalizationContextValue {
  locale: SupportedLocaleCode
  currency: SupportedCurrencyCode
  messages: ReturnType<typeof getMessages>
  formatPriceFromUsd: (valueUsd: number) => string
  convertPriceFromUsd: (valueUsd: number) => number
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null)

interface LocalizationProviderProps {
  locale: SupportedLocaleCode
  currency: SupportedCurrencyCode
  children: React.ReactNode
}

export function LocalizationProvider({
  locale,
  currency,
  children,
}: LocalizationProviderProps) {
  const messages = getMessages(locale)

  const value: LocalizationContextValue = {
    locale,
    currency,
    messages,
    formatPriceFromUsd: (valueUsd) => formatCurrencyValue(convertUsdToCurrency(valueUsd, currency), locale, currency),
    convertPriceFromUsd: (valueUsd) => convertUsdToCurrency(valueUsd, currency),
    formatNumber: (value, options) => formatLocalizedNumber(value, locale, options),
  }

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  )
}

export function useLocalization() {
  const context = useContext(LocalizationContext)
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider')
  }

  return context
}

