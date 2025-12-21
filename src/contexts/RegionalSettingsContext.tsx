import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type CountryCode = 'NG' | 'US' | 'GB';
export type POSMode = 'simple' | 'enterprise';

interface RegulatoryInfo {
  name: string;
  abbreviation: string;
  licenseLabel: string;
  icon: string;
}

interface RegionalSettings {
  country: CountryCode;
  posMode: POSMode;
  setCountry: (country: CountryCode) => void;
  setPOSMode: (mode: POSMode) => void;
  regulatory: RegulatoryInfo;
  countryName: string;
  flagEmoji: string;
  isSimpleMode: boolean;
  isEnterpriseMode: boolean;
}

const REGULATORY_INFO: Record<CountryCode, RegulatoryInfo> = {
  NG: {
    name: 'National Agency for Food and Drug Administration and Control',
    abbreviation: 'NAFDAC',
    licenseLabel: 'NAFDAC Reg. No.',
    icon: '🇳🇬',
  },
  US: {
    name: 'Food and Drug Administration',
    abbreviation: 'FDA',
    licenseLabel: 'NDC Number',
    icon: '🇺🇸',
  },
  GB: {
    name: 'Medicines and Healthcare products Regulatory Agency',
    abbreviation: 'MHRA',
    licenseLabel: 'PL Number',
    icon: '🇬🇧',
  },
};

const COUNTRY_NAMES: Record<CountryCode, string> = {
  NG: 'Nigeria',
  US: 'United States',
  GB: 'United Kingdom',
};

const FLAG_EMOJIS: Record<CountryCode, string> = {
  NG: '🇳🇬',
  US: '🇺🇸',
  GB: '🇬🇧',
};

const RegionalSettingsContext = createContext<RegionalSettings | undefined>(undefined);

const COUNTRY_STORAGE_KEY = 'pharmatrack_country';
const POS_MODE_STORAGE_KEY = 'pharmatrack_pos_mode';

export const useRegionalSettings = () => {
  const context = useContext(RegionalSettingsContext);
  if (context === undefined) {
    throw new Error('useRegionalSettings must be used within a RegionalSettingsProvider');
  }
  return context;
};

interface RegionalSettingsProviderProps {
  children: ReactNode;
}

export const RegionalSettingsProvider = ({ children }: RegionalSettingsProviderProps) => {
  const [country, setCountryState] = useState<CountryCode>(() => {
    const saved = localStorage.getItem(COUNTRY_STORAGE_KEY);
    return (saved as CountryCode) || 'NG';
  });

  const [posMode, setPOSModeState] = useState<POSMode>(() => {
    const saved = localStorage.getItem(POS_MODE_STORAGE_KEY);
    return (saved as POSMode) || 'enterprise';
  });

  useEffect(() => {
    localStorage.setItem(COUNTRY_STORAGE_KEY, country);
  }, [country]);

  useEffect(() => {
    localStorage.setItem(POS_MODE_STORAGE_KEY, posMode);
  }, [posMode]);

  const setCountry = (newCountry: CountryCode) => {
    setCountryState(newCountry);
  };

  const setPOSMode = (mode: POSMode) => {
    setPOSModeState(mode);
  };

  const regulatory = REGULATORY_INFO[country];
  const countryName = COUNTRY_NAMES[country];
  const flagEmoji = FLAG_EMOJIS[country];
  const isSimpleMode = posMode === 'simple';
  const isEnterpriseMode = posMode === 'enterprise';

  return (
    <RegionalSettingsContext.Provider value={{
      country,
      posMode,
      setCountry,
      setPOSMode,
      regulatory,
      countryName,
      flagEmoji,
      isSimpleMode,
      isEnterpriseMode,
    }}>
      {children}
    </RegionalSettingsContext.Provider>
  );
};
