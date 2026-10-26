import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePageMeta } from '../lib/usePageMeta';

// 1. Define the exact shape of your data for TypeScript
interface CareCenter {
  id: string | number;
  name: string;
  district: string;
  address: string;
  capacity: number;
  phone: string;

}

const CareDirectory = () => {
  usePageMeta({
    title: '桃園長照機構名冊：日間照顧與小規模多機能｜桃園長照導航站',
    description: '依行政區或關鍵字查詢桃園市日間照顧與小規模多機能長照機構，提供電話與地圖導航。',
    path: '/CareDirectory',
  });
  // 2. Tell useState to expect an array of CareCenters
  const [centers, setCenters] = useState<CareCenter[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<CareCenter[]>([]);
  
  // Tell useState to expect an array of strings for the districts
  const [districts, setDistricts] = useState<string[]>([]);
  
  // Filter States (These strings/booleans are fine as is)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // ... rest of your existing useEffect and return code stays exactly the same!

  // 1. Fetch data from Supabase on component mount
  useEffect(() => {
    const fetchCenters = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('care_centers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching data:', error);
        setLoadError(true);
      } else {
        setCenters(data ?? []);
        setFilteredCenters(data ?? []);
        
        // Extract unique districts for the filter dropdown
        const uniqueDistricts = [...new Set((data ?? []).map((center: CareCenter) => center.district))].filter(Boolean) as string[];
        setDistricts(uniqueDistricts);
      }
      setIsLoading(false);
    };

    fetchCenters();
  }, []);

  // 2. Handle Search and Filter logic
  useEffect(() => {
    let result = centers;

    if (searchTerm) {
      result = result.filter(center => 
        (center.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (center.address || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDistrict) {
      result = result.filter(center => center.district === selectedDistrict);
    }

    setFilteredCenters(result);
  }, [searchTerm, selectedDistrict, centers]);

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <nav aria-label="麵包屑" className="text-sm text-gray-500 mb-4"><Link to="/" className="hover:text-blue-600">首頁</Link> / 機構名冊</nav>
      <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">桃園長照機構名冊</h1>
      <p className="text-center text-gray-600 mb-8">查詢桃園市日間照顧與小規模多機能服務單位；收托名額與費用請直接電話向機構確認。</p>

      {/* --- FILTERS SECTION --- */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="搜尋機構名稱或地址…" aria-label="搜尋機構名稱或地址"
          className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
        >
          <option value="">全部行政區</option>
          {districts.map(district => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
      </div>

      {/* --- RESULTS SECTION --- */}
      {isLoading ? (
        <div className="text-center text-gray-500 py-10">載入機構資料中…</div>
      ) : loadError ? (
        <div className="text-center text-red-600 py-10">目前無法載入機構資料，請稍後再試。</div>
      ) : filteredCenters.length === 0 ? (
        <div className="text-center text-gray-500 py-10">找不到符合的機構，請調整搜尋條件。</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCenters.map((center) => (
            <div key={center.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
              
              <div className="flex justify-between items-start mb-2">
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  {center.district}
                </span>
                {center.capacity > 0 && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 rounded">
                    床位 {center.capacity}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
                {center.name}
              </h2>
              
              <p className="text-gray-600 text-sm mb-4 min-h-[40px]">
                📍 {center.address}
              </p>

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 mt-4 border-t pt-4">
                {center.phone && <a
                  href={`tel:${String(center.phone).replace(/[^\d+]/g, '')}`}
                  className="flex-1 bg-green-500 text-white text-center py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  📞 撥打電話
                </a>}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center.name + ' ' + center.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-500 text-white text-center py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  🗺️ 地圖
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareDirectory;