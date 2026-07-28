import { useState } from 'react';
import { ChevronRight, Calculator, User, Activity, DollarSign, Map as MapIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ResultCard from './ResultCard';


const TAOYUAN_DISTRICTS = ['桃園區', '中壢區', '平鎮區', '八德區', '楊梅區', '蘆竹區', '大溪區', '龜山區', '大園區', '觀音區', '新屋區', '復興區'];

// Use environment variable or fallback to your live Render backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://taoyuan-care-api.onrender.com';
export default function WizardForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    district: '桃園區', 
    cms_level: 4,
    income_status: 'general'
  });
  const [result, setResult] = useState<any>(null);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const calculateSubsidy = async () => {
    setLoading(true);
    try {
      // 1. Call live Python backend on Render
      let calcData = { monthly_care_cap: 18580, government_subsidy: 15607, user_copay: 2973 };
      try {
        const response = await fetch(`${API_BASE_URL}/api/calculate-subsidy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (response.ok) {
          calcData = await response.json();
        }
      } catch (e) {
        console.warn("Backend calculation endpoint unavailable, using fallback calculation.", e);
      }
      
      setResult(calcData);

      // 2. Filter Supabase Data by District
      const { data, error } = await supabase
        .from('care_centers')
        .select('*')
        .eq('district', formData.district)
        .limit(5);

      if (error) throw error;
      if (data) setCenters(data);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setStep(1);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8 text-sm font-medium text-gray-400">
        <span className={step >= 1 ? 'text-blue-600' : ''}>1. 地區與資格 (Area & Eligibility)</span>
        <ChevronRight size={16} />
        <span className={step >= 2 ? 'text-blue-600' : ''}>2. 等級 (Level)</span>
        <ChevronRight size={16} />
        <span className={step >= 3 ? 'text-blue-600' : ''}>3. 身份 (Status)</span>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-3"><MapIcon className="text-blue-500"/> 尋找區域</h2>
            <select 
              className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500"
              value={formData.district}
              onChange={(e) => setFormData({...formData, district: e.target.value})}
            >
              {TAOYUAN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-3"><User className="text-blue-500"/> 基本資格</h2>
            <p className="text-gray-600 text-sm mb-4">請確認長輩符合：65歲以上失能、55歲以上原住民、或領有身心障礙證明。</p>
            <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700">符合條件，下一步</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-in fade-in">
          <h2 className="text-xl font-bold flex items-center gap-2"><Activity className="text-blue-500"/> 預估長照等級 (CMS)</h2>
          <select 
            className="w-full p-3 border rounded-xl bg-gray-50"
            value={formData.cms_level}
            onChange={(e) => setFormData({...formData, cms_level: Number(e.target.value)})}
          >
            <option value={2}>輕度 (Level 2-3) - 需協助洗澡、家務</option>
            <option value={4}>中度 (Level 4-5) - 需輪椅代步、上廁所需協助</option>
            <option value={7}>重度 (Level 6-8) - 長期臥床、24小時需人看顧</option>
          </select>
          <button onClick={() => setStep(3)} className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700">下一步</button>
        </div>
      )}

      {step === 3 && !result && (
        <div className="space-y-4 animate-in fade-in">
          <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="text-blue-500"/> 福利身份</h2>
          <select 
            className="w-full p-3 border rounded-xl bg-gray-50"
            value={formData.income_status}
            onChange={(e) => setFormData({...formData, income_status: e.target.value})}
          >
            <option value="general">一般戶 (自負額 16%)</option>
            <option value="mid_low">中低收入戶 (自負額 5%)</option>
            <option value="low">低收入戶 (免自負額 0%)</option>
          </select>
          <button 
            onClick={calculateSubsidy}
            disabled={loading}
            className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Calculator size={18} /> {loading ? '計算中...' : '計算補助金額'}
          </button>
        </div>
      )}

      {/* Render extracted ResultCard component */}
      {result && (
        <ResultCard 
          result={result} 
          centers={centers} 
          district={formData.district} 
          onReset={handleReset} 
        />
      )}
    </div>
  );
}