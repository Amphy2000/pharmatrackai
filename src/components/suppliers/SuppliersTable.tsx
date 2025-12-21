import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreHorizontal, Phone, Mail, Globe } from 'lucide-react';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { Supplier } from '@/types/supplier';

interface SuppliersTableProps {
  onEdit?: (supplier: Supplier) => void;
}

export const SuppliersTable = ({ onEdit }: SuppliersTableProps) => {
  const { suppliers, deleteSupplier, isLoading } = useSuppliers();

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading suppliers...</div>;
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No suppliers yet. Add your first supplier to get started.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supplier Name</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Contact Info</TableHead>
            <TableHead>Payment Terms</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="font-medium">{supplier.name}</TableCell>
              <TableCell>{supplier.contact_person || '-'}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 text-sm">
                  {supplier.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {supplier.phone}
                    </span>
                  )}
                  {supplier.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {supplier.email}
                    </span>
                  )}
                  {supplier.website && (
                    <a 
                      href={supplier.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="h-3 w-3" /> Website
                    </a>
                  )}
                </div>
              </TableCell>
              <TableCell>{supplier.payment_terms || '-'}</TableCell>
              <TableCell>
                <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                  {supplier.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(supplier)}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteSupplier.mutate(supplier.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
