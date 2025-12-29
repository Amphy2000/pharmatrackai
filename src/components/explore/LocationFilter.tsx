import { useState, useMemo } from 'react';
import { MapPin, ChevronDown, X, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { NIGERIAN_STATES, MAJOR_NEIGHBORHOODS, searchLocations } from '@/data/nigerianLocations';

export interface LocationSelection {
  state: string | null;
  lga: string | null;
  neighborhood: string | null;
}

interface LocationFilterProps {
  selectedLocation: LocationSelection;
  onLocationChange: (location: LocationSelection) => void;
  className?: string;
}

export const LocationFilter = ({
  selectedLocation,
  onLocationChange,
  className,
}: LocationFilterProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'states' | 'lgas' | 'neighborhoods'>('states');
  const [tempState, setTempState] = useState<string | null>(selectedLocation.state);

  // Get current state data
  const currentStateData = useMemo(() => {
    if (!tempState) return null;
    return NIGERIAN_STATES.find(s => s.name === tempState);
  }, [tempState]);

  // Get neighborhoods for current state
  const currentNeighborhoods = useMemo(() => {
    if (!tempState) return [];
    return MAJOR_NEIGHBORHOODS[tempState] || [];
  }, [tempState]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchLocations(searchQuery, 15);
  }, [searchQuery]);

  // Filter states by search
  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return NIGERIAN_STATES;
    return NIGERIAN_STATES.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Get display label
  const getDisplayLabel = () => {
    if (selectedLocation.neighborhood) {
      return selectedLocation.neighborhood;
    }
    if (selectedLocation.lga) {
      return selectedLocation.lga;
    }
    if (selectedLocation.state) {
      return selectedLocation.state;
    }
    return 'All Nigeria';
  };

  const handleStateSelect = (stateName: string) => {
    setTempState(stateName);
    setView('lgas');
    setSearchQuery('');
  };

  const handleLGASelect = (lgaName: string) => {
    onLocationChange({
      state: tempState,
      lga: lgaName,
      neighborhood: null,
    });
    setOpen(false);
    setSearchQuery('');
    setView('states');
  };

  const handleNeighborhoodSelect = (neighborhood: string) => {
    onLocationChange({
      state: tempState,
      lga: selectedLocation.lga,
      neighborhood,
    });
    setOpen(false);
    setSearchQuery('');
    setView('states');
  };

  const handleStateOnly = () => {
    onLocationChange({
      state: tempState,
      lga: null,
      neighborhood: null,
    });
    setOpen(false);
    setSearchQuery('');
    setView('states');
  };

  const handleClear = () => {
    onLocationChange({
      state: null,
      lga: null,
      neighborhood: null,
    });
    setTempState(null);
    setOpen(false);
    setSearchQuery('');
    setView('states');
  };

  const handleSearchResultClick = (result: { type: 'state' | 'lga' | 'neighborhood'; name: string; state?: string }) => {
    if (result.type === 'state') {
      handleStateSelect(result.name);
    } else if (result.type === 'lga' && result.state) {
      setTempState(result.state);
      onLocationChange({
        state: result.state,
        lga: result.name,
        neighborhood: null,
      });
      setOpen(false);
      setSearchQuery('');
      setView('states');
    } else if (result.type === 'neighborhood' && result.state) {
      setTempState(result.state);
      onLocationChange({
        state: result.state,
        lga: null,
        neighborhood: result.name,
      });
      setOpen(false);
      setSearchQuery('');
      setView('states');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 text-xs rounded-full border-border bg-background hover:bg-accent px-3",
            selectedLocation.state && "border-marketplace/50 bg-marketplace/5",
            className
          )}
        >
          <MapPin className="h-3.5 w-3.5 text-marketplace" />
          <span className="max-w-[100px] truncate">{getDisplayLabel()}</span>
          {selectedLocation.state && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {!selectedLocation.state && <ChevronDown className="h-3 w-3 ml-0.5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search state, LGA, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery.trim() && searchResults.length > 0 ? (
          <ScrollArea className="h-64">
            <div className="p-2">
              {searchResults.map((result, idx) => (
                <button
                  key={`${result.type}-${result.name}-${idx}`}
                  onClick={() => handleSearchResultClick(result)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg text-left"
                >
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-1.5",
                      result.type === 'state' && "bg-primary/10 text-primary border-primary/30",
                      result.type === 'lga' && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                      result.type === 'neighborhood' && "bg-green-500/10 text-green-600 border-green-500/30"
                    )}
                  >
                    {result.type === 'state' ? 'State' : result.type === 'lga' ? 'LGA' : 'Area'}
                  </Badge>
                  <span className="flex-1 truncate">{result.name}</span>
                  {result.state && (
                    <span className="text-xs text-muted-foreground">{result.state}</span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : searchQuery.trim() && searchResults.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No locations found for "{searchQuery}"
          </div>
        ) : (
          <>
            {/* Breadcrumb Navigation */}
            <div className="px-3 py-2 border-b flex items-center gap-1 text-xs">
              <button 
                onClick={() => { setView('states'); setTempState(null); setSearchQuery(''); }}
                className={cn(
                  "hover:text-foreground transition-colors",
                  view === 'states' ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                Nigeria
              </button>
              {tempState && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <button 
                    onClick={() => { setView('lgas'); setSearchQuery(''); }}
                    className={cn(
                      "hover:text-foreground transition-colors",
                      view === 'lgas' ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    {tempState}
                  </button>
                </>
              )}
              {currentNeighborhoods.length > 0 && view === 'neighborhoods' && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-foreground font-medium">Areas</span>
                </>
              )}
            </div>

            <ScrollArea className="h-64">
              <div className="p-2">
                {/* States View */}
                {view === 'states' && (
                  <>
                    <button
                      onClick={handleClear}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-lg"
                    >
                      <span>All Nigeria</span>
                      {!selectedLocation.state && <Check className="h-4 w-4 text-marketplace" />}
                    </button>
                    {filteredStates.map((state) => (
                      <button
                        key={state.name}
                        onClick={() => handleStateSelect(state.name)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-lg"
                      >
                        <span>{state.name}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
                      </button>
                    ))}
                  </>
                )}

                {/* LGAs View */}
                {view === 'lgas' && currentStateData && (
                  <>
                    <button
                      onClick={handleStateOnly}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-lg font-medium text-marketplace"
                    >
                      <span>All {tempState}</span>
                      {selectedLocation.state === tempState && !selectedLocation.lga && (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                    
                    {currentNeighborhoods.length > 0 && (
                      <button
                        onClick={() => setView('neighborhoods')}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-lg text-green-600"
                      >
                        <span>Popular Areas in {tempState}</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </button>
                    )}
                    
                    <div className="my-2 px-3">
                      <div className="text-xs text-muted-foreground font-medium">Local Government Areas</div>
                    </div>
                    
                    {currentStateData.lgas.map((lga) => (
                      <button
                        key={lga}
                        onClick={() => handleLGASelect(lga)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-lg"
                      >
                        <span>{lga}</span>
                        {selectedLocation.lga === lga && (
                          <Check className="h-4 w-4 text-marketplace" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Neighborhoods View */}
                {view === 'neighborhoods' && currentNeighborhoods.length > 0 && (
                  <>
                    <button
                      onClick={() => setView('lgas')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg text-muted-foreground"
                    >
                      <ChevronDown className="h-4 w-4 rotate-90" />
                      <span>Back to LGAs</span>
                    </button>
                    
                    <div className="my-2 px-3">
                      <div className="text-xs text-muted-foreground font-medium">Popular Areas</div>
                    </div>
                    
                    {currentNeighborhoods.map((neighborhood) => (
                      <button
                        key={neighborhood}
                        onClick={() => handleNeighborhoodSelect(neighborhood)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-lg"
                      >
                        <span>{neighborhood}</span>
                        {selectedLocation.neighborhood === neighborhood && (
                          <Check className="h-4 w-4 text-marketplace" />
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
