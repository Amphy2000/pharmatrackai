import { MessageCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface RequestDrugButtonProps {
  searchQuery: string;
}

const ADMIN_WHATSAPP = '2349169153129';

export const RequestDrugButton = ({ searchQuery }: RequestDrugButtonProps) => {
  const handleRequestDrug = () => {
    const message = encodeURIComponent(
      `Hello PharmaTrack Admin! I searched for "${searchQuery}" but couldn't find it. Can you help me locate a pharmacy that has it in stock?`
    );
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${message}`, '_blank');
  };

  return (
    <Card className="border-dashed border-2 border-marketplace/30 bg-marketplace/5">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <AlertCircle className="h-12 w-12 text-marketplace mb-4" />
        <h3 className="font-semibold text-lg mb-2">Can't find what you need?</h3>
        <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
          We'll help you find a pharmacy with "{searchQuery}" in stock. Our team will search across our network and get back to you.
        </p>
        <Button
          onClick={handleRequestDrug}
          className="bg-marketplace hover:bg-marketplace/90 text-marketplace-foreground gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          Request This Drug
        </Button>
      </CardContent>
    </Card>
  );
};
