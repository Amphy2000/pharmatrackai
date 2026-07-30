import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart, PackageSearch, Users, Building2, TrendingUp,
  Shield, Sparkles, ArrowRight, HelpCircle, Truck, Settings,
  FileText, ChevronDown, ChevronUp, FileSpreadsheet, Pill,
  Phone, Star, Zap, Check, BarChart3, Bell, BookOpen,
  Camera, CreditCard, Search, AlertTriangle, RefreshCw,
  ChevronRight, Play, ExternalLink
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Feature {
  id: string;
  icon: React.ElementType;
  title: string;
  badge?: string;
  badgeColor?: string;
  tagline: string;
  description: string;
  steps: { title: string; desc: string }[];
  tips: string[];
  route?: string;
}

interface FAQ {
  q: string;
  a: string;
}

// ─── Feature Data ───────────────────────────────────────────────────────────
const FEATURES: Feature[] = [
  {
    id: 'pos',
    icon: ShoppingCart,
    title: 'Point of Sale',
    badge: 'Core',
    badgeColor: 'bg-blue-100 text-blue-700',
    tagline: 'Process sales in under 30 seconds',
    description: 'The POS is your frontline — search, scan, add to cart, and complete sales with full retail or wholesale pricing. Drug interaction warnings appear automatically.',
    steps: [
      { title: 'Open POS', desc: 'Click the 🛒 cart icon in the top navigation or hit "Open POS" on the Dashboard.' },
      { title: 'Search or Scan', desc: 'Type a product name, ingredient, or scan a barcode. Results appear instantly.' },
      { title: 'Add to Cart', desc: 'Click any product card to add it. Adjust qty with +/- buttons in the cart panel.' },
      { title: 'Choose Retail or Wholesale', desc: 'Toggle between Retail and Wholesale at the top of the cart. Prices update immediately.' },
      { title: 'Check Interactions', desc: 'If the AI detects a drug interaction, a yellow warning card appears — review before completing.' },
      { title: 'Complete Sale', desc: 'Click "Complete Sale", select payment method (Cash / Card / Transfer), and print receipt.' },
    ],
    tips: [
      'Hold a transaction to pause it and serve another customer — it\'s saved automatically.',
      'The AI will upsell complementary products (e.g., vitamins for antibiotics) — just click "+ Add".',
      'Offline Mode activates automatically when internet drops — sales still go through.',
    ],
    route: '/checkout',
  },
  {
    id: 'inventory',
    icon: PackageSearch,
    title: 'Inventory Management',
    badge: 'Core',
    badgeColor: 'bg-blue-100 text-blue-700',
    tagline: 'Real-time stock with AI expiry alerts',
    description: 'Track every product, batch, and expiry date. Get automatic alerts when stock is low or expiring. Import your entire stock from CSV in minutes.',
    steps: [
      { title: 'Navigate to Inventory', desc: 'Click the 📦 box icon in the top navigation bar.' },
      { title: 'Search Products', desc: 'Use the search bar to find any medication by name, category, or batch number.' },
      { title: 'Add a New Product', desc: 'Click "+ Add Item". Fill in name, category, batch, expiry date, cost price, and selling price.' },
      { title: 'Set Wholesale Price', desc: 'In the Add/Edit form, enter the Wholesale Price field for B2B customers.' },
      { title: 'Set Reorder Level', desc: 'Enter a minimum quantity — you\'ll get alerts when stock drops below this.' },
      { title: 'Receive Stock', desc: 'When a shipment arrives, use "Receive Stock" to add quantities to existing batches.' },
      { title: 'Bulk Import', desc: 'Click "Import" → upload your CSV/Excel. AI auto-maps your columns — no reformatting needed.' },
    ],
    tips: [
      'Expired products are flagged in red — remove them from shelves to stay compliant.',
      'Use the Invoice Scanner to auto-fill stock from supplier invoices (see section below).',
      'Set low reorder levels for fast-moving drugs so you never run out.',
    ],
    route: '/inventory',
  },
  {
    id: 'invoice-scanner',
    icon: Camera,
    title: 'AI Invoice Scanner',
    badge: 'AI',
    badgeColor: 'bg-purple-100 text-purple-700',
    tagline: 'Scan supplier invoices → stock auto-fills',
    description: 'Photograph or upload a supplier invoice and Gemini AI reads it — extracting product names, quantities, and prices directly into your inventory. Powered by Google Gemini Flash (1,500 free scans/day).',
    steps: [
      { title: 'Open Inventory → Invoice Scanner', desc: 'In the Inventory page, click the "Scan Invoice" button.' },
      { title: 'Upload Invoice Photo', desc: 'Take a photo of the paper invoice or upload a scanned PDF/image.' },
      { title: 'AI Extracts Data', desc: 'Gemini AI reads the invoice and pulls: product names, quantities, unit costs.' },
      { title: 'Review & Edit', desc: 'Verify the extracted data — you can edit any field before saving.' },
      { title: 'Save to Inventory', desc: 'Click "Save Stock" and all products are added/updated in your inventory instantly.' },
    ],
    tips: [
      '1,500 free invoice scans per day — enough for any pharmacy.',
      'Works with handwritten, printed, or typed invoices.',
      'Falls back to manual entry if the scan quality is too low.',
    ],
    route: '/inventory',
  },
  {
    id: 'sales',
    icon: TrendingUp,
    title: 'Sales History & Analytics',
    badge: 'Analytics',
    badgeColor: 'bg-green-100 text-green-700',
    tagline: 'Every transaction, tracked forever',
    description: 'View every sale with full details — who served it, what was sold, at what price. Filter by date, staff member, or product. Export to Excel for accounting.',
    steps: [
      { title: 'Go to Sales History', desc: 'Click the 📊 chart icon in the top navigation.' },
      { title: 'Filter by Date', desc: 'Use Daily / Weekly / Monthly / Yearly quick filters or set a custom date range.' },
      { title: 'Search Transactions', desc: 'Search by Receipt ID, medication name, or staff member.' },
      { title: 'View Transaction Details', desc: 'Click any row to see the full breakdown — items, prices, payment method.' },
      { title: 'Export Data', desc: 'Click "Export" to download all filtered sales as a CSV for Excel or accounting software.' },
    ],
    tips: [
      'Each sale has a unique Receipt ID (e.g. PH-KC9-5) — useful for customer refund queries.',
      'The Dashboard shows live today/week/month revenue without navigating away.',
      'Manager reports show staff performance per period.',
    ],
    route: '/sales',
  },
  {
    id: 'customers',
    icon: Users,
    title: 'Customer Management',
    badge: 'CRM',
    badgeColor: 'bg-orange-100 text-orange-700',
    tagline: 'Know your customers, build loyalty',
    description: 'Maintain customer records, purchase history, and prescriptions. Track loyalty points and send refill reminders automatically.',
    steps: [
      { title: 'Open Customers', desc: 'Click the 👥 users icon in the navigation.' },
      { title: 'Add a Customer', desc: 'Click "+ Add Customer". Enter name, phone, email, and date of birth.' },
      { title: 'View Purchase History', desc: 'Click on any customer to see every product they\'ve ever bought.' },
      { title: 'Add Prescription', desc: 'Under a customer profile, click "Add Prescription" to attach their prescription record.' },
      { title: 'Link Sales to Customers', desc: 'In POS, use "Select Patient (Optional)" to link the sale to their record.' },
    ],
    tips: [
      'Loyalty points are tracked automatically for every sale linked to a customer.',
      'Notes field is great for recording allergies or preferences.',
      'Search by phone number to quickly find returning customers at the counter.',
    ],
    route: '/customers',
  },
  {
    id: 'suppliers',
    icon: Truck,
    title: 'Supplier Management',
    badge: 'Procurement',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    tagline: 'Track every supplier and order',
    description: 'Maintain a database of your drug suppliers, their products, and pricing. Create purchase orders and track deliveries.',
    steps: [
      { title: 'Open Suppliers', desc: 'Go to the navigation and find the Suppliers section.' },
      { title: 'Add a Supplier', desc: 'Click "+ Add Supplier". Enter company name, contact, phone, and email.' },
      { title: 'Link Products', desc: 'Associate specific products with each supplier for easy reordering.' },
      { title: 'Create a Purchase Order', desc: 'When stock is low, create a PO directly from the supplier\'s profile.' },
      { title: 'Mark as Received', desc: 'Once goods arrive, mark the order as received — stock updates automatically.' },
    ],
    tips: [
      'Keep supplier contact numbers updated for quick emergency orders.',
      'The reorder level alerts link directly to the relevant supplier.',
    ],
    route: '/suppliers',
  },
  {
    id: 'branches',
    icon: Building2,
    title: 'Multi-Branch Operations',
    badge: 'Enterprise',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    tagline: 'Run multiple locations from one account',
    description: 'Add unlimited pharmacy branches and manage their stock, staff, and sales separately — while seeing consolidated reports across all locations.',
    steps: [
      { title: 'Open Branches', desc: 'Go to Settings → Branches.' },
      { title: 'Add a Branch', desc: 'Click "+ Add Branch". Enter the branch name and address.' },
      { title: 'Switch Branches', desc: 'Use the branch switcher in the top navigation bar (next to the pharmacy name) to switch context.' },
      { title: 'Assign Staff', desc: 'Staff members can be assigned to specific branches under Staff Management.' },
      { title: 'Consolidated Reports', desc: 'The Dashboard shows all-branch totals or per-branch view using the branch filter.' },
    ],
    tips: [
      'Each branch has its own independent inventory and sales history.',
      'Staff can only see their assigned branch (unless they have Owner role).',
    ],
    route: '/branches',
  },
  {
    id: 'ai-insights',
    icon: Sparkles,
    title: 'AI Business Insights',
    badge: 'AI',
    badgeColor: 'bg-purple-100 text-purple-700',
    tagline: 'Your business advisor, 24/7',
    description: 'The AI analyses your inventory, sales, and revenue in real time and surfaces actionable recommendations — from removing expired stock to boosting fast-moving products.',
    steps: [
      { title: 'View on Dashboard', desc: 'The AI Insights panel is on the main Dashboard Home tab — it refreshes automatically.' },
      { title: 'Read Insight Cards', desc: 'Each card shows: severity (HIGH/MEDIUM/LOW), financial impact (₦ value), and action to take.' },
      { title: 'Act on Recommendations', desc: 'Click the action link (e.g. "Unshelve Abther-225 and 42 other expired items") to go straight to the issue.' },
      { title: 'Refresh Manually', desc: 'Click the ↻ Refresh button to get fresh insights at any time.' },
    ],
    tips: [
      'HIGH priority insights are revenue-critical — act on them same day.',
      'Insights are specific to your actual data, not generic advice.',
      'Works completely offline using local analytics — no API needed.',
    ],
  },
  {
    id: 'staff',
    icon: Shield,
    title: 'Staff & Roles',
    badge: 'Admin',
    badgeColor: 'bg-red-100 text-red-700',
    tagline: 'Control what each team member can do',
    description: 'Add pharmacists, cashiers, and managers. Assign roles that control what each person can access — from viewing-only to full admin.',
    steps: [
      { title: 'Go to Settings → Staff', desc: 'Open Settings and click the Staff Management tab.' },
      { title: 'Invite a Staff Member', desc: 'Click "+ Invite Staff". Enter their email — they\'ll receive a login invite.' },
      { title: 'Assign a Role', desc: 'Choose: Owner, Manager, Pharmacist, or Cashier. Each has different permissions.' },
      { title: 'Deactivate Staff', desc: 'Toggle a staff member to Inactive to revoke access immediately without deleting records.' },
    ],
    tips: [
      'Cashiers can only process sales — they cannot see cost prices or reports.',
      'Managers can see all reports but cannot change settings.',
      'Owners have full access to everything.',
    ],
    route: '/settings',
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Alerts & Notifications',
    badge: 'Alerts',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    tagline: 'Never miss an important event',
    description: 'Real-time alerts for expired stock, low inventory, held transactions, and system events. Delivered in-app and optionally via SMS.',
    steps: [
      { title: 'View Notifications', desc: 'Click the 🔔 bell icon in the top right to see all recent alerts.' },
      { title: 'Act on Alerts', desc: 'Each notification links directly to the relevant section (e.g. click "Expired Stock" → goes to inventory filter).' },
      { title: 'Configure SMS Alerts', desc: 'In Settings → Notifications, enable SMS to receive critical alerts on your phone.' },
    ],
    tips: [
      'The red badge count on the bell shows unread critical alerts.',
      'Dashboard "Needs Attention" cards are the same as your top notifications.',
    ],
    route: '/notifications',
  },
];

