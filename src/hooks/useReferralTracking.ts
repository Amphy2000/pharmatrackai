import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const REFERRAL_STORAGE_KEY = 'pharmatrack_referral_code';
const PARTNER_STORAGE_KEY = 'pharmatrack_partner_info';

interface PartnerInfo {
  code: string;
  name: string;
  type: 'professional' | 'ambassador' | 'pharmacy';
  organizationName?: string;
}

export const useReferralTracking = () => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check URL for ref/partner parameter and store it
  useEffect(() => {
    const checkUrlForReferral = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref') || urlParams.get('partner');
      
      if (refParam) {
        // Store in localStorage
        localStorage.setItem(REFERRAL_STORAGE_KEY, refParam);
        setReferralCode(refParam);
        
        // Fetch partner info from database
        await fetchPartnerInfo(refParam);
      } else {
        // Check if we have a stored referral code
        const storedCode = localStorage.getItem(REFERRAL_STORAGE_KEY);
        if (storedCode) {
          setReferralCode(storedCode);
          
          // Try to get stored partner info
          const storedPartnerInfo = localStorage.getItem(PARTNER_STORAGE_KEY);
          if (storedPartnerInfo) {
            try {
              setPartnerInfo(JSON.parse(storedPartnerInfo));
            } catch {
              // Re-fetch if parsing fails
              await fetchPartnerInfo(storedCode);
            }
          } else {
            await fetchPartnerInfo(storedCode);
          }
        }
      }
      
      setIsLoading(false);
    };

    checkUrlForReferral();
  }, []);

  const fetchPartnerInfo = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('referral_partners')
        .select('partner_code, partner_name, partner_type, organization_name')
        .eq('partner_code', code)
        .eq('is_active', true)
        .single();

      if (data && !error) {
        const info: PartnerInfo = {
          code: data.partner_code,
          name: data.partner_name,
          type: data.partner_type as PartnerInfo['type'],
          organizationName: data.organization_name || undefined,
        };
        setPartnerInfo(info);
        localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(info));
      }
    } catch (error) {
      console.error('Error fetching partner info:', error);
    }
  };

  const clearReferral = () => {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    localStorage.removeItem(PARTNER_STORAGE_KEY);
    setReferralCode(null);
    setPartnerInfo(null);
  };

  const setManualReferralCode = async (code: string) => {
    if (!code.trim()) return;
    
    localStorage.setItem(REFERRAL_STORAGE_KEY, code.trim());
    setReferralCode(code.trim());
    await fetchPartnerInfo(code.trim());
  };

  return {
    referralCode,
    partnerInfo,
    isLoading,
    clearReferral,
    setManualReferralCode,
    hasValidPartner: !!partnerInfo,
  };
};
