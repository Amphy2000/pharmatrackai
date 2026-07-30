import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRegionalSettings, CountryCode } from '@/contexts/RegionalSettingsContext';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SmartCSVImportModal } from '@/components/inventory/SmartCSVImportModal';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';
import { getExternalFunctionsUrl } from '@/lib/externalFunctionsUrl';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, ArrowRight, ArrowLeft, Check, CheckCircle2,
  FileSpreadsheet, Sparkles, LogOut, Building2,
  ShoppingCart, TrendingUp, Shield, Package, Pill,
  Phone, Mail, MapPin, ChevronRight
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'welcome' | 'country' | 'name' | 'contact' | 'license' | 'import' | 'done';
const STEP_ORDER: Step[] = ['welcome', 'country', 'name', 'contact', 'license', 'import', 'done'];

// ─── Feature pills shown on the left panel ────────────────────────────────────
const FEATURES = [
  { icon: ShoppingCart, label: 'Smart POS', desc: 'Retail & wholesale in one click' },
  { icon: Package, label: 'Inventory', desc: 'Real-time stock with expiry alerts' },
  { icon: Shield, label: 'Drug Safety', desc: 'Auto interaction warnings' },
  { icon: TrendingUp, label: 'AI Insights', desc: 'Revenue & business intelligence' },
];

// ─── Country data ─────────────────────────────────────────────────────────────
const COUNTRIES: { code: CountryCode; flag: string; name: string; currency: string; license: string }[] = [
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', currency: '₦ NGN', license: 'PCN License' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', currency: '£ GBP', license: 'GPhC Registration' },
  { code: 'US', flag: '🇺🇸', name: 'United States', currency: '$ USD', license: 'State License' },
];

// ─── Animated dot progress ────────────────────────────────────────────────────
const ProgressDots = ({ currentStep }: { currentStep: Step }) => {
  const steps = STEP_ORDER.slice(1); // exclude 'welcome'
  const idx = steps.indexOf(currentStep);
  return (
    <div className="flex items-center gap-2 justify-center">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`rounded-full transition-all duration-500 ${
            i < idx
              ? 'w-2 h-2 bg-white/80'
              : i === idx
              ? 'w-6 h-2 bg-white'
              : 'w-2 h-2 bg-white/30'
          }`}
        />
      ))}
    </div>
  );
};

