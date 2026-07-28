import { MapPin, Phone } from 'lucide-react';

interface CareCenter {
  name: string;
  address: string;
  phone: string;
  capacity?: number;
}

interface SubsidyResult {
  monthly_care_cap: number;
  government_subsidy: number;
  user_copay: number;
}

interface ResultCardProps {
  result: SubsidyResult;
  centers: CareCenter[];
  district: string;
  onReset: () => void;
}

export default function ResultCard({ result, centers, district, onReset }: ResultCardProps) {
  // Helper to generate Google Maps embed URL
  const getSafeMapEmbed = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    return `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subsidy Calculation Breakdown */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 space-y-3">
          <h2 className="text-xl font-bold text-blue-900 mb-4">每月補助試算</h2>
          <div className="flex justify-between items-center p-3 bg-white rounded-lg text-sm">
            <span className="text-gray-600">總額度</span>
            <span className="font-semibold">NT$ {result.monthly_care_cap.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100 text-sm">
            <span className="text-green-700 font-medium">政府負擔</span>
            <span className="font-bold text-lg text-green-700">
              NT$ {result.government_subsidy.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100 text-sm">
            <span className="text-orange-700 font-medium">自負額</span>
            <span className="font-bold text-lg text-orange-700">
              NT$ {result.user_copay.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Google Maps Preview */}
        <div className="rounded-xl overflow-hidden border border-gray-200 h-64 relative z-0 bg-gray-50 flex items-center justify-center">
          {centers.length > 0 ? (
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={getSafeMapEmbed(centers[0].address)}
            ></iframe>
          ) : (
            <p className="text-gray-400">尚無地圖資料</p>
          )}
        </div>
      </div>

      {/* Recommended Care Centers List */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          推薦 {district} 照護機構
        </h3>
        {centers.length > 0 ? (
          centers.map((center, idx) => (
            <div key={idx} className="p-4 border rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <h4 className="font-bold text-gray-900">{center.name}</h4>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <MapPin size={14} /> {center.address}
              </p>
              <div className="flex justify-between items-center mt-3 text-sm">
                <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 flex items-center gap-1">
                  <Phone size={12} /> {center.phone}
                </span>
                <span className="text-blue-600 font-medium">
                  核定床位: {center.capacity && center.capacity > 0 ? center.capacity : '無資料'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 p-4 bg-gray-50 rounded-xl text-center">該區域目前無登錄資料。</p>
        )}
      </div>

      <button onClick={onReset} className="w-full text-blue-600 font-medium hover:underline">
        重新計算
      </button>
    </div>
  );
}