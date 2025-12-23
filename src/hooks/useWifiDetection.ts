import { useState, useEffect, useCallback } from 'react';

interface NetworkInfo {
  ssid: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface WifiVerificationResult {
  isVerified: boolean;
  wifiName: string | null;
  matchesShopWifi: boolean;
}

// Note: Direct WiFi SSID detection is not available in standard web browsers for security reasons.
// This hook uses the Network Information API where available, but for actual WiFi name detection,
// we simulate based on network connectivity and rely on user confirmation or QR fallback.
export const useWifiDetection = (shopWifiName: string | null) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    ssid: null,
    isConnected: navigator.onLine,
    isLoading: true,
    error: null,
  });

  // Check network connectivity
  useEffect(() => {
    const updateOnlineStatus = () => {
      setNetworkInfo(prev => ({
        ...prev,
        isConnected: navigator.onLine,
      }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Try to get network info if available (experimental API)
    const checkNetworkInfo = async () => {
      try {
        // @ts-ignore - NetworkInformation API is experimental
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
          setNetworkInfo(prev => ({
            ...prev,
            isLoading: false,
            // We can't get SSID directly, but we know we're connected
            ssid: connection.type === 'wifi' ? 'WiFi Connected' : null,
          }));
        } else {
          // For browsers that support neither, we'll use the fallback approach
          setNetworkInfo(prev => ({
            ...prev,
            isLoading: false,
          }));
        }
      } catch (error) {
        setNetworkInfo(prev => ({
          ...prev,
          isLoading: false,
          error: 'WiFi detection not supported',
        }));
      }
    };

    checkNetworkInfo();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // For PWA/mobile apps, we can use a workaround:
  // Ask the user to confirm they're on shop WiFi, or use QR fallback
  const simulateWifiCheck = useCallback((): WifiVerificationResult => {
    if (!shopWifiName) {
      // No shop WiFi configured - allow clock-in
      return {
        isVerified: true,
        wifiName: null,
        matchesShopWifi: true,
      };
    }

    // In a real implementation with native app capabilities,
    // we would check the actual SSID here
    // For web, we return the connected status and let the UI handle verification
    return {
      isVerified: networkInfo.isConnected,
      wifiName: networkInfo.isConnected ? 'Connected Network' : null,
      matchesShopWifi: false, // Web can't verify this - needs QR fallback or user confirmation
    };
  }, [shopWifiName, networkInfo.isConnected]);

  // Capture current network name (for admin setup)
  const captureCurrentWifi = useCallback(async (): Promise<string | null> => {
    // In a real PWA with native capabilities, this would return the actual SSID
    // For web browsers, we'll prompt the user to enter it manually
    // This is a limitation of web browsers for security reasons
    
    if (navigator.onLine) {
      // Return a placeholder - the UI will prompt for manual entry
      return 'CURRENT_WIFI';
    }
    return null;
  }, []);

  return {
    networkInfo,
    simulateWifiCheck,
    captureCurrentWifi,
    isWifiVerificationSupported: false, // Web browsers can't directly read SSID
    requiresManualEntry: true,
  };
};
