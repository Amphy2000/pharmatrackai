// Utility for generating and validating location QR codes

export const generateLocationQRCode = (pharmacyId: string, pharmacyName: string): string => {
  const timestamp = Date.now();
  const data = {
    type: 'PHARMAT_LOCATION',
    pharmacyId,
    pharmacyName,
    generatedAt: timestamp,
  };
  return btoa(JSON.stringify(data));
};

export const validateLocationQRCode = (
  scannedData: string, 
  expectedPharmacyId: string
): { isValid: boolean; message: string } => {
  try {
    const decoded = JSON.parse(atob(scannedData));
    
    if (decoded.type !== 'PHARMAT_LOCATION') {
      return { isValid: false, message: 'Invalid QR code type' };
    }
    
    if (decoded.pharmacyId !== expectedPharmacyId) {
      return { isValid: false, message: 'QR code is for a different pharmacy' };
    }
    
    return { isValid: true, message: 'Location verified successfully!' };
  } catch (error) {
    return { isValid: false, message: 'Invalid QR code format' };
  }
};

export const parseLocationQRCode = (scannedData: string): { 
  pharmacyId?: string; 
  pharmacyName?: string;
  generatedAt?: number;
} | null => {
  try {
    const decoded = JSON.parse(atob(scannedData));
    if (decoded.type === 'PHARMAT_LOCATION') {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
};
