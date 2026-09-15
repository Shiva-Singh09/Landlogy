import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Enquiries from './pages/Enquiries';
import EnquiryDetail from './pages/EnquiryDetail';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import CreateProperty from './pages/CreateProperty';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="enquiries" element={<Enquiries />} />
        <Route path="enquiries/:id" element={<EnquiryDetail />} />
        <Route path="properties" element={<Properties />} />
        <Route path="properties/new" element={<CreateProperty />} />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
