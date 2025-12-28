import { useState } from 'react';
import { Filter, MapPin, ArrowUpDown, Package, DollarSign, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export type DistanceRadius = 1 | 5 | 10 | 'all';
export type SortOption = 'distance' | 'price-low' | 'price-high' | 'availability';

interface DistanceFilterProps {
  selectedRadius: DistanceRadius;
  selectedSort: SortOption;
  onRadiusChange: (radius: DistanceRadius) => void;
  onSortChange: (sort: SortOption) => void;
  locationEnabled: boolean;
  onEnableLocation?: () => void;
}

export const DistanceFilter = ({
  selectedRadius,
  selectedSort,
  onRadiusChange,
  onSortChange,
  locationEnabled,
  onEnableLocation,
}: DistanceFilterProps) => {
  const radiusOptions: { value: DistanceRadius; label: string }[] = [
    { value: 1, label: '1 km' },
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 'all', label: 'All distances' },
  ];

  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'distance', label: 'Nearest first', icon: <Navigation className="h-3.5 w-3.5" /> },
    { value: 'price-low', label: 'Price: Low to High', icon: <DollarSign className="h-3.5 w-3.5" /> },
    { value: 'price-high', label: 'Price: High to Low', icon: <DollarSign className="h-3.5 w-3.5" /> },
    { value: 'availability', label: 'Most in stock', icon: <Package className="h-3.5 w-3.5" /> },
  ];

  const getRadiusLabel = () => {
    if (selectedRadius === 'all') return 'All';
    return `${selectedRadius}km`;
  };

  const getSortLabel = () => {
    const option = sortOptions.find(o => o.value === selectedSort);
    return option?.label || 'Sort';
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Distance Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs rounded-full border-muted-foreground/20 hover:border-marketplace hover:bg-marketplace/5"
          >
            <MapPin className="h-3.5 w-3.5 text-marketplace" />
            <span>{getRadiusLabel()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Filter by Distance
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!locationEnabled && (
            <>
              <DropdownMenuItem 
                onClick={onEnableLocation}
                className="text-xs gap-2 text-marketplace"
              >
                <Navigation className="h-3.5 w-3.5" />
                Enable Location
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {radiusOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onRadiusChange(option.value)}
              className="text-xs gap-2"
            >
              <div className={`h-2 w-2 rounded-full ${selectedRadius === option.value ? 'bg-marketplace' : 'bg-muted'}`} />
              {option.label}
              {selectedRadius === option.value && (
                <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0">
                  Active
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs rounded-full border-muted-foreground/20 hover:border-primary hover:bg-primary/5"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">{getSortLabel()}</span>
            <span className="sm:hidden">Sort</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Sort Results By
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className="text-xs gap-2"
              disabled={option.value === 'distance' && !locationEnabled}
            >
              {option.icon}
              {option.label}
              {selectedSort === option.value && (
                <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0">
                  Active
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
