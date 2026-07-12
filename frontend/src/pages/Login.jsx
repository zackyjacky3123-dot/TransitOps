import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = [
  { value: 'fleet_manager', label: 'Fleet Manager' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'financial_analyst', label: 'Financial Analyst' },
];

const ROLE_DEFAULT_ROUTE = {
  fleet_manager: '/fleet',
  dispatcher: '/dashboard',
  safety_officer: '/drivers',
  financial_analyst: '/fuel-expenses',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '', role: '', remember: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (field) => (e) => {
    const value = field === 'remember' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Please enter a valid email address.';
    }
    if (!form.password) next.password = 'Password is required.';
    if (!form.role) next.role = 'Please select a role to continue.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, role: form.role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message || 'Invalid email or password.');
        return;
      }

      login({ user: data.user, token: data.token });
      navigate(ROLE_DEFAULT_ROUTE[data.user.role] || '/dashboard');
    } catch {
      setFormError('Unable to reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-[#d1d5db] p-12 text-[#0a0a0a] lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
            T
          </div>
          <span className="text-xl font-semibold tracking-tight">
            Transit<span className="text-accent">Ops</span>
          </span>
        </div>

        <div>
          <p className="max-w-sm text-lg font-medium text-gray-800">
            Smart Transport Operations Platform
          </p>

          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-gray-600">
            One login, four roles
          </h2>
          <ul className="mt-3 space-y-2 text-sm font-medium text-gray-800">
            <li>• Fleet Manager</li>
            <li>• Dispatcher</li>
            <li>• Safety Officer</li>
            <li>• Financial Analyst</li>
          </ul>
        </div>

        <p className="text-xs text-gray-600">© {new Date().getFullYear()} TransitOps</p>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center bg-base-bg px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-white">Sign in to your account</h2>
          <p className="mt-1 text-sm text-gray-400">Enter your credentials to continue.</p>

          {formError && (
            <div className="mt-5 rounded-md border border-status-red/40 bg-status-red/10 px-3 py-2 text-sm text-status-red">
              {formError}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Email</label>
              <input
                type="email"
                className="input-field w-full"
                value={form.email}
                onChange={setField('email')}
                placeholder="you@transitops.com"
              />
              {errors.email && <p className="mt-1 text-xs text-status-red">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Password</label>
              <input
                type="password"
                className="input-field w-full"
                value={form.password}
                onChange={setField('password')}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-xs text-status-red">{errors.password}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Role (RBAC)</label>
              <select className="input-field w-full" value={form.role} onChange={setField('role')}>
                <option value="">Select a role...</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {errors.role && <p className="mt-1 text-xs text-status-red">{errors.role}</p>}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={setField('remember')}
                  className="h-4 w-4 rounded border-base-border bg-base-bg accent-accent"
                />
                Remember me
              </label>
              <a href="#" className="text-accent hover:underline">
                Forgot password?
              </a>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 space-y-1 text-xs text-gray-500">
            <p><span className="text-gray-400">Fleet Manager</span> → Fleet, Maintenance</p>
            <p><span className="text-gray-400">Dispatcher</span> → Dashboard, Trips</p>
            <p><span className="text-gray-400">Safety Officer</span> → Drivers, Compliance</p>
            <p><span className="text-gray-400">Financial Analyst</span> → Fuel & Expenses, Analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
}
