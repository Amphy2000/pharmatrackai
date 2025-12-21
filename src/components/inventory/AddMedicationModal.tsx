import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Save } from 'lucide-react';
import { Medication, MedicationFormData, MedicationCategory } from '@/types/medication';
import { useMedications } from '@/hooks/useMedications';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const categories: MedicationCategory[] = [
  'Tablet',
  'Syrup',
  'Capsule',
  'Injection',
  'Cream',
  'Drops',
  'Inhaler',
  'Powder',
  'Other',
];

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  category: z.enum(['Tablet', 'Syrup', 'Capsule', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Powder', 'Other']),
  batch_number: z.string().min(1, 'Batch number is required').max(50),
  barcode_id: z.string().max(100).optional(),
  current_stock: z.coerce.number().min(0, 'Stock cannot be negative'),
  reorder_level: z.coerce.number().min(0, 'Reorder level cannot be negative'),
  expiry_date: z.date({ required_error: 'Expiry date is required' }),
  unit_price: z.coerce.number().min(0, 'Price cannot be negative'),
  selling_price: z.coerce.number().min(0, 'Price cannot be negative').optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddMedicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMedication?: Medication | null;
}

export const AddMedicationModal = ({
  open,
  onOpenChange,
  editingMedication,
}: AddMedicationModalProps) => {
  const { addMedication, updateMedication } = useMedications();
  const isEditing = !!editingMedication;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: 'Tablet',
      batch_number: '',
      barcode_id: '',
      current_stock: 0,
      reorder_level: 10,
      unit_price: 0,
      selling_price: undefined,
    },
  });

  useEffect(() => {
    if (editingMedication) {
      form.reset({
        name: editingMedication.name,
        category: editingMedication.category,
        batch_number: editingMedication.batch_number,
        barcode_id: editingMedication.barcode_id || '',
        current_stock: editingMedication.current_stock,
        reorder_level: editingMedication.reorder_level,
        expiry_date: new Date(editingMedication.expiry_date),
        unit_price: Number(editingMedication.unit_price),
        selling_price: editingMedication.selling_price ? Number(editingMedication.selling_price) : undefined,
      });
    } else {
      form.reset({
        name: '',
        category: 'Tablet',
        batch_number: '',
        barcode_id: '',
        current_stock: 0,
        reorder_level: 10,
        unit_price: 0,
        selling_price: undefined,
      });
    }
  }, [editingMedication, form]);

  const onSubmit = (values: FormValues) => {
    const medicationData: MedicationFormData = {
      name: values.name,
      category: values.category,
      batch_number: values.batch_number,
      barcode_id: values.barcode_id || undefined,
      current_stock: values.current_stock,
      reorder_level: values.reorder_level,
      unit_price: values.unit_price,
      selling_price: values.selling_price || undefined,
      expiry_date: format(values.expiry_date, 'yyyy-MM-dd'),
    };

    if (isEditing && editingMedication) {
      updateMedication.mutate({ id: editingMedication.id, ...medicationData });
    } else {
      addMedication.mutate(medicationData);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? 'Edit Medication' : 'Add New Medication'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the medication details below.'
              : 'Enter the details for the new medication batch.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medication Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Amoxicillin 500mg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batch_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., AMX-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="barcode_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode / SKU (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 5901234123457" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="current_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reorder_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiry Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="selling_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      placeholder="Leave empty to use cost price"
                      {...field} 
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2 bg-gradient-primary hover:opacity-90">
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Medication
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
