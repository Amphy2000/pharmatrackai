export interface TourStep {
  id: string;
  title: string;
  description: string;
  features: string[];
  icon: 'sparkles' | 'dashboard' | 'cart' | 'package' | 'zap' | 'users' | 'check' | 'shield' | 'chart';
  animation?: 'fade' | 'slide' | 'scale' | 'bounce';
}

// Owner/Manager tour - full feature access
export const ownerTourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to PharmaTrack! 🎉',
    description: 'Let us show you around your pharmacy management system. This guide will help you master each feature step by step.',
    features: [
      'AI-powered inventory management',
      'Real-time sales analytics',
      'Multi-branch support',
      'NAFDAC compliance tools'
    ],
    icon: 'sparkles',
    animation: 'scale',
  },
  {
    id: 'dashboard',
    title: 'Your Command Center',
    description: 'The Dashboard gives you a bird\'s eye view of your entire pharmacy operation. Monitor performance, track trends, and make data-driven decisions.',
    features: [
      'Real-time revenue tracking',
      'Low stock alerts at a glance',
      'Expiry warnings dashboard',
      'AI-powered insights panel',
      'Staff performance metrics'
    ],
    icon: 'dashboard',
    animation: 'fade',
  },
  {
    id: 'pos',
    title: 'Lightning-Fast Point of Sale',
    description: 'Process sales in seconds with our intuitive POS system. Built for speed and accuracy in high-traffic pharmacy environments.',
    features: [
      'Barcode scanning support',
      'Smart product search',
      'Hold & recall transactions',
      'Multiple payment methods',
      'Auto drug interaction warnings',
      'Instant receipt printing'
    ],
    icon: 'cart',
    animation: 'slide',
  },
  {
    id: 'inventory',
    title: 'Smart Inventory Management',
    description: 'Never run out of stock or lose money to expiring drugs. Our AI helps you maintain optimal inventory levels automatically.',
    features: [
      'AI Invoice Scanner - add 50+ items in 10 seconds',
      'Automatic expiry tracking',
      'Smart reorder suggestions',
      'Batch & lot number tracking',
      'Controlled drugs register',
      'Location/shelf mapping'
    ],
    icon: 'package',
    animation: 'fade',
  },
  {
    id: 'ai-features',
    title: 'AI-Powered Intelligence',
    description: 'Let artificial intelligence work for you. Predict demand, optimize pricing, and prevent losses before they happen.',
    features: [
      'Demand forecasting',
      'Expiry discount recommendations',
      'Profit margin analysis',
      'Sales trend predictions',
      'Smart restocking alerts'
    ],
    icon: 'chart',
    animation: 'scale',
  },
  {
    id: 'alerts',
    title: 'Automated Alerts That Work For You',
    description: 'Never miss a critical inventory moment. Get instant SMS or WhatsApp alerts when stock runs low or items approach expiry—even when you\'re away from the shop.',
    features: [
      'Low stock SMS/WhatsApp alerts',
      'Expiry warning notifications',
      'Daily digest summaries',
      'Customizable alert thresholds',
      'Multi-channel delivery (SMS + WhatsApp)',
      'One-click alert actions from your phone'
    ],
    icon: 'zap',
    animation: 'bounce',
  },
  {
    id: 'staff',
    title: 'Team Management',
    description: 'Manage your staff efficiently with role-based access, shift tracking, and performance monitoring.',
    features: [
      'Add unlimited staff members',
      'Role-based permissions',
      'Clock in/out tracking',
      'Sales by cashier reports',
      'Admin PIN protection',
      'Activity audit logs'
    ],
    icon: 'users',
    animation: 'slide',
  },
  {
    id: 'marketplace',
    title: 'Get Discovered by Patients',
    description: 'Stop waiting for walk-ins. Our public marketplace lets patients within 1-10km find your pharmacy and order via WhatsApp.',
    features: [
      'Public product listing (you control what\'s visible)',
      'Distance-based search (patients find nearby stock)',
      'Spotlight/Featured products for extra visibility',
      'WhatsApp ordering integration',
      'Google Maps directions to your shop',
      'Neighborhood-based targeting'
    ],
    icon: 'zap',
    animation: 'scale',
  },
  {
    id: 'compliance',
    title: 'Stay NAFDAC Compliant',
    description: 'Built-in compliance tools ensure you\'re always audit-ready. Generate reports instantly when inspectors arrive.',
    features: [
      'NAFDAC registration tracking',
      'Batch traceability logs',
      'Manufacturing date records',
      'Controlled drugs register',
      'One-click compliance reports'
    ],
    icon: 'shield',
    animation: 'fade',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! ✅',
    description: 'You now know the key features of PharmaTrack. Explore at your own pace, and remember - we\'re here to help!',
    features: [
      'Restart this tour anytime from Settings',
      'Check the User Guide for detailed help',
      'Contact support: pharmatrackai@gmail.com',
      'WhatsApp: +234 916 915 3129'
    ],
    icon: 'check',
    animation: 'bounce',
  },
];

