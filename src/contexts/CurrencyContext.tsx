import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type CurrencyCode = 'USD' | 'NGN' | 'GBP';

interface ExchangeRates {
  NGN: number; // 1 USD = X NGN
  GBP: number; // 1 USD = X GBP
}

interface CurrencySettings {
  currency: CurrencyCode;
  exchangeRates: ExchangeRates;
  setCurrency: (currency: CurrencyCode) => void;
  setExchangeRate: (currency: 'NGN' | 'GBP', rate: number) => void;
  formatPrice: (amount: number, originalCurrency?: CurrencyCode) => string;
  convertPrice: (amount: number, fromCurrency?: CurrencyCode) => number;
  currencySymbol: string;
  // Legacy support
  exchangeRate: number;
  setExchangeRateLegacy: (rate: number) => void;
}

const CurrencyContext = createContext<CurrencySettings | undefined>(undefined);

const CURRENCY_STORAGE_KEY = 'pharmatrack_currency';
const EXCHANGE_RATES_STORAGE_KEY = 'pharmatrack_exchange_rates';

const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  NGN: 1600,
  GBP: 0.79,
};

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  NGN: '₦',
  GBP: '£',
};

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  USD: 'en-US',
  NGN: 'en-NG',
  GBP: 'en-GB',
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider = ({ children }: CurrencyProviderProps) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return (saved as CurrencyCode) || 'NGN';
  });

  const [exchangeRates, setExchangeRatesState] = useState<ExchangeRates>(() => {
    const saved = localStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_EXCHANGE_RATES;
  });

  useEffect(() => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(exchangeRates));
  }, [exchangeRates]);

  const setCurrency = (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
  };

  const setExchangeRate = (curr: 'NGN' | 'GBP', rate: number) => {
    setExchangeRatesState(prev => ({ ...prev, [curr]: rate }));
  };

  // Legacy support for existing code
  const setExchangeRateLegacy = (rate: number) => {
    setExchangeRatesState(prev => ({ ...prev, NGN: rate }));
  };

  const convertToUSD = (amount: number, fromCurrency: CurrencyCode): number => {
    if (fromCurrency === 'USD') return amount;
    if (fromCurrency === 'NGN') return amount / exchangeRates.NGN;
    if (fromCurrency === 'GBP') return amount / exchangeRates.GBP;
    return amount;
  };

  const convertFromUSD = (amount: number, toCurrency: CurrencyCode): number => {
    if (toCurrency === 'USD') return amount;
    if (toCurrency === 'NGN') return amount * exchangeRates.NGN;
    if (toCurrency === 'GBP') return amount * exchangeRates.GBP;
    return amount;
  };

  const convertPrice = (amount: number, fromCurrency: CurrencyCode = 'USD'): number => {
    if (fromCurrency === currency) return amount;
    const usdAmount = convertToUSD(amount, fromCurrency);
    return convertFromUSD(usdAmount, currency);
  };

  const formatPrice = (amount: number, originalCurrency: CurrencyCode = 'USD'): string => {
    const convertedAmount = convertPrice(amount, originalCurrency);
    const symbol = CURRENCY_SYMBOLS[currency];
    const locale = CURRENCY_LOCALES[currency];
    
    return `${symbol}${convertedAmount.toLocaleString(locale, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const currencySymbol = CURRENCY_SYMBOLS[currency];

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      exchangeRates,
      setCurrency, 
      setExchangeRate, 
      formatPrice,
      convertPrice,
      currencySymbol,
      // Legacy support
      exchangeRate: exchangeRates.NGN,
      setExchangeRateLegacy,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};
