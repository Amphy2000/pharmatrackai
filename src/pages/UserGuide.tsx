import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Book,
  ShoppingCart,
  PackageSearch,
  Users,
  Building2,
  TrendingUp,
  Shield,
  Sparkles,
  ArrowRight,
  Play,
  HelpCircle,
  Truck,
  Settings,
  FileText,
  ChevronDown,
  ChevronUp,
  Globe
} from 'lucide-react';
import { useState } from 'react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  steps: string[];
  tips?: string[];
}

const guideSections: GuideSection[] = [
  {
    id: 'pos',
    title: 'Point of Sale (POS)',
    icon: ShoppingCart,
    description: 'Process customer transactions quickly and efficiently',
    steps: [
      'Navigate to POS from the main menu or dashboard quick actions',
      'Search for products by name or scan barcodes',
      'Click on products to add them to the cart',
      'Adjust quantities using the +/- buttons in the cart',
      'Apply discounts if applicable',
      'Select payment method (Cash, Card, or Transfer)',
      'Complete the sale and print receipt if needed',
    ],
    tips: [
      'Use the barcode scanner for faster checkout',
      'You can hold transactions and resume them later',
      'Drug interaction warnings will appear automatically',
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory Management',
    icon: PackageSearch,
    description: 'Track stock levels, add medications, and manage expiry dates',
    steps: [
      'Go to Inventory from the main navigation',
      'Use the search bar to find specific medications',
      'Click "Add Item" to add new medications to your inventory',
      'Fill in all required fields including batch number and expiry date',
      'Set reorder levels to get automatic low stock alerts',
      'Use "Receive Stock" to update quantities when shipments arrive',
      'Conduct stock counts regularly using the Stock Count feature',
    ],
    tips: [
      'Keep expiry dates updated to avoid selling expired medications',
      'Use the AI search for smart product recommendations',
      'Import inventory in bulk using CSV import',
    ],
  },
  {
    id: 'customers',
    title: 'Customer Management',
    icon: Users,
    description: 'Manage customer records and prescriptions',
    steps: [
      'Navigate to Customers from the main menu',
      'Click "Add Customer" to register a new customer',
      'Fill in customer details including name, phone, and email',
      'View customer history by clicking on a customer record',
      'Add prescriptions using the "Add Prescription" button',
      'Set up refill reminders for recurring medications',
    ],
    tips: [
      'Loyalty points are tracked automatically',
      'Link prescriptions to customer records for better tracking',
      'Use notes to record important customer information',
    ],
  },
  {
    id: 'branches',
    title: 'Multi-Branch Operations',
    icon: Building2,
    description: 'Manage inventory across multiple pharmacy locations',
    steps: [
      'Go to Branches from the main navigation',
      'View all your branch locations and their status',
      'Click on a branch to view its specific inventory',
      'Use "Transfer Stock" to move inventory between branches',
      'Monitor low stock alerts for each branch',
      'Track transfer history and pending requests',
    ],
    tips: [
      'Set different reorder levels per branch based on demand',
      'Approve transfers promptly to ensure stock availability',
      'Main branch inventory can be distributed to other locations',
    ],
  },
  {
    id: 'suppliers',
    title: 'Supplier Management',
    icon: Truck,
    description: 'Manage suppliers and automate reordering',
    steps: [
      'Navigate to Suppliers from the main menu',
      'Click "Add Supplier" to register new suppliers',
      'Add supplier products with pricing and lead times',
      'Use "Quick Reorder" for individual products',
      'Use "Bulk Reorder" for multiple products at once',
      'Generate purchase orders automatically',
      'Track order status and delivery dates',
    ],
    tips: [
      'Link medications to supplier products for faster reordering',
      'Set up preferred suppliers for automatic suggestions',
      'Review low stock alerts regularly to prevent stockouts',
    ],
  },
  {
    id: 'analytics',
    title: 'Sales & Analytics',
    icon: TrendingUp,
    description: 'Track performance and generate reports',
    steps: [
      'View the Dashboard for an overview of key metrics',
      'Go to Sales History for detailed transaction records',
      'Use date filters to analyze specific time periods',
      'Review profit margins and revenue trends',
      'Monitor staff performance and shift reports',
      'Export reports for accounting purposes',
    ],
    tips: [
      'Check the dashboard daily for important alerts',
      'Use AI insights for demand forecasting',
      'Review expiry discount recommendations regularly',
    ],
  },
  {
    id: 'staff',
    title: 'Staff Management',
    icon: Shield,
    description: 'Add team members and manage permissions',
    steps: [
      'Go to Settings from the main menu (Owners/Managers only)',
      'Navigate to the Staff tab',
      'Click "Add Staff" to invite new team members',
      'Enter their email, set a password, and choose their role',
      'Configure individual permissions as needed',
      'Staff members can clock in/out from the dashboard',
      'Monitor shift performance and sales per staff',
    ],
    tips: [
      'Owners have full access to all features',
      'Managers can access most features except ownership settings',
      'Staff roles can be customized with specific permissions',
    ],
  },
  {
    id: 'ai',
    title: 'AI & Compliance Features',
    icon: Sparkles,
    description: 'Leverage AI for smarter pharmacy operations and regulatory compliance',
    steps: [
      'Use AI Search in inventory for smart product lookup',
      'Review AI insights on the dashboard for recommendations',
      'Check demand forecasting for stock planning',
      'Get automatic expiry discount suggestions',
      'Drug interaction checks happen automatically at checkout',
      'Generate NAFDAC compliance reports from the dashboard',
      'Track controlled/narcotic drugs with the is_controlled flag',
      'Record manufacturing dates for complete product lifecycle tracking',
    ],
    tips: [
      'AI learns from your sales patterns over time',
      'Download PDF compliance reports for NAFDAC inspections',
      'Mark controlled substances when adding medications for easy filtering',
      'Add NAFDAC registration numbers for official audit documents',
    ],
  },
  {
    id: 'marketplace',
    title: 'Public Marketplace',
    icon: Globe,
    description: 'Get discovered by patients searching for medication nearby',
    steps: [
      'Go to Settings → Marketplace to enable public listing',
      'Mark products as "Public" in Inventory to list them',
      'Feature up to 3 products in the Spotlight section for prominence',
      'Patients can search by drug name or category',
      'Distance filters (1km, 5km, 10km, All) help nearby customers find you',
      'Sorting options include distance, price, and availability',
      'Your pharmacy address links directly to Google Maps',
      'Patients order via WhatsApp directly from the marketplace',
    ],
    tips: [
      'Keep your pharmacy address accurate for distance calculations',
      'Featured products appear in the Spotlight carousel',
      'Products within 5km show a "Fast Pickup" badge',
      'Download and share the "Find It Near You" flyer at hospitals',
    ],
  },
  {
    id: 'compliance',
    title: 'Regulatory Compliance (Why Generic POS Fails)',
    icon: Shield,
    description: 'Pharmacy-specific legal compliance features that generic retail apps cannot provide',
    steps: [
      'NAFDAC Compliance: Generate audit-ready PDF reports from Dashboard → NAFDAC Compliance panel',
      'Controlled Drugs Register: Mark medications as controlled when adding, filter in compliance reports',
      'Drug Interaction Warnings: Automatic alerts appear at checkout when conflicting drugs are in cart',
      'Manufacturing Date Tracking: Record production dates for complete product lifecycle visibility',
      'Batch Traceability: Track batch numbers for recall compliance',
      'NAFDAC Reg Numbers: Store and display on compliance documents',
      'Prescription Management: Link Rx to customer records for refill reminders',
      'Expiry Audit Trail: Full history of expiry actions and discounting decisions',
    ],
    tips: [
      'Traditional retail POS systems cannot track controlled substances legally',
      'NAFDAC inspections require proper documentation that PharmaTrack generates automatically',
      'Drug interaction warnings can prevent patient harm and liability',
      'Manufacturing dates help verify product authenticity and shelf life',
    ],
  },
];

const faqs = [
  {
    question: 'How do I reset a staff member\'s password?',
    answer: 'Currently, staff members can reset their own password from their profile settings. As an owner, you can deactivate their account and create a new one if needed.',
  },
  {
    question: 'Can I import my existing inventory from Excel?',
    answer: 'Yes! Go to Inventory → Click the CSV Import button → Download the template → Fill in your data → Upload the completed file.',
  },
  {
    question: 'How do I transfer stock between branches?',
    answer: 'Navigate to Branches → Select a branch → Click "Transfer Stock" → Choose the destination branch → Select medications and quantities → Submit the transfer request.',
  },
  {
    question: 'What happens when a medication expires?',
    answer: 'PharmaTrack automatically alerts you about expiring medications. You\'ll see warnings in notifications and on the dashboard. Expired items are flagged and won\'t appear in POS searches.',
  },
  {
    question: 'How do I generate purchase orders?',
    answer: 'Go to Suppliers → Select a supplier → Use "Quick Reorder" or "Bulk Reorder" → Review the order → Generate the purchase order PDF to send to your supplier.',
  },
  {
    question: 'Can multiple staff work on POS simultaneously?',
    answer: 'Yes! Each staff member logs in with their own account and can process sales independently. All transactions are tracked per staff member.',
  },
  {
    question: 'How do I generate NAFDAC compliance reports?',
    answer: 'Go to Dashboard → Find the NAFDAC Compliance panel → Use filters to select "Full Inventory", "Expiring Soon", or "Controlled Drugs" → Click Download PDF or Print for official audit documents.',
  },
  {
    question: 'How do I track controlled/narcotic drugs?',
    answer: 'When adding or editing a medication, toggle the "Controlled Drug" switch. These items will appear in the Controlled Drugs filter in the NAFDAC Compliance panel for easy register generation.',
  },
  {
    question: 'What is the Manufacturing Date field for?',
    answer: 'The Manufacturing Date helps track complete product lifecycle for compliance. It appears in NAFDAC audit reports. If not provided, the system estimates it as 2 years before expiry.',
  },
  {
    question: 'Why can\'t I use a generic retail POS for my pharmacy?',
    answer: 'Traditional retail apps are designed for supermarkets and simple inventory, not the complex needs of healthcare professionals. They lack critical legal compliance features: controlled drugs register, NAFDAC audit reports, drug interaction warnings, prescription management, and manufacturing date tracking. Using a non-compliant system puts you at legal risk during inspections.',
  },
  {
    question: 'What makes PharmaTrack different from other inventory apps?',
    answer: 'PharmaTrack is purpose-built for Nigerian pharmacies with: (1) NAFDAC-ready compliance reports, (2) Controlled Drugs Register with legal audit trail, (3) Drug interaction warnings at checkout, (4) AI expiry prediction 60 days early, (5) Prescription management with refill reminders, (6) Manufacturing date tracking for product lifecycle visibility.',
  },
  {
    question: 'How do drug interaction warnings work?',
    answer: 'When you add medications to a sale at checkout, PharmaTrack automatically checks for known drug-drug interactions. If a dangerous combination is detected, you\'ll see a warning with severity level before completing the sale. This protects patients and reduces liability.',
  },
];

const UserGuide = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('pos');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Book className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-primary">
                User Guide
              </h1>
              <p className="text-muted-foreground">
                Everything you need to master PharmaTrack
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {guideSections.map((section) => (
              <Badge 
                key={section.id}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => {
                  setExpandedSection(section.id);
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <section.icon className="h-3 w-3 mr-1" />
                {section.title}
              </Badge>
            ))}
          </div>
        </div>

        {/* Guide Sections */}
        <div className="space-y-4 mb-12">
          {guideSections.map((section) => (
            <Card 
              key={section.id} 
              id={section.id}
              className={`transition-all ${expandedSection === section.id ? 'ring-2 ring-primary/20' : ''}`}
            >
              <CardHeader 
                className="cursor-pointer"
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                  {expandedSection === section.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              
              {expandedSection === section.id && (
                <CardContent className="pt-0">
                  <div className="space-y-6">
                    {/* Steps */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Play className="h-4 w-4 text-primary" />
                        Step-by-Step Guide
                      </h4>
                      <ol className="space-y-2">
                        {section.steps.map((step, index) => (
                          <li key={index} className="flex gap-3 text-sm">
                            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                              {index + 1}
                            </span>
                            <span className="text-muted-foreground pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Tips */}
                    {section.tips && (
                      <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                        <h4 className="font-semibold text-sm mb-2 text-success flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Pro Tips
                        </h4>
                        <ul className="space-y-1">
                          {section.tips.map((tip, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <ArrowRight className="h-3 w-3 mt-1.5 text-success flex-shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* FAQs Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground text-sm">
                Quick answers to common questions
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <Card 
                key={index}
                className="cursor-pointer"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{faq.question}</h4>
                      {expandedFaq === index && (
                        <p className="text-sm text-muted-foreground mt-2">{faq.answer}</p>
                      )}
                    </div>
                    {expandedFaq === index ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h3 className="font-display font-semibold text-lg">Need more help?</h3>
                <p className="text-muted-foreground text-sm">
                  Our support team is here to assist you
                </p>
              </div>
              <Button asChild>
                <a href="mailto:pharmatrackai@gmail.com?subject=Support Request">
                  Contact Support
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserGuide;