const FAQS: FAQ[] = [
  {
    q: 'Does PharmaTrack work offline?',
    a: 'Yes. The POS, inventory search, and drug interaction checker all work offline. Sales are queued and synced automatically when your connection returns. The orange "Offline Mode" banner appears in POS when you\'re disconnected.',
  },
  {
    q: 'How do I switch between retail and wholesale pricing?',
    a: 'In the POS (checkout page), there are two toggle buttons at the top of the cart panel: "Retail" and "Wholesale". Tap Wholesale to automatically apply the wholesale price for all items in the cart. Make sure you\'ve entered the wholesale price when adding/editing the product in inventory.',
  },
  {
    q: 'How does the invoice scanner work?',
    a: 'It uses Google Gemini AI (vision model) to read supplier invoices — photos, PDFs, or scans. You get 1,500 free scans per day. After scanning, you can review and edit any extracted values before saving.',
  },
  {
    q: 'Can I import my existing stock list?',
    a: 'Yes. Go to Inventory → Import → upload any CSV or Excel file. Our AI auto-detects your column names (Product Name, Qty, Price, Expiry, Batch, etc.) — no reformatting needed.',
  },
  {
    q: 'How are drug interactions detected?',
    a: 'We use a local pharmaceutical database (no internet required) that checks every product added to the cart against all others. Interactions are classified as Mild, Moderate, or Severe with clinical notes.',
  },
  {
    q: 'Can multiple staff members use PharmaTrack at the same time?',
    a: 'Yes. Each staff member logs in with their own account. Sales, stock changes, and reports are all tagged with who made them. You can see this in Sales History under the "Served By" column.',
  },
  {
    q: 'What happens when my subscription expires?',
    a: 'You\'ll see an upgrade prompt and lose access to premium features, but your data is always safe. Free plan features remain available. You cannot start a trial again after it expires — contact support for a special offer.',
  },
  {
    q: 'How do I add a second pharmacy branch?',
    a: 'Go to Settings → Branches → "+ Add Branch". Each branch gets its own inventory and staff. Switch between branches using the branch switcher at the top of the screen.',
  },
];

