import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { FileText, Plus, Trash2, Pill, User } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { useMedications } from '@/hooks/useMedications';
import { usePharmacy } from '@/hooks/usePharmacy';
import type { Customer } from '@/types/customer';

const prescriptionItemSchema = z.object({
  medication_id: z.string().optional(),
  medication_name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().optional(),
  quantity: z.coerce.number().min(1),
  instructions: z.string().optional(),
});

const prescriptionSchema = z.object({
  prescription_number: z.string().min(1, 'Prescription number is required'),
  prescriber_name: z.string().optional(),
  prescriber_phone: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  issue_date: z.string(),
  expiry_date: z.string().optional(),
  max_refills: z.coerce.number().min(0).default(0),
  next_refill_reminder: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1, 'At least one medication is required'),
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

interface AddPrescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
}

export const AddPrescriptionModal = ({ open, onOpenChange, customer }: AddPrescriptionModalProps) => {
  const { pharmacy } = usePharmacy();
  const { addPrescription } = usePrescriptions(customer.id);
  const { medications } = useMedications();
  
  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      prescription_number: `RX-${Date.now().toString(36).toUpperCase()}`,
      issue_date: format(new Date(), 'yyyy-MM-dd'),
      max_refills: 0,
      items: [{ medication_name: '', dosage: '', frequency: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const onSubmit = async (data: PrescriptionFormData) => {
    if (!pharmacy?.id) return;

    await addPrescription.mutateAsync({
      prescription: {
        pharmacy_id: pharmacy.id,
        customer_id: customer.id,
        prescription_number: data.prescription_number,
        prescriber_name: data.prescriber_name || null,
        prescriber_phone: data.prescriber_phone || null,
        diagnosis: data.diagnosis || null,
        notes: data.notes || null,
        issue_date: data.issue_date,
        expiry_date: data.expiry_date || null,
        status: 'active',
        refill_count: 0,
        max_refills: data.max_refills,
        last_refill_date: null,
        next_refill_reminder: data.next_refill_reminder || null,
      },
      items: data.items.map(item => ({
        medication_id: item.medication_id || null,
        medication_name: item.medication_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration || null,
        quantity: item.quantity,
        instructions: item.instructions || null,
      })),
    });

    reset();
    onOpenChange(false);
  };

  const handleMedicationSelect = (index: number, medicationId: string) => {
    const medication = medications.find(m => m.id === medicationId);
    if (medication) {
      setValue(`items.${index}.medication_id`, medicationId);
      setValue(`items.${index}.medication_name`, medication.name);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            New Prescription
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <User className="h-4 w-4" />
            For: {customer.full_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Prescription Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prescription_number">Prescription # *</Label>
              <Input
                id="prescription_number"
                {...register('prescription_number')}
              />
              {errors.prescription_number && (
                <p className="text-xs text-destructive">{errors.prescription_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date *</Label>
              <Input
                id="issue_date"
                type="date"
                {...register('issue_date')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prescriber_name">Prescriber Name</Label>
              <Input
                id="prescriber_name"
                {...register('prescriber_name')}
                placeholder="Dr. Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prescriber_phone">Prescriber Phone</Label>
              <Input
                id="prescriber_phone"
                {...register('prescriber_phone')}
                placeholder="+234..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Prescription Expiry</Label>
              <Input
                id="expiry_date"
                type="date"
                {...register('expiry_date')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_refills">Max Refills</Label>
              <Input
                id="max_refills"
                type="number"
                min="0"
                {...register('max_refills')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Input
              id="diagnosis"
              {...register('diagnosis')}
              placeholder="e.g., Hypertension"
            />
          </div>

          {/* Medications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Medications *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ medication_name: '', dosage: '', frequency: '', quantity: 1 })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Medication
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="p-4 rounded-xl border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    Medication {index + 1}
                  </span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Select from inventory</Label>
                    <Select onValueChange={(value) => handleMedicationSelect(index, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Or type manually" />
                      </SelectTrigger>
                      <SelectContent>
                        {medications.filter(m => m.is_shelved).map(med => (
                          <SelectItem key={med.id} value={med.id}>
                            {med.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Medication Name *</Label>
                    <Input
                      {...register(`items.${index}.medication_name`)}
                      placeholder="Medication name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Dosage *</Label>
                    <Input
                      {...register(`items.${index}.dosage`)}
                      placeholder="500mg"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Frequency *</Label>
                    <Input
                      {...register(`items.${index}.frequency`)}
                      placeholder="3x daily"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      {...register(`items.${index}.quantity`)}
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Duration</Label>
                    <Input
                      {...register(`items.${index}.duration`)}
                      placeholder="7 days"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Instructions</Label>
                    <Input
                      {...register(`items.${index}.instructions`)}
                      placeholder="After meals"
                    />
                  </div>
                </div>
              </div>
            ))}
            {errors.items && (
              <p className="text-xs text-destructive">{errors.items.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_refill_reminder">Next Refill Reminder</Label>
            <Input
              id="next_refill_reminder"
              type="date"
              {...register('next_refill_reminder')}
            />
            <p className="text-xs text-muted-foreground">
              Set a date to remind the customer about their refill
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional notes..."
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
              disabled={addPrescription.isPending}
            >
              Create Prescription
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
