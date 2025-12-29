/**
 * Kaduna Neighborhoods with approximate coordinates for GPS snapping.
 * The app will calculate the distance to each and "snap" the user's GPS to the closest one.
 */

export interface NeighborhoodCoordinates {
  name: string;
  lat: number;
  lon: number;
  zone: 'central' | 'north' | 'south' | 'west';
}

export const KADUNA_NEIGHBORHOODS: NeighborhoodCoordinates[] = [
  // Central Zone
  { name: 'Doka (CBD)', lat: 10.5105, lon: 7.4283, zone: 'central' },
  { name: 'Magajin Gari', lat: 10.5159, lon: 7.4256, zone: 'central' },
  { name: 'Ahmadu Bello Way', lat: 10.5192, lon: 7.4306, zone: 'central' },
  { name: 'Tudun Wada', lat: 10.4890, lon: 7.4234, zone: 'central' },
  
  // North Zone
  { name: 'Kawo', lat: 10.5436, lon: 7.4247, zone: 'north' },
  { name: 'Malali', lat: 10.5678, lon: 7.4123, zone: 'north' },
  { name: 'Ungwan Rimi', lat: 10.5123, lon: 7.4567, zone: 'north' },
  { name: 'Ungwan Dosa', lat: 10.5289, lon: 7.4512, zone: 'north' },
  { name: 'Hayin Banki', lat: 10.5367, lon: 7.4189, zone: 'north' },
  { name: 'Badarawa', lat: 10.5512, lon: 7.4356, zone: 'north' },
  
  // South Zone
  { name: 'Barnawa', lat: 10.4678, lon: 7.4512, zone: 'south' },
  { name: 'Sabon Tasha', lat: 10.4234, lon: 7.4678, zone: 'south' },
  { name: 'Narayi', lat: 10.4456, lon: 7.4589, zone: 'south' },
  { name: 'Kakuri', lat: 10.4312, lon: 7.4234, zone: 'south' },
  { name: 'Makera', lat: 10.4567, lon: 7.4123, zone: 'south' },
  { name: 'Television', lat: 10.4789, lon: 7.4478, zone: 'south' },
  
  // West/New Zone
  { name: 'Rigasa', lat: 10.5234, lon: 7.3856, zone: 'west' },
  { name: 'Mando', lat: 10.5567, lon: 7.3934, zone: 'west' },
  { name: 'Millennium City', lat: 10.4923, lon: 7.3712, zone: 'west' },
  { name: 'Kamazou', lat: 10.5012, lon: 7.4012, zone: 'west' },
];

// Other major Nigerian city neighborhoods for future expansion
export const NIGERIAN_CITY_NEIGHBORHOODS: Record<string, NeighborhoodCoordinates[]> = {
  kaduna: KADUNA_NEIGHBORHOODS,
  lagos: [
    { name: 'Lagos Island', lat: 6.4541, lon: 3.4083, zone: 'central' },
    { name: 'Victoria Island', lat: 6.4281, lon: 3.4219, zone: 'central' },
    { name: 'Ikeja', lat: 6.6018, lon: 3.3515, zone: 'north' },
    { name: 'Lekki', lat: 6.4698, lon: 3.5852, zone: 'central' },
    { name: 'Surulere', lat: 6.5059, lon: 3.3509, zone: 'central' },
    { name: 'Yaba', lat: 6.5077, lon: 3.3792, zone: 'central' },
    { name: 'Ikoyi', lat: 6.4503, lon: 3.4286, zone: 'central' },
    { name: 'Ajah', lat: 6.4664, lon: 3.5753, zone: 'south' },
    { name: 'Ikorodu', lat: 6.6194, lon: 3.5105, zone: 'north' },
    { name: 'Festac', lat: 6.4653, lon: 3.2828, zone: 'west' },
  ],
  abuja: [
    { name: 'Garki', lat: 9.0579, lon: 7.4951, zone: 'central' },
    { name: 'Wuse', lat: 9.0765, lon: 7.4898, zone: 'central' },
    { name: 'Maitama', lat: 9.0863, lon: 7.5041, zone: 'central' },
    { name: 'Asokoro', lat: 9.0356, lon: 7.5322, zone: 'central' },
    { name: 'Gwarinpa', lat: 9.1071, lon: 7.4021, zone: 'north' },
    { name: 'Kubwa', lat: 9.1556, lon: 7.3259, zone: 'north' },
    { name: 'Jabi', lat: 9.0649, lon: 7.4271, zone: 'west' },
    { name: 'Lugbe', lat: 8.9823, lon: 7.3782, zone: 'south' },
  ],
  kano: [
    { name: 'Kano City', lat: 12.0022, lon: 8.5920, zone: 'central' },
    { name: 'Sabon Gari', lat: 12.0156, lon: 8.5234, zone: 'central' },
    { name: 'Fagge', lat: 11.9823, lon: 8.5456, zone: 'south' },
    { name: 'Nassarawa', lat: 11.9567, lon: 8.5123, zone: 'south' },
  ],
  'port-harcourt': [
    { name: 'Port Harcourt City', lat: 4.8156, lon: 7.0498, zone: 'central' },
    { name: 'GRA', lat: 4.8234, lon: 7.0234, zone: 'central' },
    { name: 'D-Line', lat: 4.8123, lon: 7.0123, zone: 'central' },
    { name: 'Rumuokoro', lat: 4.8567, lon: 6.9789, zone: 'north' },
  ],
};

/**
 * Get all neighborhoods for a given city
 */
export const getNeighborhoodsForCity = (city: string): NeighborhoodCoordinates[] => {
  return NIGERIAN_CITY_NEIGHBORHOODS[city.toLowerCase()] || KADUNA_NEIGHBORHOODS;
};

/**
 * Get all neighborhood names for a city
 */
export const getNeighborhoodNames = (city: string = 'kaduna'): string[] => {
  const neighborhoods = getNeighborhoodsForCity(city);
  return neighborhoods.map(n => n.name);
};
