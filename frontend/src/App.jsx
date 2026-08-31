import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'
import ApplicationsPage from './pages/ApplicationsPage.jsx'
import TracesPage from './pages/TracesPage.jsx'
import TraceDetailsPage from './pages/TraceDetailsPage.jsx'
import StatsPage from './pages/StatsPage.jsx'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/applications" replace />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/traces" element={<TracesPage />} />
        <Route path="/traces/:traceId" element={<TraceDetailsPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="*" element={<Navigate to="/applications" replace />} />
      </Routes>
    </AppShell>
  )
}