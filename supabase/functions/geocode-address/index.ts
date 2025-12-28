import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeResult {
  formatted_address: string;
  latitude: number;
  longitude: number;
  place_id: string;
  address_components: {
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    street?: string;
    street_number?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, placeId } = await req.json();
    
    if (!address && !placeId) {
      return new Response(
        JSON.stringify({ error: 'Address or placeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Geocoding service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let url: string;
    
    if (placeId) {
      // Geocode by place_id (from Places Autocomplete)
      url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`;
    } else {
      // Geocode by address string
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    }

    console.log(`Geocoding request for: ${placeId ? `placeId=${placeId}` : `address=${address}`}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Geocoding failed:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ 
          error: 'Unable to geocode address', 
          status: data.status,
          message: data.error_message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data.results[0];
    
    // Parse address components
    const addressComponents: GeocodeResult['address_components'] = {};
    
    for (const component of result.address_components || []) {
      const types = component.types || [];
      
      if (types.includes('street_number')) {
        addressComponents.street_number = component.long_name;
      }
      if (types.includes('route')) {
        addressComponents.street = component.long_name;
      }
      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        addressComponents.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        addressComponents.state = component.long_name;
      }
      if (types.includes('country')) {
        addressComponents.country = component.long_name;
      }
      if (types.includes('postal_code')) {
        addressComponents.postal_code = component.long_name;
      }
    }

    const geocodeResult: GeocodeResult = {
      formatted_address: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      place_id: result.place_id,
      address_components: addressComponents,
    };

    console.log('Geocoding successful:', geocodeResult.formatted_address);

    return new Response(
      JSON.stringify(geocodeResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Geocoding error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
