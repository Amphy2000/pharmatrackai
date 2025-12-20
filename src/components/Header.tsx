import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Pill, 
  Activity, 
  Bell, 
  Search, 
  ChevronDown,
  User,
  LogOut,
  HelpCircle,
  Shield,
  Sparkles,
  LayoutDashboard,
  ShoppingCart,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CurrencySettings } from '@/components/settings/CurrencySettings';

export const Header = () => {
  const location = useLocation();
  const [notifications] = useState([
    { id: 1, title: '5 medications expiring soon', time: '2 hours ago', type: 'warning' },
    { id: 2, title: 'Low stock alert: Amoxicillin', time: '4 hours ago', type: 'danger' },
    { id: 3, title: 'AI analysis complete', time: '1 day ago', type: 'info' },
  ]);

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/checkout', label: 'POS', icon: ShoppingCart },
    { href: '/sales-history', label: 'Sales History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6">
        <div className="flex h-20 items-center justify-between gap-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow-primary animate-glow-pulse">
                <Pill className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success">
                <Activity className="h-3 w-3 text-success-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
                <span className="text-foreground">Pharma</span>
                <span className="text-gradient">Track</span>
                <Badge variant="secondary" className="ml-2 bg-secondary/20 text-secondary border-secondary/30 text-xs font-medium">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground tracking-wide">Enterprise Inventory Management</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-primary/10 text-primary border border-primary/20' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Live Status */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 border border-success/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-sm font-medium text-success">System Online</span>
            </div>

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-xl hover:bg-muted/50">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold font-display">Notifications</h4>
                    <Badge variant="secondary" className="text-xs">{notifications.length} new</Badge>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-4 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-border/50">
                  <Button variant="ghost" className="w-full text-sm">View all notifications</Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Currency Settings */}
            <CurrencySettings />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-11 gap-3 px-3 rounded-xl hover:bg-muted/50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium leading-none">Admin User</p>
                    <p className="text-xs text-muted-foreground">Pharmacy Manager</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help & Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};