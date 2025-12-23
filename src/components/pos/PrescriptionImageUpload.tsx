import { useState, useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast({
        title: 'Too many images',
        description: `Maximum ${maxImages} images allowed`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    const newImages: string[] = [];

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
        const filePath = `prescriptions/${fileName}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('pharmacy-logos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('pharmacy-logos')
          .getPublicUrl(filePath);

        newImages.push(publicUrl);
      }

      onImagesChange([...images, ...newImages]);
      toast({
        title: 'Upload successful',
        description: `${newImages.length} image(s) uploaded`,
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

  const removeImage = (index: number) => {
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
          {images.map((url, index) => (
            <div 
              key={index} 
              className="relative h-16 w-16 rounded-lg overflow-hidden border border-border/50 group"
            >
              <img 
                src={url} 
                alt={`Prescription ${index + 1}`} 
                className="h-full w-full object-cover"
              />
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
          disabled={isUploading}
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
