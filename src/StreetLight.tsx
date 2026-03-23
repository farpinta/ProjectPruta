import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, MapPin, Calendar, RefreshCw, Box, User, Zap, Image as ImageIcon } from 'lucide-react';
import Papa from 'papaparse';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './durablearticles.css'; // ใช้ CSS กลาง
import { parseDeviceStatus, statusColors } from './status';
import ReportButton from './ReportButton';

// แก้ไขปัญหา default icon ของ Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 🛑 อย่าลืมเปลี่ยน Link CSV ใหม่ที่คุณเพิ่งทำเสร็จตรงนี้นะครับ
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQv7p9ib0xXet8Alyik_Fi9CdBVvZO8xz73K4k0wEoNqpwIWAKFGIfbk0IkE8knnp-LXvNA6OceINr1/pub?gid=0&single=true&output=csv';

// ข้อมูลสำรอง (โครงสร้างใหม่)
const fallbackData = [
  { 
    ASSET_ID: 'รอโหลด...', 
    ASSETOWNER: '-',
    LOCATION: '-', 
    MOO: '-',
    LAMP_TYPE: '-', 
    BULB_TYPE: '-',
    WATT: '-',
    STATUS: 'ปกติ', 
    LAT: 12.70, 
    LON: 100.90,
    IMG_DATE: '-'
  },
];

type Props = { selectedId?: string };

