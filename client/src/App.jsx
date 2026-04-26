import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CreatorProvider, useCreator } from './context/CreatorContext';
import Header from './components/Header';
import AuthPage from './pages/AuthPage';
import GalleryPage from './pages/GalleryPage';
import CreatorAuthPage from './pages/CreatorAuthPage';
import CreatorDashboard from './pages/CreatorDashboard';
import './styles/global.scss';

function ProtectedRoute({ children }) {
  const { guest } = useAuth();
  return guest ? children : <Navigate to="/auth" replace />;
}

function CreatorProtectedRoute({ children }) {
  const { creator } = useCreator();
  return creator ? children : <Navigate to="/creator" replace />;
}

function AppRoutes() {
  const { guest } = useAuth();
  const { creator } = useCreator();

  return (
    <Routes>
      {/* Guest routes */}
      <Route path="/auth" element={guest ? <Navigate to="/gallery" replace /> : <AuthPage />} />
      <Route
        path="/gallery"
        element={
          <ProtectedRoute>
            <>
              <Header />
              <GalleryPage />
            </>
          </ProtectedRoute>
        }
      />

      {/* Creator routes */}
      <Route path="/creator" element={creator ? <Navigate to="/creator/dashboard" replace /> : <CreatorAuthPage />} />
      <Route
        path="/creator/dashboard"
        element={
          <CreatorProtectedRoute>
            <CreatorDashboard />
          </CreatorProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={guest ? '/gallery' : '/auth'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CreatorProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <AppRoutes />
        </CreatorProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
