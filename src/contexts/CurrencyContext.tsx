import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type CurrencyCode = 'USD' | 'NGN';

interface CurrencySettings {
  currency: CurrencyCode;
  exchangeRate: number; // 1 USD = X NGN
  setCurrency: (currency: CurrencyCode) => void;
  setExchangeRate: (rate: number) => void;
  formatPrice: (amount: number, originalCurrency?: CurrencyCode) => string;
  convertPrice: (amount: number, fromCurrency?: CurrencyCode) => number;
}

const CurrencyContext = createContext<CurrencySettings | undefined>(undefined);

const CURRENCY_STORAGE_KEY = 'pharmatrack_currency';
const EXCHANGE_RATE_STORAGE_KEY = 'pharmatrack_exchange_rate';

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

  const [exchangeRate, setExchangeRateState] = useState<number>(() => {
    const saved = localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    return saved ? parseFloat(saved) : 1600;
  });

  useEffect(() => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, exchangeRate.toString());
  }, [exchangeRate]);

  const setCurrency = (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
  };

  const setExchangeRate = (rate: number) => {
    setExchangeRateState(rate);
  };

  const convertPrice = (amount: number, fromCurrency: CurrencyCode = 'USD'): number => {
    if (fromCurrency === currency) return amount;
    
    if (fromCurrency === 'USD' && currency === 'NGN') {
      return amount * exchangeRate;
    }
    if (fromCurrency === 'NGN' && currency === 'USD') {
      return amount / exchangeRate;
    }
    return amount;
  };

  const formatPrice = (amount: number, originalCurrency: CurrencyCode = 'USD'): string => {
    const convertedAmount = convertPrice(amount, originalCurrency);
    
    if (currency === 'NGN') {
      return `₦${convertedAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      exchangeRate, 
      setCurrency, 
      setExchangeRate, 
      formatPrice,
      convertPrice 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};
