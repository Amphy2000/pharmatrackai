import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { usePharmacy } from '@/hooks/usePharmacy';

interface PrescriptionImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export const PrescriptionImageUpload = ({ 
  images, 
  onImagesChange,
  maxImages = 3 
}: PrescriptionImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { pharmacy } = usePharmacy();

  // Generate signed URLs for displaying private images
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (images.length === 0) {
        setSignedUrls({});
        return;
      }

      const newSignedUrls: Record<string, string> = {};
      
      for (const storagePath of images) {
        // Skip if we already have a signed URL for this path
        if (signedUrls[storagePath]) {
          newSignedUrls[storagePath] = signedUrls[storagePath];
          continue;
        }

        try {
          const { data, error } = await supabase.storage
            .from('prescriptions')
            .createSignedUrl(storagePath, 3600); // 1 hour expiry

          if (data?.signedUrl) {
            newSignedUrls[storagePath] = data.signedUrl;
          }
        } catch (error) {
          console.error('Failed to generate signed URL:', error);
        }
      }

      setSignedUrls(newSignedUrls);
    };

    generateSignedUrls();
  }, [images]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!pharmacy?.id) {
      toast({
        title: 'Error',
        description: 'No pharmacy associated with your account',
        variant: 'destructive',
      });
      return;
    }

    if (images.length + files.length > maxImages) {
      toast({
        title: 'Too many images',
        description: `Maximum ${maxImages} images allowed`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    const newImagePaths: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid file',
            description: 'Please upload image files only',
            variant: 'destructive',
          });
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'File too large',
            description: 'Image must be less than 5MB',
            variant: 'destructive',
          });
          continue;
        }

        const fileName = `prescription-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const fileExt = file.name.split('.').pop();
        // Store in pharmacy-specific folder for RLS policy
        const filePath = `${pharmacy.id}/${fileName}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('prescriptions')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Store the storage path (not the full URL) for signed URL generation
        newImagePaths.push(filePath);
      }

      onImagesChange([...images, ...newImagePaths]);
      toast({
        title: 'Upload successful',
        description: `${newImagePaths.length} image(s) uploaded securely`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = async (index: number) => {
    const storagePath = images[index];
    
    // Try to delete from storage
    try {
      await supabase.storage
        .from('prescriptions')
        .remove([storagePath]);
    } catch (error) {
      console.error('Failed to delete image from storage:', error);
    }

    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        capture="environment"
      />

      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((storagePath, index) => (
            <div 
              key={index} 
              className="relative h-16 w-16 rounded-lg overflow-hidden border border-border/50 group"
            >
              {signedUrls[storagePath] ? (
                <img 
                  src={signedUrls[storagePath]} 
                  alt={`Prescription ${index + 1}`} 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => removeImage(index)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !pharmacy?.id}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              Attach Prescription Image
            </>
          )}
        </Button>
      )}

      {images.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {images.length}/{maxImages} images attached
        </p>
      )}
    </div>
  );
};
