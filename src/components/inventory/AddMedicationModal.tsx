import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Save, X, Truck } from 'lucide-react';
import { Medication, MedicationFormData } from '@/types/medication';
import { useMedications } from '@/hooks/useMedications';
import { useSuppliers } from '@/hooks/useSuppliers';
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
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';

import { ALL_CATEGORIES, CATEGORY_GROUPS, ProductType, MedicationCategory, DISPENSING_UNITS, DispensingUnit } from '@/types/medication';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  category: z.string().min(1, 'Category is required'),
  batch_number: z.string().min(1, 'Batch number is required').max(50),
  barcode_id: z.string().max(100).optional(),
  current_stock: z.coerce.number().min(0, 'Stock cannot be negative'),
  reorder_level: z.coerce.number().min(0, 'Reorder level cannot be negative'),
  expiry_date: z.date({ required_error: 'Expiry date is required' }),
  manufacturing_date: z.date().optional(),
  unit_price: z.coerce.number().min(0, 'Price cannot be negative'),
  selling_price: z.coerce.number().min(0, 'Price cannot be negative').optional(),
  dispensing_unit: z.string().optional(),
  is_controlled: z.boolean().optional(),
  nafdac_reg_number: z.string().max(50).optional(),
  active_ingredients: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SupplierEntry {
  id?: string;
  name: string;
  unit_price: number;
  lead_time_days: number;
  isNew: boolean;
}

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
  const { addMedication, updateMedication, medications } = useMedications();
  const { suppliers, addSupplier, addSupplierProduct } = useSuppliers();
  const isEditing = !!editingMedication;

  const [supplierEntries, setSupplierEntries] = useState<SupplierEntry[]>([]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', unit_price: 0, lead_time_days: 3 });
  const [selectedExistingSupplier, setSelectedExistingSupplier] = useState('');

  // Calculate smart defaults based on most frequent entries
  const smartDefaults = useMemo(() => {
    if (!medications || medications.length === 0) {
      return { category: 'Tablet', dispensing_unit: 'unit', reorder_level: 10 };
    }

    // Count category frequency
    const categoryCount: Record<string, number> = {};
    const unitCount: Record<string, number> = {};
    let totalReorder = 0;
    let reorderCount = 0;

    medications.forEach((med) => {
      categoryCount[med.category] = (categoryCount[med.category] || 0) + 1;
      if (med.dispensing_unit) {
        unitCount[med.dispensing_unit] = (unitCount[med.dispensing_unit] || 0) + 1;
      }
      if (med.reorder_level) {
        totalReorder += med.reorder_level;
        reorderCount++;
      }
    });

    // Get most frequent category
    const topCategory = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Tablet';

    // Get most frequent dispensing unit
    const topUnit = Object.entries(unitCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unit';

    // Average reorder level
    const avgReorder = reorderCount > 0 ? Math.round(totalReorder / reorderCount) : 10;

    return {
      category: topCategory,
      dispensing_unit: topUnit,
      reorder_level: avgReorder,
    };
  }, [medications]);

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
      dispensing_unit: 'unit',
      is_controlled: false,
      nafdac_reg_number: '',
      active_ingredients: '',
    },
  });

  useEffect(() => {
    if (editingMedication) {
      const ingredients = (editingMedication as any).active_ingredients;
      form.reset({
        name: editingMedication.name,
        category: editingMedication.category,
        batch_number: editingMedication.batch_number,
        barcode_id: editingMedication.barcode_id || '',
        current_stock: editingMedication.current_stock,
        reorder_level: editingMedication.reorder_level,
        expiry_date: new Date(editingMedication.expiry_date),
        manufacturing_date: editingMedication.manufacturing_date ? new Date(editingMedication.manufacturing_date) : undefined,
        unit_price: Number(editingMedication.unit_price),
        selling_price: editingMedication.selling_price ? Number(editingMedication.selling_price) : undefined,
        dispensing_unit: editingMedication.dispensing_unit || 'unit',
        is_controlled: editingMedication.is_controlled || false,
        nafdac_reg_number: editingMedication.nafdac_reg_number || '',
        active_ingredients: ingredients?.join(', ') || '',
      });
      setSupplierEntries([]);
    } else {
      // Use smart defaults for new medications
      form.reset({
        name: '',
        category: smartDefaults.category,
        batch_number: '',
        barcode_id: '',
        current_stock: 0,
        reorder_level: smartDefaults.reorder_level,
        unit_price: 0,
        selling_price: undefined,
        dispensing_unit: smartDefaults.dispensing_unit,
        is_controlled: false,
        nafdac_reg_number: '',
        active_ingredients: '',
      });
      setSupplierEntries([]);
    }
  }, [editingMedication, form, open, smartDefaults]);

  const handleAddExistingSupplier = () => {
    if (!selectedExistingSupplier) return;
    const supplier = suppliers.find(s => s.id === selectedExistingSupplier);
    if (!supplier) return;
    
    // Check if already added
    if (supplierEntries.some(e => e.id === supplier.id)) return;
    
    const unitPrice = form.getValues('unit_price');
    setSupplierEntries([...supplierEntries, {
      id: supplier.id,
      name: supplier.name,
      unit_price: unitPrice,
      lead_time_days: 3,
      isNew: false,
    }]);
    setSelectedExistingSupplier('');
  };

  const handleAddNewSupplier = () => {
    if (!newSupplier.name) return;
    
    // Check if name already exists
    if (supplierEntries.some(e => e.name.toLowerCase() === newSupplier.name.toLowerCase())) return;
    
    setSupplierEntries([...supplierEntries, {
      name: newSupplier.name,
      unit_price: newSupplier.unit_price || form.getValues('unit_price'),
      lead_time_days: newSupplier.lead_time_days,
      isNew: true,
    }]);
    setNewSupplier({ name: '', unit_price: 0, lead_time_days: 3 });
    setShowSupplierForm(false);
  };

  const removeSupplierEntry = (index: number) => {
    setSupplierEntries(supplierEntries.filter((_, i) => i !== index));
  };

  const updateSupplierPrice = (index: number, price: number) => {
    const updated = [...supplierEntries];
    updated[index].unit_price = price;
    setSupplierEntries(updated);
  };

  const onSubmit = async (values: FormValues) => {
    // Parse active ingredients from comma-separated string to array
    const activeIngredients = values.active_ingredients
      ? values.active_ingredients.split(',').map(i => i.trim()).filter(i => i.length > 0)
      : undefined;

    const medicationData: MedicationFormData & { active_ingredients?: string[] } = {
      name: values.name,
      category: values.category as MedicationCategory,
      batch_number: values.batch_number,
      barcode_id: values.barcode_id || undefined,
      current_stock: values.current_stock,
      reorder_level: values.reorder_level,
      unit_price: values.unit_price,
      selling_price: values.selling_price || undefined,
      expiry_date: format(values.expiry_date, 'yyyy-MM-dd'),
      manufacturing_date: values.manufacturing_date ? format(values.manufacturing_date, 'yyyy-MM-dd') : undefined,
      dispensing_unit: (values.dispensing_unit as DispensingUnit) || 'unit',
      is_controlled: values.is_controlled || false,
      nafdac_reg_number: values.nafdac_reg_number || undefined,
      active_ingredients: activeIngredients,
    };

    try {
      if (isEditing && editingMedication) {
        await updateMedication.mutateAsync({ id: editingMedication.id, ...medicationData });
      } else {
        const result = await addMedication.mutateAsync(medicationData);
        
        // Link suppliers to the new medication
        for (const entry of supplierEntries) {
          let supplierId = entry.id;
          
          // Create new supplier if needed
          if (entry.isNew) {
            const newSupplierResult = await addSupplier.mutateAsync({
              name: entry.name,
              is_active: true,
              contact_person: null,
              email: null,
              phone: null,
              address: null,
              website: null,
              payment_terms: null,
              notes: null,
            });
            supplierId = newSupplierResult.id;
          }
          
          // Link supplier to medication
          if (supplierId) {
            await addSupplierProduct.mutateAsync({
              supplier_id: supplierId,
              medication_id: result.id,
              product_name: values.name,
              unit_price: entry.unit_price,
              lead_time_days: entry.lead_time_days,
              min_order_quantity: 1,
              is_available: true,
              sku: null,
            });
          }
        }
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const activeSuppliers = suppliers.filter(s => s.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {(Object.keys(CATEGORY_GROUPS) as ProductType[]).map((group) => (
                          <div key={group}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                              {group}
                            </div>
                            {CATEGORY_GROUPS[group].map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                        <SelectItem value="Other">Other</SelectItem>
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

            <FormField
              control={form.control}
              name="dispensing_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dispensing Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'unit'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-[9999]">
                      {DISPENSING_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="manufacturing_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Manufacturing Date (Optional)</FormLabel>
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

            {/* NAFDAC Registration & Controlled Drug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nafdac_reg_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NAFDAC Reg No (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., A4-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_controlled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Controlled Drug</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Narcotic/psychotropic substance
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Active Ingredients for Clinical Search */}
            <FormField
              control={form.control}
              name="active_ingredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Active Ingredients (for clinical search)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Paracetamol, Caffeine (comma-separated)" 
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Enter ingredient names separated by commas. This enables searching by ingredient name.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Markup-based Selling Price */}
            <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Selling Price</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Markup %</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="30"
                    className="w-20 h-8 text-sm"
                    onChange={(e) => {
                      const markup = parseFloat(e.target.value) || 0;
                      const costPrice = form.getValues('unit_price') || 0;
                      const sellingPrice = Math.round(costPrice * (1 + markup / 100));
                      form.setValue('selling_price', sellingPrice);
                    }}
                  />
                </div>
              </div>
              <FormField
                control={form.control}
                name="selling_price"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        placeholder="Or enter fixed selling price"
                        {...field} 
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Supplier Section - Only for new medications */}
            {!isEditing && (
              <>
                <Separator />
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" className="w-full justify-between gap-2 p-0 h-auto">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <Truck className="h-4 w-4" />
                        Link Suppliers (Optional)
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {supplierEntries.length} added
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-3">
                    {/* Added suppliers */}
                    {supplierEntries.length > 0 && (
                      <div className="space-y-2">
                        {supplierEntries.map((entry, index) => (
                          <Card key={index} className="p-2 flex items-center justify-between gap-2">
                            <div className="flex-1">
                              <span className="font-medium text-sm">{entry.name}</span>
                              {entry.isNew && (
                                <Badge variant="outline" className="ml-2 text-xs">New</Badge>
                              )}
                            </div>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={entry.unit_price}
                              onChange={(e) => updateSupplierPrice(index, parseFloat(e.target.value) || 0)}
                              className="w-24 h-8"
                              placeholder="Price"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSupplierEntry(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Add existing supplier */}
                    <div className="flex gap-2">
                      <Select value={selectedExistingSupplier} onValueChange={setSelectedExistingSupplier}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select existing supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeSuppliers
                            .filter(s => !supplierEntries.some(e => e.id === s.id))
                            .map(supplier => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddExistingSupplier}
                        disabled={!selectedExistingSupplier}
                      >
                        Add
                      </Button>
                    </div>

                    {/* Add new supplier */}
                    {!showSupplierForm ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full gap-1 text-xs"
                        onClick={() => setShowSupplierForm(true)}
                      >
                        <Plus className="h-3 w-3" />
                        Add New Supplier
                      </Button>
                    ) : (
                      <Card className="p-3 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Supplier name"
                            value={newSupplier.name}
                            onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="Price"
                            value={newSupplier.unit_price || ''}
                            onChange={(e) => setNewSupplier({ ...newSupplier, unit_price: parseFloat(e.target.value) || 0 })}
                            className="w-24"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddNewSupplier}
                            disabled={!newSupplier.name}
                          >
                            Add Supplier
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowSupplierForm(false);
                              setNewSupplier({ name: '', unit_price: 0, lead_time_days: 3 });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </Card>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

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