import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Shield, 
  HelpCircle, 
  Save, 
  Loader2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  MessageCircle,
  Book,
  FileText
} from 'lucide-react';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [profile, setProfile] = useState({
    fullName: '',
    phone: '',
    email: '',
  });
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    const fetchProfile = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        setProfile({
          fullName: data?.full_name || user.user_metadata?.full_name || '',
          phone: data?.phone || '',
          email: user.email || '',
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, authLoading, navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.fullName,
          phone: profile.phone,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (profileError) throw profileError;

      // Update user metadata
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: profile.fullName },
      });

      if (metaError) throw metaError;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully.',
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully.',
      });

      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-primary flex items-center gap-2">
            <User className="h-8 w-8" />
            Account Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile, security, and get help
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="help" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Help
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Your full name"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="mt-1.5 bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+234 800 000 0000"
                    className="mt-1.5"
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="newPassword" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    New Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                    className="mt-1.5"
                  />
                </div>

                <Button 
                  onClick={handleChangePassword} 
                  disabled={isSaving || !passwords.newPassword || !passwords.confirmPassword}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Sign out of your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help">
            <Card>
              <CardHeader>
                <CardTitle>Help & Support</CardTitle>
                <CardDescription>
                  Get help with using PharmaTrack
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Book className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">User Guide</h4>
                        <p className="text-sm text-muted-foreground">
                          Learn how to use all features
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <h4 className="font-medium">Contact Support</h4>
                        <p className="text-sm text-muted-foreground">
                          Get help from our team
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <h4 className="font-medium">FAQs</h4>
                        <p className="text-sm text-muted-foreground">
                          Common questions answered
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <ExternalLink className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium">Report an Issue</h4>
                        <p className="text-sm text-muted-foreground">
                          Let us know about bugs
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>PharmaTrack</strong> - Enterprise Pharmacy Management System
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Version 1.0.0 • © 2024 All rights reserved
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfileSettings;
