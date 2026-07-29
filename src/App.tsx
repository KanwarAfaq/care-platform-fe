import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WizardForm from './components/WizardForm';
import AdminDashboard from './admin/AdminDashboard';

function MainPlatform() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">桃園長照導航站</h1>
          <p className="text-gray-500">Taoyuan Long-Term Care Navigator</p>
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
      </Routes>
    </Router>
  );
}