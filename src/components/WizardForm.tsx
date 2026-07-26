import { useState } from 'react';
import { ChevronRight, Calculator, User, Activity, DollarSign } from 'lucide-react';

export default function WizardForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    cms_level: 4, // Default to moderate
    income_status: 'general'
  });
  const [result, setResult] = useState<any>(null);

  const calculateSubsidy = async () => {
    try {
      // Calling our FastAPI backend
      const response = await fetch('http://localhost:8000/api/calculate-subsidy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Backend not running yet, using fallback data for UI testing");
      // Fallback for UI testing before backend is running
      setResult({
        monthly_care_cap: 18580,
        government_subsidy: 15607,
        user_copay: 2973,
        transport_cap_taoyuan: 1840
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8 text-sm font-medium text-gray-400">
        <span className={step >= 1 ? 'text-blue-600' : ''}>1. 資格 (Eligibility)</span>
        <ChevronRight size={16} />
        <span className={step >= 2 ? 'text-blue-600' : ''}>2. 等級 (Level)</span>
        <ChevronRight size={16} />
        <span className={step >= 3 ? 'text-blue-600' : ''}>3. 身份 (Status)</span>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><User className="text-blue-500"/> 長輩基本資格</h2>
          <p className="text-gray-600 text-sm">請確認長輩符合以下任一條件：65歲以上失能、55歲以上原住民、或領有身心障礙證明。</p>
          <button 
            onClick={() => setStep(2)}
            className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            符合條件，下一步
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Activity className="text-blue-500"/> 預估長照等級 (CMS)</h2>
          <select 
            className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.cms_level}
            onChange={(e) => setFormData({...formData, cms_level: Number(e.target.value)})}
          >
            <option value={2}>輕度 (Level 2-3) - 需協助洗澡、家務</option>
            <option value={4}>中度 (Level 4-5) - 需輪椅代步、上廁所需協助</option>
            <option value={7}>重度 (Level 6-8) - 長期臥床、24小時需人看顧</option>
          </select>
          <button 
            onClick={() => setStep(3)}
            className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            下一步
          </button>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && !result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="text-blue-500"/> 福利身份</h2>
          <select 
            className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.income_status}
            onChange={(e) => setFormData({...formData, income_status: e.target.value})}
          >
            <option value="general">一般戶 (自負額 16%)</option>
            <option value="mid_low">中低收入戶 (自負額 5%)</option>
            <option value="low">低收入戶 (免自負額 0%)</option>
          </select>
          <button 
            onClick={calculateSubsidy}
            className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Calculator size={18} /> 計算補助金額
          </button>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h2 className="text-2xl font-bold text-center text-blue-900 mb-6">每月補助試算結果</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-gray-600">長照服務總額度</span>
              <span className="font-semibold text-lg">NT$ {result.monthly_care_cap.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
              <span className="text-green-700 font-medium">政府幫您出</span>
              <span className="font-bold text-xl text-green-700">NT$ {result.government_subsidy.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
              <span className="text-orange-700 font-medium">您每月自負額 (Copay)</span>
              <span className="font-bold text-xl text-orange-700">NT$ {result.user_copay.toLocaleString()}</span>
            </div>
          </div>
          
          <button 
            onClick={() => {setResult(null); setStep(1);}}
            className="w-full mt-6 text-blue-600 font-medium hover:underline"
          >
            重新計算
          </button>
        </div>
      )}
    </div>
  );
}