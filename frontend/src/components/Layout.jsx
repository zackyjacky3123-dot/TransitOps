import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AvatarStack } from "./Avatar";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/fleet", label: "Fleet" },
  { to: "/drivers", label: "Drivers" },
  { to: "/trips", label: "Trips" },
  { to: "/maintenance", label: "Maintenance" },
  { to: "/fuel-expenses", label: "Fuel & Expenses" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
];

// Placeholder "active teammates" list for the avatar stack — swap for a real
// presence API later if you add one; for now it just needs to look alive.
const ACTIVE_USERS = ["Riya Kapoor", "Dev Sharma", "Meera Nair", "Arjun Rao"];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const roleLabel = user?.role?.replace("_", " ") || "";

  return (
    <div className="min-h-screen flex bg-bg">
      <aside className="w-56 border-r border-border flex flex-col p-4">
        <div className="text-lg font-semibold tracking-tight mb-8 px-2">TransitOps</div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-accent/10 border border-accent/40 text-accent"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-300 px-2">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border flex items-center justify-between px-6">
          <input type="text" placeholder="Search vehicles, drivers, trips..." className="input max-w-xs" />
          <div className="flex items-center gap-3">
            <AvatarStack names={ACTIVE_USERS} max={4} />
            <span className="text-sm text-gray-300">{user?.name}</span>
            <span className="badge badge-blue capitalize">{roleLabel}</span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
