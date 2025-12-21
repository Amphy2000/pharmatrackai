import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TrialBanner } from '@/components/subscription';
import { 
  Pill, 
  Activity, 
  Bell, 
  ChevronDown,
  User,
  LogOut,
  HelpCircle,
  Shield,
  Sparkles,
  LayoutDashboard,
  ShoppingCart,
  History,
  Users,
  Building2,
  Truck,
  PackageSearch,
  Settings,
  Check,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  Crown
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
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
import { usePermissions } from '@/hooks/usePermissions';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isOwnerOrManager, userRole } = usePermissions();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { isAdmin, isDevEmail } = usePlatformAdmin();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Show admin link for admins or the dev email
  const showAdminLink = isAdmin || isDevEmail;

  // Staff-accessible navigation
  const staffNavLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/checkout', label: 'POS', icon: ShoppingCart },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/branches', label: 'Branches', icon: Building2 },
    { href: '/inventory', label: 'Inventory', icon: PackageSearch },
    { href: '/sales', label: 'Sales', icon: History },
  ];

  // Manager/Owner only navigation
  const managerNavLinks = [
    { href: '/suppliers', label: 'Suppliers', icon: Truck },
  ];

  // Settings - always visible to owner/manager
  const settingsLink = { href: '/settings', label: 'Settings', icon: Settings };

  const navLinks = isOwnerOrManager 
    ? [...staffNavLinks, ...managerNavLinks]
    : staffNavLinks;

  const roleLabel = userRole === 'owner' ? 'Owner' : userRole === 'manager' ? 'Manager' : 'Staff';

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'danger':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'success':
        return <Check className="h-4 w-4 text-success" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
      setNotificationsOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <TooltipProvider delayDuration={200}>
      <>
      <TrialBanner />
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-4 lg:gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="relative">
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-primary">
                  <Pill className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success">
                  <Activity className="h-2 w-2 text-success-foreground" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold font-display tracking-tight">
                  <span className="text-foreground">Pharma</span>
                  <span className="text-gradient">Track</span>
                </h1>
              </div>
            </Link>

            {/* Navigation Links - icon-only until very wide screens (consistent across browsers) */}
            <nav className="hidden lg:flex items-center flex-1 min-w-0 justify-center">
              <div className="flex items-center gap-0.5 2xl:gap-1">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.href || (link.href === '/' && location.pathname === '/dashboard');
                  return (
                    <Tooltip key={link.href}>
                      <TooltipTrigger asChild>
                        <Link
                          to={link.href === '/' ? '/dashboard' : link.href}
                          className={`flex items-center justify-center 2xl:justify-start gap-1.5 h-9 w-9 2xl:h-auto 2xl:w-auto 2xl:px-3 2xl:py-2 rounded-lg text-sm font-medium transition-all ${
                            isActive 
                              ? 'bg-primary/10 text-primary' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <link.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="hidden 2xl:inline whitespace-nowrap">{link.label}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{link.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {/* Settings Link - Always visible */}
                {isOwnerOrManager && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to="/settings"
                        className={`flex items-center justify-center 2xl:justify-start gap-1.5 h-9 w-9 2xl:h-auto 2xl:w-auto 2xl:px-3 2xl:py-2 rounded-lg text-sm font-medium transition-all ${
                          location.pathname === '/settings'
                            ? 'bg-primary/10 text-primary' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <Settings className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden 2xl:inline whitespace-nowrap">Settings</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Settings</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {/* Admin Link - Only for platform admins/dev */}
                {showAdminLink && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to="/admin"
                        className={`flex items-center justify-center 2xl:justify-start gap-1.5 h-9 w-9 2xl:h-auto 2xl:w-auto 2xl:px-3 2xl:py-2 rounded-lg text-sm font-medium transition-all ${
                          location.pathname === '/admin'
                            ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500' 
                            : 'text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10'
                        }`}
                      >
                        <Crown className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden 2xl:inline whitespace-nowrap">Admin</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Platform Admin Dashboard</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Live Status */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-xs font-medium text-success">Online</span>
            </div>

            {/* Mobile Nav - Only show on small screens */}
            <div className="flex lg:hidden items-center gap-0.5">
              {navLinks.slice(0, 4).map((link) => {
                const isActive = location.pathname === link.href || (link.href === '/' && location.pathname === '/dashboard');
                return (
                  <Tooltip key={link.href}>
                    <TooltipTrigger asChild>
                      <Link
                        to={link.href === '/' ? '/dashboard' : link.href}
                        className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all flex-shrink-0 ${
                          isActive 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <link.icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{link.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Notifications */}
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 sm:h-11 sm:w-11 rounded-xl hover:bg-muted/50">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-destructive text-destructive-foreground text-[10px] font-bold items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold font-display">Notifications</h4>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={markAllAsRead}
                      >
                        <CheckCheck className="h-3 w-3" />
                        Mark all read
                      </Button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`p-4 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${
                          !notification.isRead ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.isRead ? 'font-medium' : ''}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                          </div>
                          {!notification.isRead && (
                            <div className="flex-shrink-0">
                              <div className="h-2 w-2 rounded-full bg-primary"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>


            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 sm:h-11 gap-2 sm:gap-3 px-2 sm:px-3 rounded-xl hover:bg-muted/50">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-primary">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium leading-none">User</p>
                    <p className="text-xs text-muted-foreground">{roleLabel}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile?tab=security')}>
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile?tab=help')}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help & Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
    </>
    </TooltipProvider>
  );
};
