import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setIsSubmitted(true);
        toast({
          title: 'Check your email',
          description: 'We sent you a password reset link.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-50"></div>
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Back Link */}
          <div className="mb-8">
            <Link to="/auth" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to login</span>
            </Link>
          </div>

          {/* Glassmorphism Card */}
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-card/60 backdrop-blur-xl border border-border/50"></div>
            
            <div className="relative p-8 sm:p-10">
              {/* Logo */}
              <div className="flex items-center justify-center mb-8">
                <Logo size="md" linkTo="/auth" />
              </div>

              {!isSubmitted ? (
                <>
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-display font-bold">Forgot Password?</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      Enter your email and we'll send you a reset link
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
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
                      Send Reset Link
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-2">Check Your Email</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    We've sent a password reset link to <strong className="text-foreground">{email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Didn't receive the email? Check your spam folder or{' '}
                    <button 
                      onClick={() => setIsSubmitted(false)} 
                      className="text-primary hover:underline"
                    >
                      try again
                    </button>
                  </p>
                  <Link to="/auth">
                    <Button variant="outline" className="w-full">
                      Back to Login
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
