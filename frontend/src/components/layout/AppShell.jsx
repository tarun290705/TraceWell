import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function AppShell({ children, title, subtitle }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title={title} subtitle={subtitle} />
        <div className="app-content">{children}</div>
      </div>
    </div>
  )
}