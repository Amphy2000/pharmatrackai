import { useState } from 'react';
import { useFeatureRequests, FeatureRequest } from '@/hooks/useFeatureRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Lightbulb, 
  Check, 
  X, 
  Clock, 
  ChevronRight,
  MessageSquare,
  Package,
  Users,
  UserRound
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const entityIcons: Record<string, React.ReactNode> = {
  medication: <Package className="h-4 w-4" />,
  customer: <Users className="h-4 w-4" />,
  doctor: <UserRound className="h-4 w-4" />,
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  reviewed: { label: 'Reviewed', variant: 'outline', icon: <MessageSquare className="h-3 w-3" /> },
  implemented: { label: 'Implemented', variant: 'default', icon: <Check className="h-3 w-3" /> },
  dismissed: { label: 'Dismissed', variant: 'destructive', icon: <X className="h-3 w-3" /> },
};

export const FeatureRequestsPanel = () => {
  const { featureRequests, pendingCount, updateFeatureRequest, isLoading } = useFeatureRequests();
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const handleUpdateStatus = async (status: string) => {
    if (!selectedRequest) return;
    
    await updateFeatureRequest.mutateAsync({
      id: selectedRequest.id,
      status,
      notes: adminNotes || selectedRequest.notes,
    });
    
    setDialogOpen(false);
    setSelectedRequest(null);
    setAdminNotes('');
  };

  const openDialog = (request: FeatureRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.notes || '');
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 text-center">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (featureRequests.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Feature Requests
          </CardTitle>
          <CardDescription>
            Requests from users to add new features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No feature requests yet</p>
            <p className="text-sm">Requests from imported metadata will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Feature Requests
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingCount} new
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                User requests to turn metadata into features
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {featureRequests.map((request) => {
                const status = statusConfig[request.status] || statusConfig.pending;
                
                return (
                  <div
                    key={request.id}
                    className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
                    onClick={() => openDialog(request)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {entityIcons[request.entity_type]}
                          <span className="font-medium text-sm truncate">
                            {request.field_name}
                          </span>
                        </div>
                        {request.field_value && (
                          <p className="text-xs text-muted-foreground truncate mb-2">
                            Sample: "{request.field_value}"
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant={status.variant} className="gap-1">
                            {status.icon}
                            {status.label}
                          </Badge>
                          <span>•</span>
                          <span>{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Feature Request Details</DialogTitle>
            <DialogDescription>
              Review and update the status of this request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Field Name</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.field_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Entity Type</p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedRequest.entity_type}</p>
                </div>
              </div>

              {selectedRequest.field_value && (
                <div>
                  <p className="text-sm font-medium mb-1">Sample Value</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    {selectedRequest.field_value}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Requested</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedRequest.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Admin Notes</label>
                <Textarea
                  placeholder="Add notes about this request..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleUpdateStatus('dismissed')}
              disabled={updateFeatureRequest.isPending}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Dismiss
            </Button>
            <Button
              variant="outline"
              onClick={() => handleUpdateStatus('reviewed')}
              disabled={updateFeatureRequest.isPending}
              className="gap-1"
            >
              <MessageSquare className="h-4 w-4" />
              Mark Reviewed
            </Button>
            <Button
              onClick={() => handleUpdateStatus('implemented')}
              disabled={updateFeatureRequest.isPending}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              Mark Implemented
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