// Staff (cashier) tour - focused on POS and their daily tasks
export const staffTourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to PharmaTrack! 🎉',
    description: 'This quick guide will help you get started with your daily cashier tasks. Let\'s make serving customers easy!',
    features: [
      'Fast & easy point of sale',
      'Track your sales performance',
      'Manage your shifts',
      'View your transaction history'
    ],
    icon: 'sparkles',
    animation: 'scale',
  },
  {
    id: 'dashboard',
    title: 'Your Cashier Dashboard',
    description: 'This is your home base. Here you can see your daily activity, clock in/out, and quickly access the POS.',
    features: [
      'Clock in to start your shift',
      'View today\'s transactions',
      'Track items you\'ve sold',
      'Quick access to POS',
      'See manager alerts for low stock'
    ],
    icon: 'dashboard',
    animation: 'fade',
  },
  {
    id: 'pos',
    title: 'Point of Sale (POS)',
    description: 'This is where you\'ll spend most of your time. Process customer sales quickly and accurately.',
    features: [
      'Search products by name',
      'Scan barcodes for speed',
      'Add items to cart',
      'Apply discounts when needed',
      'Choose payment method',
      'Print receipts automatically'
    ],
    icon: 'cart',
    animation: 'slide',
  },
  {
    id: 'quick-pay',
    title: 'Quick Pay Terminal',
    description: 'For pending invoices, use the Quick Pay terminal to complete customer payments instantly.',
    features: [
      'Scan invoice barcode',
      'Enter short code manually',
      'Select payment method',
      'Complete sale in seconds'
    ],
    icon: 'zap',
    animation: 'scale',
  },
  {
    id: 'my-sales',
    title: 'Your Sales History',
    description: 'Track your personal performance and view all the transactions you\'ve processed.',
    features: [
      'View all your sales',
      'Filter by date range',
      'Check daily totals',
      'Monitor your progress'
    ],
    icon: 'chart',
    animation: 'fade',
  },
  {
    id: 'complete',
    title: 'Ready to Go! ✅',
    description: 'You\'re all set to start serving customers. Remember, speed and accuracy are key!',
    features: [
      'Restart this tour from your profile',
      'Ask your manager for help',
      'Clock in before making sales',
      'Always give receipts to customers'
    ],
    icon: 'check',
    animation: 'bounce',
  },
];

// Pharmacist tour - clinical focus with inventory and customer access
export const pharmacistTourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to PharmaTrack! 🎉',
    description: 'This guide covers the features available to you as a pharmacist. Let\'s explore your clinical tools!',
    features: [
      'Patient prescription management',
      'Inventory oversight',
      'Drug interaction warnings',
      'Customer health records'
    ],
    icon: 'sparkles',
    animation: 'scale',
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'Monitor pharmacy operations at a glance. Track stock levels, expiry alerts, and daily activity.',
    features: [
      'Low stock notifications',
      'Expiry date alerts',
      'Automated SMS/WhatsApp alerts',
      'Daily sales summary',
      'Quick navigation to key areas'
    ],
    icon: 'dashboard',
    animation: 'fade',
  },
  {
    id: 'pos',
    title: 'Point of Sale',
    description: 'Dispense medications with confidence. The system warns you about drug interactions automatically.',
    features: [
      'Automatic drug interaction checks',
      'Prescription verification',
      'Dosage information display',
      'Customer purchase history'
    ],
    icon: 'cart',
    animation: 'slide',
  },
  {
    id: 'inventory',
    title: 'Inventory Management',
    description: 'Keep track of all medications, their batches, expiry dates, and stock levels.',
    features: [
      'View all medications',
      'Check stock levels',
      'Track batch numbers',
      'Monitor expiry dates',
      'Request stock transfers'
    ],
    icon: 'package',
    animation: 'fade',
  },
  {
    id: 'customers',
    title: 'Customer Records',
    description: 'Access customer health profiles and prescription history for better patient care.',
    features: [
      'View customer profiles',
      'Track prescription history',
      'Manage refill reminders',
      'Record health notes'
    ],
    icon: 'users',
    animation: 'slide',
  },
  {
    id: 'complete',
    title: 'Ready to Serve! ✅',
    description: 'You\'re equipped to provide excellent pharmaceutical care. Patient safety is our priority!',
    features: [
      'Restart this tour from Settings',
      'Check the User Guide for details',
      'Report issues to your manager',
      'Always verify prescriptions'
    ],
    icon: 'check',
    animation: 'bounce',
  },
];

// Get tour steps based on role
export const getTourStepsForRole = (role: 'owner' | 'manager' | 'staff' | null): TourStep[] => {
  switch (role) {
    case 'owner':
    case 'manager':
      return ownerTourSteps;
    case 'staff':
      return staffTourSteps;
    default:
      return ownerTourSteps; // Default to owner tour for new users
  }
};

// Get tour storage key based on role
export const getTourStorageKey = (userId: string, role: 'owner' | 'manager' | 'staff' | null): string => {
  const roleKey = role || 'default';
  return `pharmatrack_tour_completed_${userId}_${roleKey}`;
};
