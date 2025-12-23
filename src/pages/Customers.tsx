import { useState } from 'react';
import { Users, Plus, Search, Star } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomersTable } from '@/components/customers/CustomersTable';
import { AddCustomerModal } from '@/components/customers/AddCustomerModal';
import { CustomerPrescriptionsModal } from '@/components/customers/CustomerPrescriptionsModal';
import { CustomerDetailModal } from '@/components/customers/CustomerDetailModal';
import { useCustomers } from '@/hooks/useCustomers';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import type { Customer } from '@/types/customer';

const Customers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const { customers } = useCustomers();
  const { prescriptionsDueForReminder } = usePrescriptions();

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsAddModalOpen(open);
    if (!open) setEditingCustomer(null);
  };

  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header Section */}
        <section className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold font-display tracking-tight mb-2">
                Customer <span className="text-gradient">Management</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Track prescriptions, loyalty points, and customer history
              </p>
            </div>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="gap-2 bg-gradient-primary hover:opacity-90 shadow-glow-primary btn-glow"
            >
              <Plus className="h-5 w-5" />
              Add Customer
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{customers.length}</p>
                  <p className="text-xs text-muted-foreground">Total Customers</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-warning/10">
                  <Star className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLoyaltyPoints.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Loyalty Points</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-success/10">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {customers.filter(c => c.phone || c.email).length}
                  </p>
                  <p className="text-xs text-muted-foreground">With Contact Info</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/10">
                  <Users className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{prescriptionsDueForReminder.length}</p>
                  <p className="text-xs text-muted-foreground">Refill Reminders Due</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Customers Table */}
        <section className="glass-card rounded-2xl p-4 sm:p-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold font-display">All Customers</h2>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <CustomersTable
            searchQuery={searchQuery}
            onEdit={handleEdit}
            onViewPrescriptions={setViewingCustomer}
            onViewDetails={setDetailCustomer}
          />
        </section>
      </main>

      <AddCustomerModal
        open={isAddModalOpen}
        onOpenChange={handleCloseModal}
        editingCustomer={editingCustomer}
      />

      {viewingCustomer && (
        <CustomerPrescriptionsModal
          open={!!viewingCustomer}
          onOpenChange={(open) => !open && setViewingCustomer(null)}
          customer={viewingCustomer}
        />
      )}

      <CustomerDetailModal
        customer={detailCustomer}
        open={!!detailCustomer}
        onOpenChange={(open) => !open && setDetailCustomer(null)}
      />
    </div>
  );
};

export default Customers;