const StreetLight: React.FC<Props> = ({ selectedId }) => {
  const [lights, setLights] = useState<any[]>(fallbackData);
  const [selected, setSelected] = useState<any>(fallbackData[0]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const fetchData = () => {
    setLoading(true);
    Papa.parse(GOOGLE_SHEET_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const validData = results.data.filter((item: any) => item.ASSET_ID && item.ASSET_ID.trim() !== '');
        if (validData.length > 0) {
          setLights(validData);
          // If a selectedId was passed, try to find and select that item
          if (selectedId) {
            const found = validData.find((d: any) => d.ASSET_ID === selectedId);
            setSelected(found || validData[0]);
          } else {
            setSelected(validData[0]);
          }
        }
        setLoading(false);
      },
      error: (err) => {
        console.error("Error fetching data:", err);
        setLoading(false);
      }
    });
  };

  useEffect(() => { fetchData(); }, []);

  // สร้างและอัปเดตแผนที่เมื่อเลือกไฟส่องสว่างใหม่
  useEffect(() => {
    if (!mapContainerRef.current || !selected) return;

    const lat = selected.LAT ? parseFloat(selected.LAT) : null;
    const lng = selected.LON || selected.LNG ? parseFloat(selected.LON || selected.LNG) : null;

    // ถ้าไม่มีพิกัดที่ถูกต้อง ไม่ต้องแสดงแผนที่
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    // สร้างแผนที่ใหม่ ถ้ายังไม่มี
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([lat, lng], 16);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
    } else {
      // อัปเดตตำแหน่งแผนที่
      mapRef.current.setView([lat, lng], 16);
    }

    // ลบ marker เดิม
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // สร้าง custom icon สำหรับไฟส่องสว่าง
    const markerColor = statusColors[parseDeviceStatus(selected.STATUS)];
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-container" style="background-color: ${markerColor}">
          <span class="marker-icon">💡</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    // เพิ่ม marker ใหม่
    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapRef.current);
    markerRef.current = marker;

    // เพิ่ม popup
    const popupContent = `
      <div style="padding: 8px;">
        <h4 style="margin: 0 0 8px 0; font-size: 1rem; font-weight: 600;">
          💡 ${selected.ASSET_ID || '-'}
        </h4>
        <p style="margin: 4px 0; font-size: 0.875rem;">
          <strong>สถานที่:</strong> ${selected.LOCATION || '-'}
        </p>
        <p style="margin: 4px 0; font-size: 0.875rem;">
          <strong>พิกัด:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}
        </p>
        <p style="margin: 4px 0; font-size: 0.875rem;">
          <strong>สถานะ:</strong> ${selected.STATUS || '-'}
        </p>
      </div>
    `;
    marker.bindPopup(popupContent);

    // Cleanup เมื่อ component ถูก unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [selected]);

  const getStatusClass = (status: string) => {
    if (!status) return '';
    if (status.includes('ปกติ') || status.includes('ดี') || status.includes('Good')) return 'status-normal';
    if (status.includes('ชำรุด') || status.includes('เสีย')) return 'status-broken';
    if (status.includes('ซ่อม')) return 'status-fix';
    return '';
  };

  return (
    <div className="sl-container">
      <div className="sl-header">
        <div className="header-row">
            <div>
                <h2>ไฟส่องสว่าง</h2>
                <p>ฐานข้อมูลครุภัณฑ์ (จาก Google Sheets)</p>
            </div>
            <button 
                onClick={fetchData} 
                className="btn-update" 
                disabled={loading}
            >
                <RefreshCw size={16} className={loading ? 'spin-anim' : ''} /> 
                <span>{loading ? 'กำลังโหลด...' : 'อัปเดตข้อมูล'}</span>
            </button>
        </div>
      </div>

      <div className="sl-layout">
        
        {/* --- LEFT PANEL --- */}
        <div className="sl-panel">
          <div className="sl-panel-header">
            <Lightbulb size={20} color="#2563eb" />
            <h3>รายการ ({lights.length})</h3>
          </div>

          <div className="sl-list-content">
            {lights.map((item, index) => (
              <div 
                key={index}
                onClick={() => setSelected(item)}
                className={`sl-card ${selected?.ASSET_ID === item.ASSET_ID ? 'active' : ''}`}
              >
                <div className="sl-card-row">
                  <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <span className="sl-id">{item.ASSET_ID}</span>
                    <span className="sl-badge-type">{item.LAMP_TYPE}</span>
                  </div>
                  <span className={`sl-status ${getStatusClass(item.STATUS)}`}>
                    {item.STATUS}
                  </span>
                </div>
                <p className="sl-location">
                    {item.LOCATION} {item.MOO ? `(หมู่ ${item.MOO})` : ''}
                </p>
                <div className="sl-date">
                    <Calendar size={12} /><span>{item.IMG_DATE}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- RIGHT PANEL --- */}
        <div className="sl-panel">
          <div className="sl-panel-header">
            <MapPin size={20} color="#2563eb" />
            <h3>รายละเอียดครุภัณฑ์</h3>
          </div>

          <div className="sl-scrollable-content">
            <div className="sl-map-area" ref={mapContainerRef} style={{ height: '300px', width: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
            </div>

            <div className="sl-detail-box">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px'}}>
                    {selected?.ASSET_ID || '-'}
                    </h2>
                    <span className={`sl-status ${getStatusClass(selected?.STATUS)}`} style={{fontSize:'0.9rem', padding:'4px 12px'}}>
                        {selected?.STATUS || '-'}
                    </span>
                </div>
                
                <div className="sl-detail-grid">
                    {/* ข้อมูลทั่วไป */}
                    <div><span className="sl-field-label">เจ้าของครุภัณฑ์ (Owner)</span>
                        <p className="sl-field-value flex items-center gap-2"><User size={14}/> {selected?.ASSETOWNER || '-'}</p>
                    </div>
                    <div><span className="sl-field-label">สถานที่ตั้ง (Location)</span>
                        <p className="sl-field-value">{selected?.LOCATION || '-'} {selected?.MOO ? `หมู่ ${selected?.MOO}` : ''}</p>
                    </div>

                    {/* ข้อมูลเทคนิค */}
                    <div><span className="sl-field-label">ประเภทโคม (Lamp Type)</span>
                        <p className="sl-field-value">{selected?.LAMP_TYPE || '-'}</p>
                    </div>
                    <div><span className="sl-field-label">หลอดไฟ / จำนวน (Bulb)</span>
                        <p className="sl-field-value">{selected?.BULB_TYPE || '-'} (x{selected?.BULB_QTY || '-'})</p>
                    </div>
                    <div><span className="sl-field-label">กำลังไฟ (Watt)</span>
                        <p className="sl-field-value flex items-center gap-2"><Zap size={14}/> {selected?.WATT || '-'}</p>
                    </div>
                    <div><span className="sl-field-label">ตู้ควบคุม (Control Box)</span>
                        <p className="sl-field-value flex items-center gap-2"><Box size={14}/> {selected?.BOX_ID || '-'}</p>
                    </div>

                    {/* ข้อมูลพิกัดและรูป */}
                    <div><span className="sl-field-label">พิกัด (GPS)</span>
                        <p className="sl-field-value">{selected?.LAT}, {selected?.LON}</p>
                    </div>
                    <div><span className="sl-field-label">รูปภาพ / วันที่ถ่าย</span>
                        <p className="sl-field-value flex items-center gap-2">
                            <ImageIcon size={14}/> {selected?.IMG_FILE || 'ไม่มีรูป'} <span style={{color:'#9ca3af', fontSize:'0.8em'}}>({selected?.IMG_DATE})</span>
                        </p>
                    </div>
                    <div><span className="sl-field-label">วันที่อัปเดตสถานะ</span>
                         <p className="sl-field-value">{selected?.STATUSDATE || '-'}</p>
                    </div>
                </div>
                <ReportButton 
                   deviceId={selected?.ASSET_ID || ''} 
                   deviceName={selected?.LOCATION || ''}
                   location={`${selected?.LAT || ''}, ${selected?.LON || selected?.LNG || ''}`}
                   status={selected?.STATUS || ''}
                />
            </div>
          </div>
        </div>

      </div>
      
      <style>{`
        .spin-anim { animation: spin 1s linear infinite; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-2 { gap: 8px; }
        
        /* Custom Marker Styles */
        .custom-marker {
          background: transparent;
          border: none;
        }
        
        .marker-container {
          width: 40px;
          height: 40px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          border: 3px solid white;
        }
        
        .marker-icon {
          transform: rotate(45deg);
          font-size: 20px;
        }
      `}</style>
    </div>
  );
};

export default StreetLight;