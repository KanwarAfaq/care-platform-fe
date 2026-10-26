import { useState } from 'react';
import { ChevronRight, Calculator, User, Activity, DollarSign, Map as MapIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ResultCard from './ResultCard';
import { calculateSubsidy as computeSubsidy, CMS_LEVEL_QUOTA, INCOME_OPTIONS, RULES_LAST_VERIFIED, type SubsidyResult } from '../lib/subsidy';


const TAOYUAN_DISTRICTS = ['桃園區', '中壢區', '平鎮區', '八德區', '楊梅區', '蘆竹區', '大溪區', '龜山區', '大園區', '觀音區', '新屋區', '復興區'];

export default function WizardForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    district: '桃園區', 
    cms_level: 4,
    income_status: 'general'
  });
  const [result, setResult] = useState<SubsidyResult | null>(null);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const calculateSubsidy = async () => {
    setLoading(true);
    try {
      // 1. Calculate locally (same rules as the LINE bot) so results never depend on a cold-starting backend
      setResult(computeSubsidy(formData.cms_level, formData.income_status));

      // 2. Filter Supabase Data by District
      const { data, error } = await supabase
        .from('care_centers')
        .select('*')
        .eq('district', formData.district)
        .limit(5);

      if (error) throw error;
      setCenters(data ?? []);

    } catch (error) {
      console.error("Error fetching data:", error);
      setCenters([]);
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
            {Object.entries(CMS_LEVEL_QUOTA).map(([level, quota]) => (
              <option key={level} value={Number(level)}>第 {level} 級（每月額度上限 NT$ {quota.toLocaleString()}）</option>
            ))}
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
            {INCOME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}（自付 {Math.round(o.rate * 100)}%）</option>
            ))}
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

      {result && <p className="mb-4 text-xs text-gray-500">這是試算，不是核定結果；實際 CMS 等級由照顧管理專員評估。規則查證日期：{RULES_LAST_VERIFIED}。請撥打 1966 長照專線預約評估。</p>}
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