// ─── Components ─────────────────────────────────────────────────────────────

const FeatureCard = ({ feature, isExpanded, onToggle }: { feature: Feature; isExpanded: boolean; onToggle: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
      isExpanded ? 'border-primary/30 shadow-lg' : 'border-border hover:border-primary/20'
    }`}>
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isExpanded ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
        }`}>
          <feature.icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-foreground">{feature.title}</h3>
            {feature.badge && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${feature.badgeColor}`}>
                {feature.badge}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{feature.tagline}</p>
        </div>
        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-6 space-y-6 border-t border-border/50">
          <p className="text-muted-foreground leading-relaxed pt-4">{feature.description}</p>

          {/* Step-by-Step */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> How to use it
            </h4>
            <div className="space-y-3">
              {feature.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 p-4">
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4" /> Pro Tips
            </h4>
            <ul className="space-y-1.5">
              {feature.tips.map((tip, i) => (
                <li key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          {feature.route && (
            <Button
              size="sm"
              onClick={() => navigate(feature.route!)}
              className="gap-2"
            >
              Open {feature.title}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

const FAQItem = ({ faq, isOpen, onToggle }: { faq: FAQ; isOpen: boolean; onToggle: () => void }) => (
  <div className="border-b border-border last:border-0">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-primary transition-colors"
    >
      <span className="font-medium text-foreground">{faq.q}</span>
      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
    </button>
    {isOpen && (
      <p className="pb-4 text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
    )}
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────
const UserGuide = () => {
  const navigate = useNavigate();
  const [expandedFeature, setExpandedFeature] = useState<string | null>('pos');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'core' | 'ai' | 'admin'>('all');

  const CATEGORIES = [
    { id: 'all', label: 'All Features' },
    { id: 'core', label: '🏪 Core' },
    { id: 'ai', label: '✨ AI' },
    { id: 'admin', label: '⚙️ Admin' },
  ] as const;

  const CATEGORY_MAP: Record<string, typeof CATEGORIES[number]['id']> = {
    'pos': 'core',
    'inventory': 'core',
    'invoice-scanner': 'ai',
    'sales': 'core',
    'customers': 'core',
    'suppliers': 'core',
    'branches': 'admin',
    'ai-insights': 'ai',
    'staff': 'admin',
    'notifications': 'admin',
  };

  const filteredFeatures = activeCategory === 'all'
    ? FEATURES
    : FEATURES.filter(f => CATEGORY_MAP[f.id] === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 pb-20">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="py-10">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-blue-700 p-8 md:p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-24 -translate-y-24 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -translate-x-16 translate-y-16 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-blue-200" />
                <span className="text-blue-200 text-sm font-semibold uppercase tracking-wider">User Guide</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
                Everything you need to<br />run your pharmacy
              </h1>
              <p className="text-blue-100 text-lg mb-6 max-w-xl">
                Step-by-step guides for every feature in PharmaTrack. Click any section to expand the full walkthrough.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/checkout')}
                  className="gap-2 bg-white text-primary hover:bg-blue-50"
                >
                  <ShoppingCart className="h-4 w-4" /> Open POS
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/inventory')}
                  className="gap-2 border-white/30 text-white hover:bg-white/10"
                >
                  <PackageSearch className="h-4 w-4" /> View Inventory
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="gap-2 border-white/30 text-white hover:bg-white/10"
                >
                  <TrendingUp className="h-4 w-4" /> Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Start ──────────────────────────────────────── */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-1">Quick Start</h2>
          <p className="text-muted-foreground text-sm mb-4">New to PharmaTrack? Do these 3 things first.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { step: '1', title: 'Add your stock', desc: 'Go to Inventory → Add Item (or import CSV)', icon: PackageSearch, route: '/inventory', color: 'text-blue-600 bg-blue-100' },
              { step: '2', title: 'Make your first sale', desc: 'Open POS, find a product, complete sale', icon: ShoppingCart, route: '/checkout', color: 'text-green-600 bg-green-100' },
              { step: '3', title: 'Check your dashboard', desc: 'See revenue, alerts & AI insights', icon: TrendingUp, route: '/dashboard', color: 'text-purple-600 bg-purple-100' },
            ].map((item) => (
              <button
                key={item.step}
                onClick={() => navigate(item.route)}
                className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0 self-center group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* ── App Screenshot Gallery ──────────────────────────── */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-1">See it in action</h2>
          <p className="text-muted-foreground text-sm mb-4">Screenshots of the main screens</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Dashboard', desc: 'Revenue, alerts & AI insights', imgId: 'dashboard' },
              { label: 'Point of Sale', desc: 'Retail & wholesale checkout', imgId: 'pos' },
              { label: 'Inventory', desc: 'Stock list with expiry alerts', imgId: 'inventory' },
              { label: 'Sales History', desc: 'Full transaction log', imgId: 'sales' },
            ].map((screen) => (
              <div key={screen.label} className="rounded-xl overflow-hidden border border-border group cursor-pointer hover:shadow-md transition-all">
                <div className="relative bg-muted aspect-video flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-950/30 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-2">
                        <Pill className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{screen.label}</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <ExternalLink className="h-5 w-5" />
                      <span>Open {screen.label}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-card">
                  <p className="font-semibold text-sm text-foreground">{screen.label}</p>
                  <p className="text-xs text-muted-foreground">{screen.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Feature Guides ───────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Feature Guides</h2>
              <p className="text-muted-foreground text-sm">Click any feature to see step-by-step instructions</p>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 flex-wrap mb-5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredFeatures.map(feature => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                isExpanded={expandedFeature === feature.id}
                onToggle={() => setExpandedFeature(expandedFeature === feature.id ? null : feature.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Role Quick Reference ─────────────────────────────── */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-1">Staff Role Permissions</h2>
          <p className="text-muted-foreground text-sm mb-4">What each role can access</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-foreground">Permission</th>
                    <th className="text-center p-3 font-semibold text-foreground">Cashier</th>
                    <th className="text-center p-3 font-semibold text-foreground">Pharmacist</th>
                    <th className="text-center p-3 font-semibold text-foreground">Manager</th>
                    <th className="text-center p-3 font-semibold text-foreground">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Process Sales (POS)', true, true, true, true],
                    ['View Inventory', false, true, true, true],
                    ['Add / Edit Products', false, true, true, true],
                    ['View Sales Reports', false, false, true, true],
                    ['View Cost Prices', false, false, true, true],
                    ['Manage Staff', false, false, false, true],
                    ['Manage Subscription', false, false, false, true],
                    ['Add Branches', false, false, false, true],
                    ['Export Data', false, false, true, true],
                  ].map(([label, ...values], i) => (
                    <tr key={i} className={`border-t border-border ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="p-3 text-muted-foreground">{label}</td>
                      {values.map((v, j) => (
                        <td key={j} className="p-3 text-center">
                          {v ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────── */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-1">Frequently Asked Questions</h2>
          <p className="text-muted-foreground text-sm mb-4">Answers to the most common questions</p>
          <div className="rounded-xl border border-border bg-card px-5 divide-y divide-border">
            {FAQS.map((faq, i) => (
              <FAQItem
                key={i}
                faq={faq}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>

        {/* ── Help CTA ─────────────────────────────────────────── */}
        <div className="rounded-2xl bg-muted/50 border border-border p-6 text-center">
          <HelpCircle className="h-10 w-10 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-foreground text-lg mb-1">Still need help?</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Our support team is available Monday–Friday, 8am–6pm WAT.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" className="gap-2" onClick={() => window.open('mailto:support@pharmatrack.com.ng')}>
              <Phone className="h-4 w-4" /> Contact Support
            </Button>
            <Button className="gap-2" onClick={() => navigate('/dashboard')}>
              <ArrowRight className="h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserGuide;
