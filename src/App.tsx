import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import WizardForm from './components/WizardForm';
import AdminDashboard from './admin/AdminDashboard';
import CareDirectory from './components/CareDirectory';

function MainPlatform() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">桃園長照導航站</h1>
          <p className="text-gray-500">Taoyuan Long-Term Care Navigator</p>
        </div>

        {/* Navigation Link to the Directory */}
        <div className="flex justify-center">
          <Link 
            to="/CareDirectory" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow font-medium hover:bg-blue-700 transition-colors"
          >
            🔍 Browse Care Center Directory
          </Link>
        </div>

        {/* The Wizard Form */}
        <WizardForm />

      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPlatform />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/CareDirectory" element={<CareDirectory />} />
      </Routes>
    </Router>
  );
}