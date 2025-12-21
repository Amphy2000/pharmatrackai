import { useState } from 'react';
import { format } from 'date-fns';
import { 
  FileText, RefreshCw, Clock, CheckCircle, XCircle, 
  AlertTriangle, Pill, User, Calendar, MoreVertical, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { AddPrescriptionModal } from './AddPrescriptionModal';
import type { Customer, Prescription } from '@/types/customer';

interface CustomerPrescriptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
}

const statusConfig = {
  active: { label: 'Active', icon: CheckCircle, className: 'bg-success/20 text-success' },
  completed: { label: 'Completed', icon: CheckCircle, className: 'bg-muted text-muted-foreground' },
  expired: { label: 'Expired', icon: AlertTriangle, className: 'bg-destructive/20 text-destructive' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'bg-muted text-muted-foreground' },
};

export const CustomerPrescriptionsModal = ({ open, onOpenChange, customer }: CustomerPrescriptionsModalProps) => {
  const { prescriptions, isLoading, recordRefill, updatePrescription, deletePrescription } = usePrescriptions(customer.id);
  const [addPrescriptionOpen, setAddPrescriptionOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleRecordRefill = async (prescriptionId: string) => {
    await recordRefill.mutateAsync(prescriptionId);
  };

  const handleStatusChange = async (prescriptionId: string, status: Prescription['status']) => {
    await updatePrescription.mutateAsync({ id: prescriptionId, status });
  };

  const handleDelete = async (id: string) => {
    await deletePrescription.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Prescriptions
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {customer.full_name}
              {customer.phone && <span>• {customer.phone}</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setAddPrescriptionOpen(true)} className="gap-2">
                <FileText className="h-4 w-4" />
                New Prescription
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No prescriptions yet</h3>
                <p className="text-muted-foreground">Create a new prescription for this customer</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {prescriptions.map(prescription => {
                  const status = statusConfig[prescription.status];
                  const StatusIcon = status.icon;
                  const canRefill = prescription.status === 'active' && prescription.refill_count < prescription.max_refills;

                  return (
                    <AccordionItem 
                      key={prescription.id} 
                      value={prescription.id}
                      className="border rounded-xl px-4 bg-card"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-4 flex-1 text-left">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{prescription.prescription_number}</span>
                              <Badge className={status.className}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(prescription.issue_date), 'MMM d, yyyy')}
                              </span>
                              <span className="flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                {prescription.refill_count}/{prescription.max_refills} refills
                              </span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-4">
                          {/* Prescription Details */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {prescription.prescriber_name && (
                              <div>
                                <span className="text-muted-foreground">Prescriber:</span>
                                <p className="font-medium">{prescription.prescriber_name}</p>
                              </div>
                            )}
                            {prescription.diagnosis && (
                              <div>
                                <span className="text-muted-foreground">Diagnosis:</span>
                                <p className="font-medium">{prescription.diagnosis}</p>
                              </div>
                            )}
                            {prescription.expiry_date && (
                              <div>
                                <span className="text-muted-foreground">Expires:</span>
                                <p className="font-medium">{format(new Date(prescription.expiry_date), 'MMM d, yyyy')}</p>
                              </div>
                            )}
                            {prescription.last_refill_date && (
                              <div>
                                <span className="text-muted-foreground">Last Refill:</span>
                                <p className="font-medium">{format(new Date(prescription.last_refill_date), 'MMM d, yyyy')}</p>
                              </div>
                            )}
                          </div>

                          {/* Medications */}
                          {prescription.items && prescription.items.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium flex items-center gap-2">
                                <Pill className="h-4 w-4 text-primary" />
                                Medications
                              </h4>
                              <div className="space-y-2">
                                {prescription.items.map(item => (
                                  <div key={item.id} className="p-3 rounded-lg bg-muted/50 text-sm">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium">{item.medication_name}</p>
                                        <p className="text-muted-foreground">
                                          {item.dosage} • {item.frequency}
                                          {item.duration && ` • ${item.duration}`}
                                        </p>
                                      </div>
                                      <Badge variant="outline">Qty: {item.quantity}</Badge>
                                    </div>
                                    {item.instructions && (
                                      <p className="text-xs text-muted-foreground mt-1 italic">
                                        {item.instructions}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {prescription.notes && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Notes:</span>
                              <p>{prescription.notes}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t">
                            {canRefill && (
                              <Button 
                                size="sm" 
                                onClick={() => handleRecordRefill(prescription.id)}
                                disabled={recordRefill.isPending}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Record Refill
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {prescription.status === 'active' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(prescription.id, 'completed')}>
                                    Mark as Completed
                                  </DropdownMenuItem>
                                )}
                                {prescription.status !== 'cancelled' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(prescription.id, 'cancelled')}>
                                    Cancel Prescription
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirmId(prescription.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddPrescriptionModal
        open={addPrescriptionOpen}
        onOpenChange={setAddPrescriptionOpen}
        customer={customer}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prescription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this prescription and all its medication records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
