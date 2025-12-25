import { Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBranches } from '@/hooks/useBranches';
import { useBranchContext } from '@/contexts/BranchContext';

interface BranchFilterProps {
  value: string;
  onChange: (branchId: string) => void;
  showLabel?: boolean;
}

export const BranchFilter = ({ value, onChange, showLabel = true }: BranchFilterProps) => {
  const { branches, isLoading } = useBranches();

  // Only show if there are multiple branches
  if (isLoading || branches.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-sm text-muted-foreground hidden sm:inline">Filter by:</span>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <Building2 className="h-3.5 w-3.5 mr-1.5" />
          <SelectValue placeholder="All Branches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Branches</SelectItem>
          {branches.filter(b => b.is_active).map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
