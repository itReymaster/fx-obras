export interface AddressResult {
  street?: string;
  district?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface GeocodingService {
  reverseGeocode(latitude: number, longitude: number): Promise<AddressResult>;
}

export class MockGeocodingService implements GeocodingService {
  async reverseGeocode(_latitude: number, _longitude: number): Promise<AddressResult> {
    return {};
  }
}
