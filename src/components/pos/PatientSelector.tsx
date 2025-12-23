import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X, UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCustomers } from '@/hooks/useCustomers';
import { Customer } from '@/types/customer';
import { AddCustomerModal } from '@/components/customers/AddCustomerModal';

interface PatientSelectorProps {
  selectedPatient: Customer | null;
  onSelectPatient: (patient: Customer | null) => void;
  onSkip: () => void;
}

export const PatientSelector = ({ 
  selectedPatient, 
  onSelectPatient,
  onSkip 
}: PatientSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const { customers, isLoading } = useCustomers();

  const filteredCustomers = customers.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (customer: Customer) => {
    onSelectPatient(customer);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSkip = () => {
    onSelectPatient(null);
    onSkip();
    setIsOpen(false);
  };

  if (selectedPatient) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
        <User className="h-4 w-4 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selectedPatient.full_name}</p>
          {selectedPatient.phone && (
            <p className="text-xs text-muted-foreground">{selectedPatient.phone}</p>
          )}
        </div>
        <Badge variant="outline" className="text-xs">
          {selectedPatient.loyalty_points} pts
        </Badge>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={() => onSelectPatient(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start gap-2 h-11"
        onClick={() => setIsOpen(true)}
      >
        <User className="h-4 w-4" />
        Select Patient (Optional)
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Patient</DialogTitle>
            <DialogDescription>
              Link this sale to a patient for tracking and loyalty points
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[250px]">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No patients found</p>
                  {searchQuery && (
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setShowAddModal(true)}
                    >
                      Add new patient
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {filteredCustomers.slice(0, 20).map((customer) => (
                      <motion.div
                        key={customer.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors"
                        onClick={() => handleSelect(customer)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{customer.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {customer.phone || customer.email || 'No contact info'}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {customer.loyalty_points} pts
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setShowAddModal(true)}
              >
                <UserPlus className="h-4 w-4" />
                Add New
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={handleSkip}
              >
                Skip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddCustomerModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal}
      />
    </>
  );
};
