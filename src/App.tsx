import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import WizardForm from './components/WizardForm';
import AdminDashboard from './admin/AdminDashboard';
import AdminGate from './admin/AdminGate';
import CareDirectory from './components/CareDirectory';
import { LandingIntro, LandingSections } from './components/Landing';
import { usePageMeta } from './lib/usePageMeta';
import content from './seo/content.json';

function MainPlatform() {
  usePageMeta({ title: content.title, description: content.description, path: '/' });
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans text-gray-900">
      <main className="max-w-3xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <nav aria-label="頁面導覽" className="flex justify-center gap-4 text-sm font-medium text-gray-600">
            <a href="/#features" className="hover:text-blue-600">{content.nav.features}</a>
            <Link to="/CareDirectory" className="hover:text-blue-600">機構名冊</Link>
            <a href="/#faq" className="hover:text-blue-600">{content.nav.faq}</a>
          </nav>
          <LandingIntro />
        </header>

        <div className="flex justify-center">
          <Link to="/CareDirectory" className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow font-medium hover:bg-blue-700 transition-colors">
            🔍 瀏覽桃園長照機構名冊
          </Link>
        </div>

        <WizardForm />
        <LandingSections />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPlatform />} />
        <Route path="/admin" element={<AdminGate><AdminDashboard /></AdminGate>} />
        <Route path="/CareDirectory" element={<CareDirectory />} />
        <Route path="/care-directory" element={<Navigate to="/CareDirectory" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
