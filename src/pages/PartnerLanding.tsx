import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Users, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Explore from './Explore';

interface PartnerData {
  partner_code: string;
  partner_name: string;
  partner_type: string;
  organization_name: string | null;
}

const PartnerLanding = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const fetchPartnerAndSetReferral = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('referral_partners')
          .select('partner_code, partner_name, partner_type, organization_name')
          .eq('partner_code', partnerId)
          .eq('is_active', true)
          .single();

        if (data && !error) {
          setPartner(data);
          // Store referral in localStorage
          localStorage.setItem('pharmatrack_referral_code', partnerId);
          localStorage.setItem('pharmatrack_partner_info', JSON.stringify({
            code: data.partner_code,
            name: data.partner_name,
            type: data.partner_type,
            organizationName: data.organization_name,
          }));
          
          // Update referral count via RPC or separate query
          const { data: currentPartner } = await supabase
            .from('referral_partners')
            .select('total_referrals')
            .eq('partner_code', partnerId)
            .single();
            
          if (currentPartner) {
            await supabase
              .from('referral_partners')
              .update({ total_referrals: (currentPartner.total_referrals || 0) + 1 })
              .eq('partner_code', partnerId);
          }
        }
      } catch (error) {
        console.error('Error fetching partner:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartnerAndSetReferral();
  }, [partnerId]);

  const getBannerContent = () => {
    if (!partner) return null;

    const isProfessional = partner.partner_type === 'professional';
    const displayName = partner.organization_name || partner.partner_name;

    if (isProfessional) {
      return {
        icon: Award,
        title: `Welcome, ${displayName} Member!`,
        subtitle: 'Exclusive partner benefits apply when you sign up',
        badge: 'Professional Partner',
        badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500',
      };
    }

    return {
      icon: Users,
      title: `Welcome! Referred by ${partner.partner_name}`,
      subtitle: 'Special launch benefits apply to your signup',
      badge: 'Partner Referral',
      badgeColor: 'bg-gradient-to-r from-primary to-marketplace',
    };
  };

  const bannerContent = getBannerContent();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Partner Banner */}
      {partner && showBanner && bannerContent && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-[60] bg-gradient-to-r from-primary via-marketplace to-primary text-white shadow-lg"
        >
          <div className="container mx-auto max-w-4xl px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <bannerContent.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm md:text-base truncate">
                      {bannerContent.title}
                    </h3>
                    <Badge className={`${bannerContent.badgeColor} text-white text-[10px] shrink-0`}>
                      {bannerContent.badge}
                    </Badge>
                  </div>
                  <p className="text-xs md:text-sm opacity-90 truncate">
                    {bannerContent.subtitle}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => navigate('/auth?mode=signup')}
                  className="bg-white text-primary hover:bg-white/90 font-semibold h-8 px-3 text-xs gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span className="hidden sm:inline">Join Now</span>
                  <span className="sm:hidden">Join</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Benefits Pills */}
            <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
              {['Free 7-day trial', 'Priority support', 'Partner benefits'].map((benefit, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className="bg-white/10 border-white/30 text-white text-[10px] whitespace-nowrap shrink-0 gap-1"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {benefit}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Render the Explore page */}
      <Explore />
    </div>
  );
};

export default PartnerLanding;
