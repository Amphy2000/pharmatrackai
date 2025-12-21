import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User, Phone, Mail, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCustomers } from '@/hooks/useCustomers';
import { usePharmacy } from '@/hooks/usePharmacy';
import type { Customer } from '@/types/customer';

const customerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomer?: Customer | null;
}

export const AddCustomerModal = ({ open, onOpenChange, editingCustomer }: AddCustomerModalProps) => {
  const { pharmacy } = usePharmacy();
  const { addCustomer, updateCustomer } = useCustomers();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: editingCustomer ? {
      full_name: editingCustomer.full_name,
      phone: editingCustomer.phone || '',
      email: editingCustomer.email || '',
      date_of_birth: editingCustomer.date_of_birth || '',
      address: editingCustomer.address || '',
      notes: editingCustomer.notes || '',
    } : {},
  });

  const onSubmit = async (data: CustomerFormData) => {
    if (!pharmacy?.id) return;

    const customerData = {
      full_name: data.full_name,
      pharmacy_id: pharmacy.id,
      phone: data.phone || null,
      email: data.email || null,
      date_of_birth: data.date_of_birth || null,
      address: data.address || null,
      notes: data.notes || null,
    };

    if (editingCustomer) {
      await updateCustomer.mutateAsync({ id: editingCustomer.id, ...customerData });
    } else {
      await addCustomer.mutateAsync(customerData);
    }

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
          <DialogDescription>
            {editingCustomer ? 'Update customer details' : 'Enter customer information to add them to your database'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-2">
              <User className="h-4 w-4" /> Full Name *
            </Label>
            <Input
              id="full_name"
              {...register('full_name')}
              placeholder="John Doe"
            />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> Phone
              </Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+234 801 234 5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_birth" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Date of Birth
            </Label>
            <Input
              id="date_of_birth"
              type="date"
              {...register('date_of_birth')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Address
            </Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="Customer's address"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional notes about this customer..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-primary hover:opacity-90"
              disabled={addCustomer.isPending || updateCustomer.isPending}
            >
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
