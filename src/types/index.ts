export type DeviceType = 'streetlight' | 'wifi' | 'hydrant' | 'cctv' | 'busstop';
export type DeviceStatus = 'normal' | 'damaged' | 'repairing';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  lat: number;
  lng: number;
  status: DeviceStatus | string;
  department?: string;
  description?: string;
  rangeMeters?: number;
}

export interface Complaint {
  id: string;
  device_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
}