import { Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  ClipboardList, 
  FileText,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  variant: 'primary' | 'secondary' | 'accent';
  badge?: string;
}

const staffActions: QuickAction[] = [
  {
    title: 'Point of Sale',
    description: 'Process customer transactions',
    icon: <ShoppingCart className="h-6 w-6" />,
    href: '/checkout',
    variant: 'primary',
    badge: 'Quick Access',
  },
  {
    title: 'Inventory',
    description: 'Receive stock & count items',
    icon: <Package className="h-6 w-6" />,
    href: '/inventory',
    variant: 'secondary',
  },
  {
    title: 'Customers',
    description: 'Manage customer records',
    icon: <Users className="h-6 w-6" />,
    href: '/customers',
    variant: 'accent',
  },
  {
    title: 'Sales History',
    description: 'View recent transactions',
    icon: <FileText className="h-6 w-6" />,
    href: '/sales',
    variant: 'secondary',
  },
];

export const StaffQuickActions = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-primary">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display">Quick Actions</h2>
          <p className="text-sm text-muted-foreground">Jump to your most-used features</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {staffActions.map((action) => (
          <Link key={action.title} to={action.href}>
            <Card 
              className={`metric-card group cursor-pointer h-full transition-all duration-300 hover:scale-[1.02] ${
                action.variant === 'primary' 
                  ? 'border-primary/30 hover:border-primary/50' 
                  : action.variant === 'accent'
                  ? 'border-accent/30 hover:border-accent/50'
                  : 'border-secondary/30 hover:border-secondary/50'
              }`}
            >
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className={`p-3 rounded-xl transition-all duration-300 ${
                      action.variant === 'primary'
                        ? 'bg-primary/20 text-primary group-hover:shadow-glow-primary'
                        : action.variant === 'accent'
                        ? 'bg-accent/20 text-accent'
                        : 'bg-secondary/20 text-secondary'
                    }`}
                  >
                    {action.icon}
                  </div>
                  {action.badge && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      {action.badge}
                    </Badge>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
                <div className="mt-3 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Open</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
