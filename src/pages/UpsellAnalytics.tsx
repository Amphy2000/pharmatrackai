import React from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import UpsellAnalyticsDashboard from '@/components/dashboard/UpsellAnalyticsDashboard';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const UpsellAnalytics = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <UpsellAnalyticsDashboard />
      </main>
    </div>
  );
};

export default UpsellAnalytics;
