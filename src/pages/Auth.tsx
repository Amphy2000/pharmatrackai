import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, ArrowLeft, Check, Zap } from 'lucide-react';
import { Logo } from '@/components/Logo';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  
  const [isLoading, setIsLoading] = useState(false);
  const { user, isLoading: authLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signUp(signupEmail, signupPassword, signupName);

    if (error) {
      // Handle specific error cases
      if (error.message.includes('already registered')) {
        toast({
          title: 'Account Exists',
          description: 'This email is already registered. Please login instead.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Signup Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Check your email!',
        description: 'We sent you a verification link. Please verify your email to continue.',
      });
      // Don't navigate immediately - user needs to verify email first
    }

    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-50"></div>
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

      {/* Left Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-12">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to home</span>
          </Link>
        </div>
        
        <div className="max-w-md">
          <div className="mb-8">
            <Logo size="lg" linkTo="/" />
          </div>
          
          <h1 className="text-4xl font-display font-bold mb-4">
            The Intelligence Layer for <span className="text-gradient-premium">Your Pharmacy</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Built by pharmacists, for pharmacists. Protect your license, eliminate waste, and grow your profit.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-success/20 flex items-center justify-center">
                <Check className="h-4 w-4 text-success" />
              </div>
              <span className="text-muted-foreground">Reduce expiry waste by up to 10%</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-success/20 flex items-center justify-center">
                <Check className="h-4 w-4 text-success" />
              </div>
              <span className="text-muted-foreground">Track staff performance & accountability</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-success/20 flex items-center justify-center">
                <Check className="h-4 w-4 text-success" />
              </div>
              <span className="text-muted-foreground">NAFDAC, MHRA & FDA compliant</span>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} PharmaTrack. All rights reserved.
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Back Link */}
          <div className="lg:hidden mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to home</span>
            </Link>
          </div>

          {/* Glassmorphism Card */}
          <div className="relative rounded-3xl overflow-hidden">
            {/* Glass Background */}
            <div className="absolute inset-0 bg-card/60 backdrop-blur-xl border border-border/50"></div>
            
            {/* Content */}
            <div className="relative p-8 sm:p-10">
              {/* Mobile Logo */}
              <div className="lg:hidden flex items-center justify-center mb-8">
                <Logo size="md" linkTo="/" />
              </div>

              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl mb-8">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <div className="mb-6">
                    <h2 className="text-2xl font-display font-bold">Welcome back</h2>
                    <p className="text-sm text-muted-foreground">Enter your credentials to access your dashboard</p>
                  </div>
                  
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                          className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-primary hover:opacity-90 shadow-glow-primary text-base font-semibold" 
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                    
                    <div className="text-center pt-2">
                      <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                        Forgot your password?
                      </Link>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <div className="mb-6">
                    <h2 className="text-2xl font-display font-bold">Start your free trial</h2>
                    <p className="text-sm text-muted-foreground">7 days free, no credit card required</p>
                  </div>
                  
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          required
                          className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                          className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                          minLength={6}
                          className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-primary hover:opacity-90 shadow-glow-primary text-base font-semibold" 
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2">
                      <Zap className="h-3 w-3 text-primary" />
                      <span>Powered by AI intelligence</span>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
