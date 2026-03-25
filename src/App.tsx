import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthViewModel } from './viewmodels/AuthViewModel';
import { usePetViewModel }  from './viewmodels/PetViewModel';
import { AuthContext, PetContext, useAuth } from './context/AppContext';

import IndexPage        from './views/pages/IndexPage';
import LoginPage        from './views/pages/LoginPage';
import SignupPage       from './views/pages/SignupPage';
import ForgotPasswordPage from './views/pages/ForgotPasswordPage';
import ResetPasswordPage from './views/pages/ResetPasswordPage';
import DashboardLayout  from './views/dashboard/DashboardLayout';
import HomePage         from './views/dashboard/HomeOverviewPage';
import PetAdoptionPage  from './views/dashboard/Homepage';
import PetFinderPage    from './views/dashboard/PetFinderPage';
import ApplicationsPage from './views/dashboard/ApplicationsPage';
import ProfilePage      from './views/dashboard/ProfilePage';

import AdminLayout           from './views/admin/AdminLayout';
import AdminDashboardPage    from './views/admin/AdminDashboardPage';
import AdminUsersPage        from './views/admin/AdminUsersPage';
import AdminPetsPage         from './views/admin/AdminPetsPage';
import AdminApplicationsPage from './views/admin/AdminApplicationsPage';
import AdminLostPetsPage     from './views/admin/AdminLostPetsPage';
import AdminSightingsPage    from './views/admin/AdminSightingsPage.tsx';

function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard/home" replace />;
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-primary-600 font-semibold text-sm">Loading AnimalBase…</p>
      </div>
    </div>
  );
}

export default function App() {
  const authVM = useAuthViewModel();
  const petVM  = usePetViewModel();

  return (
    <AuthContext.Provider value={authVM}>
      <PetContext.Provider value={petVM}>
        <BrowserRouter>
          <Routes>
            <Route path="/"       element={<IndexPage />} />
            <Route path="/login"  element={authVM.isLoading ? <LoadingScreen /> : authVM.isAuthenticated ? <Navigate to={authVM.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard/home'} /> : <LoginPage />} />
            <Route path="/signup" element={authVM.isLoading ? <LoadingScreen /> : authVM.isAuthenticated ? <Navigate to="/dashboard/home" /> : <SignupPage />} />
            <Route path="/forgot-password" element={authVM.isLoading ? <LoadingScreen /> : authVM.isAuthenticated ? <Navigate to={authVM.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard/home'} /> : <ForgotPasswordPage />} />
            <Route path="/reset-password" element={authVM.isLoading ? <LoadingScreen /> : authVM.isAuthenticated ? <Navigate to={authVM.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard/home'} /> : <ResetPasswordPage />} />

            {/* User dashboard */}
            <Route path="/dashboard" element={<Protected><DashboardLayout /></Protected>}>
              <Route index               element={<Navigate to="home" replace />} />
              <Route path="home"         element={<HomePage />} />
              <Route path="pet-adoption" element={<PetAdoptionPage />} />
              <Route path="pet-finder"   element={<PetFinderPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="profile"      element={<ProfilePage />} />
            </Route>

            {/* Admin panel */}
            <Route path="/admin" element={<AdminOnly><AdminLayout /></AdminOnly>}>
              <Route index               element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"    element={<AdminDashboardPage />} />
              <Route path="users"        element={<AdminUsersPage />} />
              <Route path="pets"         element={<AdminPetsPage />} />
              <Route path="applications" element={<AdminApplicationsPage />} />
              <Route path="lost-pets"    element={<AdminLostPetsPage />} />
              <Route path="sightings"    element={<AdminSightingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PetContext.Provider>
    </AuthContext.Provider>
  );
}
