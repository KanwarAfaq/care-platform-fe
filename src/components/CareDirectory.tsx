import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  // 2. Tell useState to expect an array of CareCenters
  const [centers, setCenters] = useState<CareCenter[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<CareCenter[]>([]);
  
  // Tell useState to expect an array of strings for the districts
  const [districts, setDistricts] = useState<string[]>([]);
  
  // Filter States (These strings/booleans are fine as is)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
      } else {
        setCenters(data);
        setFilteredCenters(data);
        
        // Extract unique districts for the filter dropdown
        const uniqueDistricts = [...new Set(data.map(center => center.district))].filter(Boolean);
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
        center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDistrict) {
      result = result.filter(center => center.district === selectedDistrict);
    }

    setFilteredCenters(result);
  }, [searchTerm, selectedDistrict, centers]);

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        Taoyuan Care Center Directory
      </h1>

      {/* --- FILTERS SECTION --- */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="Search by center name or address..."
          className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
        >
          <option value="">All Districts</option>
          {districts.map(district => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
      </div>

      {/* --- RESULTS SECTION --- */}
      {isLoading ? (
        <div className="text-center text-gray-500 py-10">Loading care centers...</div>
      ) : filteredCenters.length === 0 ? (
        <div className="text-center text-gray-500 py-10">No care centers found. Try adjusting your filters.</div>
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
                    Beds: {center.capacity}
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
                <a
                  href={`tel:${center.phone}`}
                  className="flex-1 bg-green-500 text-white text-center py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  📞 Call
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center.name + ' ' + center.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-500 text-white text-center py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  🗺️ Map
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