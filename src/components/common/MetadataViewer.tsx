import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Database, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  MessageSquarePlus,
  Search 
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';
import { useToast } from '@/hooks/use-toast';

interface MetadataViewerProps {
  metadata: Record<string, any> | null;
  entityType: 'medication' | 'customer' | 'doctor';
  entityId: string;
  entityName?: string;
}

export const MetadataViewer = ({ 
  metadata, 
  entityType, 
  entityId,
  entityName 
}: MetadataViewerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<{ key: string; value: string } | null>(null);
  const [requestNotes, setRequestNotes] = useState('');
  const { createFeatureRequest } = useFeatureRequests();
  const { toast } = useToast();

  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  const entries = Object.entries(metadata).filter(([_, value]) => value !== null && value !== '');

  if (entries.length === 0) return null;

  const handleFeatureRequest = async () => {
    if (!selectedField) return;

    try {
      await createFeatureRequest.mutateAsync({
        field_name: selectedField.key,
        field_value: selectedField.value,
        entity_type: entityType,
        entity_id: entityId,
        notes: requestNotes || `User requested to turn "${selectedField.key}" into a dedicated feature for ${entityType}s. Sample value: "${selectedField.value}"`,
      });
      
      setFeatureDialogOpen(false);
      setSelectedField(null);
      setRequestNotes('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit feature request',
        variant: 'destructive',
      });
    }
  };

  const openFeatureDialog = (key: string, value: string) => {
    setSelectedField({ key, value });
    setFeatureDialogOpen(true);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-between gap-2 text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Extended Records ({entries.length})
            </span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-3">
          <Card className="border-dashed border-border/50 bg-muted/20">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Additional Data from Import
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {entries.map(([key, value]) => (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="px-3 py-1.5 text-xs font-normal cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => openFeatureDialog(key, String(value))}
                  >
                    <span className="font-medium text-foreground">{key}:</span>
                    <span className="ml-1 text-muted-foreground truncate max-w-[150px]">
                      {String(value)}
                    </span>
                  </Badge>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                <Search className="h-3 w-3" />
                This data is searchable via global search
              </p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              Turn into Dedicated Feature?
            </DialogTitle>
            <DialogDescription>
              Request to make "{selectedField?.key}" a standard field in the app for all {entityType}s.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm">
                <span className="font-medium">{selectedField?.key}:</span>{' '}
                <span className="text-muted-foreground">{selectedField?.value}</span>
              </p>
              {entityName && (
                <p className="text-xs text-muted-foreground mt-1">
                  From: {entityName}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Additional notes (optional)
              </label>
              <Textarea
                placeholder="Why would this be useful as a dedicated feature?"
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeatureDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleFeatureRequest}
              disabled={createFeatureRequest.isPending}
              className="gap-2"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
