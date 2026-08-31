import { NavLink } from "react-router-dom";
import { useApplications } from "../../hooks/useApplications.js";

export default function Sidebar() {
  const { applications } = useApplications();
  const connectedCount = applications.filter((a) => a.is_connected).length;

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark" aria-hidden="true" />
        TraceWell
      </div>
      <nav>
        <ul className="sidebar-nav">
          <li>
            <NavLink
              to="/applications"
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              Applications
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/traces"
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              Traces
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/stats"
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              Stats
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="sidebar-footer">
        <span
          className={`sidebar-status-dot${connectedCount > 0 ? " pulse" : ""}`}
          aria-hidden="true"
        />
        {connectedCount} app{connectedCount === 1 ? "" : "s"} connected
      </div>
    </aside>
  );
}
