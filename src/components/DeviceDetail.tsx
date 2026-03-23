import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, MapPin } from 'lucide-react';
import ReportButton from '../ReportButton';

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Assuming mapDevices are passed or we use mock for now. Since App.tsx fetches them, we can pass mapDevices to DeviceDetail
interface DeviceDetailProps {
  devices: any[];
}

export const DeviceDetail: React.FC<DeviceDetailProps> = ({ devices }) => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [device, setDevice] = useState<any>(null);

  useEffect(() => {
    if (devices.length > 0) {
      const found = devices.find((d) => d.id === id && d.type === type);
      setDevice(found || null);
    }
  }, [id, type, devices]);

  useEffect(() => {
    if (!mapContainerRef.current || !device) return;

    const lat = typeof device.lat === 'number' ? device.lat : parseFloat(device.lat);
    const lng = typeof device.lng === 'number' ? device.lng : parseFloat(device.lng);

    if (isNaN(lat) || isNaN(lng)) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([lat, lng], 16);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
    } else {
      mapRef.current.setView([lat, lng], 16);
    }

    if (markerRef.current) {
      markerRef.current.remove();
    }

    const marker = L.marker([lat, lng]).addTo(mapRef.current);
    markerRef.current = marker;

    return () => {
      // Don't completely destroy on every re-render but cleanup on unmount
    };
  }, [device]);

  if (!device) {
    return (
      <div style={{ padding: '20px' }}>
        <button onClick={() => navigate('/')} style={{ cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', color: '#3b82f6', fontWeight: 'bold' }}>
          <ArrowLeft size={16} /> กลับสู่แผนที่หลัก
        </button>
        <div>{devices.length === 0 ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลอุปกรณ์นี้'}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      <button 
        onClick={() => navigate('/')} 
        style={{ cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: '#f1f5f9', padding: '8px 16px', borderRadius: '8px', color: '#3b82f6', fontWeight: 'bold' }}
      >
        <ArrowLeft size={16} /> กลับสู่แผนที่หลัก
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap:'8px' }}><MapPin size={24} color="#3b82f6" /> {device.name}</h2>
          <p style={{ color: '#6b7280', margin: '0 0 16px 0' }}>รหัส: {device.id} | ประเภท: {device.type}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <strong>สถานะ:</strong> <span style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#e2e8f0', fontSize: '14px' }}>{device.status}</span>
            </div>
            <div>
              <strong>หน่วยงาน:</strong> <span style={{ marginLeft: '8px' }}>{device.department || '-'}</span>
            </div>
            {device.description && (
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>รายละเอียด:</strong> {device.description}
              </div>
            )}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div ref={mapContainerRef} style={{ height: '350px', width: '100%' }} />
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>แจ้งปัญหาการใช้งาน</h3>
          <ReportButton 
            deviceId={device.id} 
            deviceName={device.name} 
            location={`${device.lat}, ${device.lng}`} 
            status={device.status} 
          />
        </div>
      </div>
    </div>
  );
};
