import { HashRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireStaff } from './lib/auth'
import { DashboardPage } from './pages/DashboardPage'
import { RequestDetailPage } from './pages/RequestDetailPage'
import { RequestFormPage } from './pages/RequestFormPage'
import { StaffLoginPage } from './pages/StaffLoginPage'

// HashRouter keeps deep links working on any static host without rewrite rules.
// VITE_ROUTER=memory is used for sandboxed embeds (e.g. the hosted demo) that don't allow hash paths.
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : HashRouter

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RequestFormPage />} />
          <Route path="/staff/login" element={<StaffLoginPage />} />
          <Route
            path="/staff"
            element={
              <RequireStaff>
                <DashboardPage />
              </RequireStaff>
            }
          />
          <Route
            path="/staff/requests/:id"
            element={
              <RequireStaff>
                <RequestDetailPage />
              </RequireStaff>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}