// ─── Slide wrapper ────────────────────────────────────────────────────────────
const SlideIn = ({ children, dir = 'right' }: { children: React.ReactNode; dir?: 'right' | 'left' }) => (
  <div
    className={`animate-slide-in-${dir}`}
    style={{
      animation: `slideIn${dir === 'right' ? 'Right' : 'Left'} 0.35s cubic-bezier(0.4,0,0.2,1) both`,
    }}
  >
    {children}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const OnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const { user, isLoading: authLoading } = useAuth();
  const { country, setCountry } = useRegionalSettings();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [pharmacyName, setPharmacyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [geocodeData, setGeocodeData] = useState<any>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Check if user already has a pharmacy
  useEffect(() => {
    const check = async () => {
      if (!user) { setCheckingExisting(false); return; }
      try {
        const { data } = await supabase
          .from('pharmacy_staff')
          .select('pharmacy_id')
          .eq('user_id', user.id)
          .limit(1);
        if (data && data.length > 0) { navigate('/dashboard', { replace: true }); return; }
      } catch {}
      setCheckingExisting(false);
    };
    if (!authLoading) check();
  }, [user, authLoading, navigate]);

  // Pre-fill email from auth
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user]);

  // Auto-focus inputs when step changes
  useEffect(() => {
    if (currentStep === 'name') setTimeout(() => nameRef.current?.focus(), 400);
    if (currentStep === 'contact') setTimeout(() => emailRef.current?.focus(), 400);
  }, [currentStep]);

  const goTo = (step: Step, dir: 'right' | 'left' = 'right') => {
    setSlideDir(dir);
    setAnimKey(k => k + 1);
    setCurrentStep(step);
  };

  const goNext = () => {
    const i = STEP_ORDER.indexOf(currentStep);
    if (i < STEP_ORDER.length - 1) goTo(STEP_ORDER[i + 1], 'right');
  };

  const goBack = () => {
    const i = STEP_ORDER.indexOf(currentStep);
    if (i > 0) goTo(STEP_ORDER[i - 1], 'left');
  };

  const handleCreatePharmacy = async () => {
    if (!user || !pharmacyName || !email) return;
    setIsLoading(true);
    try {
      const { data: pharmacy, error: pharmacyError } = await supabase
        .from('pharmacies')
        .insert({
          name: pharmacyName,
          email,
          phone: phone || null,
          address: address || null,
          license_number: licenseNumber || null,
          owner_id: user.id,
        })
        .select()
        .single();

      if (pharmacyError) throw pharmacyError;
      setPharmacyId(pharmacy.id);

      const { error: staffError } = await supabase
        .from('pharmacy_staff')
        .insert({ pharmacy_id: pharmacy.id, user_id: user.id, role: 'owner', is_active: true });
      if (staffError) throw staffError;

      if (phone) {
        try {
          await fetch(`${getExternalFunctionsUrl()}/send-welcome-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pharmacyId: pharmacy.id, ownerName: user.user_metadata?.full_name || pharmacyName, phone }),
          });
        } catch {}
      }

      goTo('import', 'right');
    } catch (err: any) {
      toast({ title: 'Setup Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCountry = COUNTRIES.find(c => c.code === country) || COUNTRIES[0];
  const ownerFirstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  if (authLoading || checkingExisting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <Pill className="h-8 w-8 text-white animate-pulse" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-white/60 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) { navigate('/auth', { replace: true }); return null; }

  return (
    <>
      {/* Global animation styles */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(48px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-48px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        .anim-fade-up { animation: fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) both; }
        .anim-scale-in { animation: scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        .onboarding-input {
          background: rgba(255,255,255,0.08);
          border: 1.5px solid rgba(255,255,255,0.15);
          color: white;
          border-radius: 14px;
          padding: 16px 20px;
          font-size: 18px;
          font-weight: 500;
          width: 100%;
          transition: all 0.2s;
          outline: none;
          caret-color: #60a5fa;
        }
        .onboarding-input::placeholder { color: rgba(255,255,255,0.35); font-weight: 400; font-size: 16px; }
        .onboarding-input:focus { border-color: rgba(96,165,250,0.7); background: rgba(255,255,255,0.12); box-shadow: 0 0 0 3px rgba(96,165,250,0.15); }
        .onboarding-input::-webkit-input-placeholder { color: rgba(255,255,255,0.35); }
        .country-card { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .country-card:hover { transform: translateY(-4px) scale(1.02); }
        .country-card.selected { transform: scale(1.05); }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f2744] flex">

        {/* ── Left Panel (desktop) ─────────────────────────────── */}
        <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-10 relative overflow-hidden">
          {/* Background orbs */}
          <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          {/* Logo */}
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight">PharmaTrack</span>
            </div>
          </div>

          {/* Features */}
          <div className="relative space-y-4">
            <p className="text-white/50 text-sm font-medium uppercase tracking-widest mb-6">Everything you need</p>
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className="flex items-start gap-4 anim-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.label}</p>
                  <p className="text-white/50 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom quote */}
          <div className="relative">
            <p className="text-white/30 text-xs italic">
              "Trusted by pharmacies across Nigeria, UK, and USA"
            </p>
          </div>
        </div>

        {/* ── Right Panel ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4">
            {currentStep !== 'welcome' && currentStep !== 'done' ? (
              <ProgressDots currentStep={currentStep} />
            ) : <div />}
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}
              className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>

          {/* Step Content */}
          <div className="flex-1 flex items-center justify-center px-6 pb-10">
            <div className="w-full max-w-md">
              <div
                key={animKey}
                style={{
                  animation: `${slideDir === 'right' ? 'slideInRight' : 'slideInLeft'} 0.35s cubic-bezier(0.4,0,0.2,1) both`,
                }}
              >

                {/* ════ WELCOME ════ */}
                {currentStep === 'welcome' && (
                  <div className="text-center space-y-8">
                    <div className="anim-scale-in">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur mb-6">
                        <Pill className="h-10 w-10 text-blue-300" />
                      </div>
                      <h1 className="text-4xl font-bold text-white leading-tight mb-3">
                        Welcome, {ownerFirstName}! 👋
                      </h1>
                      <p className="text-white/60 text-lg leading-relaxed">
                        Let's get your pharmacy set up in about <span className="text-white font-semibold">2 minutes</span>. We'll walk you through everything.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {['Select your country & currency', 'Set up your pharmacy profile', 'Import your existing stock (optional)'].map((item, i) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-left anim-fade-up"
                          style={{ animationDelay: `${(i + 1) * 100}ms` }}
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-500/30 text-blue-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-white/80 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => goTo('country', 'right')}
                      className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                      Let's Get Started
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {/* ════ COUNTRY ════ */}
                {currentStep === 'country' && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-2">Step 1 of 4</p>
                      <h2 className="text-3xl font-bold text-white leading-tight">Where is your pharmacy located?</h2>
                      <p className="text-white/50 mt-2">This sets your currency and compliance rules.</p>
                    </div>
                    <div className="space-y-3">
                      {COUNTRIES.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => { setCountry(c.code); setTimeout(() => goTo('name', 'right'), 250); }}
                          className={`country-card w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left ${
                            country === c.code
                              ? 'selected border-blue-400 bg-blue-500/20'
                              : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-3xl">{c.flag}</span>
                          <div className="flex-1">
                            <p className="text-white font-semibold">{c.name}</p>
                            <p className="text-white/50 text-sm">{c.currency} · {c.license}</p>
                          </div>
                          {country === c.code && <Check className="h-5 w-5 text-blue-400 flex-shrink-0" />}
                          <ChevronRight className="h-4 w-4 text-white/30 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ════ NAME ════ */}
                {currentStep === 'name' && (
                  <div className="space-y-8">
                    <div>
                      <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-2">Step 2 of 4</p>
                      <h2 className="text-3xl font-bold text-white leading-tight">
                        What's your pharmacy called?
                      </h2>
                      <p className="text-white/50 mt-2">This will appear on receipts and reports.</p>
                    </div>
                    <div className="space-y-3">
                      <input
                        ref={nameRef}
                        type="text"
                        className="onboarding-input"
                        placeholder="e.g. Amphy Pharmacy"
                        value={pharmacyName}
                        onChange={e => setPharmacyName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && pharmacyName.trim()) goTo('contact', 'right'); }}
                      />
                      {pharmacyName && (
                        <p className="text-white/40 text-sm px-2 anim-fade-up">
                          ✓ Your receipts will say "<span className="text-white/70">{pharmacyName}</span>"
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => goTo('country', 'left')}
                        className="p-4 rounded-2xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <button
                        disabled={!pharmacyName.trim()}
                        onClick={() => goTo('contact', 'right')}
                        className="flex-1 py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                      >
                        Continue <ArrowRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ════ CONTACT ════ */}
                {currentStep === 'contact' && (
                  <div className="space-y-8">
                    <div>
                      <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-2">Step 3 of 4</p>
                      <h2 className="text-3xl font-bold text-white leading-tight">
                        How can we reach you?
                      </h2>
                      <p className="text-white/50 mt-2">Used for notifications and your pharmacy profile.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 pointer-events-none" />
                        <input
                          ref={emailRef}
                          type="email"
                          className="onboarding-input"
                          style={{ paddingLeft: '48px' }}
                          placeholder="business@email.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 pointer-events-none" />
                        <input
                          type="tel"
                          className="onboarding-input"
                          style={{ paddingLeft: '48px' }}
                          placeholder={country === 'NG' ? '+234 800 000 0000' : country === 'GB' ? '+44 7000 000000' : '+1 (555) 000-0000'}
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => goTo('name', 'left')}
                        className="p-4 rounded-2xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <button
                        disabled={!email.trim()}
                        onClick={() => goTo('license', 'right')}
                        className="flex-1 py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                      >
                        Continue <ArrowRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ════ LICENSE + ADDRESS ════ */}
                {currentStep === 'license' && (
                  <div className="space-y-8">
                    <div>
                      <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-2">Step 4 of 4</p>
                      <h2 className="text-3xl font-bold text-white leading-tight">
                        Almost done!
                      </h2>
                      <p className="text-white/50 mt-2">These are optional — you can add them later in Settings.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2 px-1">
                          {selectedCountry.license} (Optional)
                        </p>
                        <input
                          type="text"
                          className="onboarding-input"
                          placeholder={country === 'NG' ? 'e.g. A4-12345' : country === 'GB' ? 'e.g. PL12345/0001' : 'e.g. PH-12345'}
                          value={licenseNumber}
                          onChange={e => setLicenseNumber(e.target.value)}
                        />
                      </div>
                      <div>
                        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2 px-1">
                          Pharmacy Address (Optional)
                        </p>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-4 h-5 w-5 text-white/30 pointer-events-none z-10" />
                          <div style={{ paddingLeft: '12px' }}>
                            <AddressAutocomplete
                              value={address}
                              onChange={(newAddress, geoData) => {
                                setAddress(newAddress);
                                if (geoData) setGeocodeData(geoData);
                              }}
                              placeholder="Start typing your address..."
                              countryCode={country}
                            />
                          </div>
                        </div>
                        {geocodeData && (
                          <p className="text-green-400/80 text-xs mt-2 px-1 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Location verified: {geocodeData.city}, {geocodeData.state}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => goTo('contact', 'left')}
                        className="p-4 rounded-2xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleCreatePharmacy}
                        disabled={isLoading}
                        className="flex-1 py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                      >
                        {isLoading ? (
                          <><Loader2 className="h-5 w-5 animate-spin" /> Creating pharmacy...</>
                        ) : (
                          <>Create My Pharmacy <ArrowRight className="h-5 w-5" /></>
                        )}
                      </button>
                    </div>
                    <p className="text-center text-white/30 text-sm">
                      Or{' '}
                      <button
                        onClick={handleCreatePharmacy}
                        disabled={isLoading}
                        className="text-white/50 hover:text-white/70 underline underline-offset-2 transition-colors"
                      >
                        skip optional fields and continue
                      </button>
                    </p>
                  </div>
                )}

                {/* ════ IMPORT ════ */}
                {currentStep === 'import' && (
                  <div className="space-y-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold mb-4">
                        <Check className="h-3 w-3" /> Pharmacy created!
                      </div>
                      <h2 className="text-3xl font-bold text-white leading-tight">
                        Import your existing stock
                      </h2>
                      <p className="text-white/50 mt-2">
                        Upload a CSV or Excel file from your old system. We'll auto-detect the columns.
                      </p>
                    </div>

                    {!importComplete ? (
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="w-full border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-blue-400/50 hover:bg-blue-500/5 transition-all group"
                      >
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 group-hover:bg-blue-500/20 mb-4 transition-all">
                          <FileSpreadsheet className="h-7 w-7 text-white/60 group-hover:text-blue-300 transition-colors" />
                        </div>
                        <p className="text-white font-semibold mb-1">Click to upload CSV / Excel</p>
                        <p className="text-white/40 text-sm">Auto-detects any column format</p>
                        <div className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs">
                          <Sparkles className="h-3 w-3" /> Smart Import — AI powered
                        </div>
                      </button>
                    ) : (
                      <div className="text-center py-6 anim-scale-in">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/20 mb-4">
                          <CheckCircle2 className="h-8 w-8 text-green-400" />
                        </div>
                        <p className="text-white font-bold text-xl mb-1">{importedCount} products imported!</p>
                        <p className="text-white/50 text-sm">Your inventory is ready to go.</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="flex-1 py-4 rounded-2xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all font-medium"
                      >
                        Skip for now
                      </button>
                      <button
                        onClick={() => goTo('done', 'right')}
                        className="flex-1 py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                      >
                        {importComplete ? 'Continue' : 'Import & Continue'} <ArrowRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ════ DONE ════ */}
                {currentStep === 'done' && (
                  <div className="text-center space-y-8 anim-scale-in">
                    <div>
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/20 mb-6">
                        <CheckCircle2 className="h-10 w-10 text-green-400" />
                      </div>
                      <h2 className="text-4xl font-bold text-white leading-tight mb-3">
                        You're all set! 🎉
                      </h2>
                      <p className="text-white/60 text-lg">
                        <span className="text-white font-semibold">{pharmacyName}</span> is ready to go. Here's what you can do right now:
                      </p>
                    </div>

                    <div className="space-y-3 text-left">
                      {[
                        { icon: ShoppingCart, title: 'Start Selling', desc: 'Open POS and process your first sale', route: '/checkout' },
                        { icon: Package, title: 'Add Stock', desc: 'Add products to your inventory', route: '/inventory' },
                        { icon: TrendingUp, title: 'View Dashboard', desc: 'See your business at a glance', route: '/dashboard' },
                      ].map((item, i) => (
                        <button
                          key={item.title}
                          onClick={() => navigate(item.route)}
                          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all anim-fade-up"
                          style={{ animationDelay: `${i * 80}ms` }}
                        >
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <item.icon className="h-5 w-5 text-blue-300" />
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">{item.title}</p>
                            <p className="text-white/40 text-xs">{item.desc}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/30 ml-auto flex-shrink-0" />
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => navigate('/dashboard')}
                      className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                      Go to Dashboard <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      <SmartCSVImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onComplete={(count) => {
          setImportedCount(count);
          setImportComplete(count > 0);
          setShowImportModal(false);
        }}
      />
    </>
  );
};

export default OnboardingWizard;
