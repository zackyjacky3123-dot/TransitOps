import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge.jsx';
import { apiFetch } from '../lib/api.js';

const EMPTY_FORM = { name: '', licenseNo: '', licenseCategory: 'LMV', licenseExpiry: '', contact: '', safetyScore: '100', tripCompletionPct: '0' };
const STATUS_OPTIONS = ['available', 'on_trip', 'off_duty', 'suspended'];
const STATUS_LABELS = { available: 'Available', on_trip: 'On Trip', off_duty: 'Off Duty', suspended: 'Suspended' };

function expiryInfo(value) {
  if (!value) return { text: 'No expiry on file', className: 'text-status-gray' };
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (isNaN(date.getTime())) return { text: 'Invalid date', className: 'text-status-gray' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.ceil((date - today) / 86400000);
  if (days < 0) return { text: 'Expired', className: 'text-status-red' };
  if (days <= 30) return { text: `${days}d remaining`, className: 'text-status-orange' };
  return { text: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date), className: '' };
}

function SafetyBadge({ score }) {
  const value = Number(score);
  const style = value >= 95 ? 'text-status-green border-status-green/40 bg-status-green/10' : value >= 80 ? 'text-status-orange border-status-orange/40 bg-status-orange/10' : 'text-status-red border-status-red/40 bg-status-red/10';
  return <span className={`badge ${style}`}>{value.toFixed(1)}%</span>;
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/drivers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setDrivers(data);
    } catch (err) { setMessage(err.message || 'Unable to load drivers. Please try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadDrivers(); }, []);

  const selected = drivers.find((driver) => driver.id === selectedId);
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault(); setErrors({}); setMessage(''); setSaving(true);
    try {
      const res = await apiFetch('/api/drivers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setErrors(data.field ? { [data.field]: data.message } : {}); if (!data.field) setMessage(data.message); return; }
      setDrivers((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(data.id); setForm(EMPTY_FORM); setShowForm(false); setMessage('Driver added successfully.');
    } catch { setMessage('Unable to add driver. Please try again.'); }
    finally { setSaving(false); }
  };

  const changeStatus = async (status) => {
    if (!selected) { setMessage('Select a driver from the table before changing status.'); return; }
    setMessage('');
    try {
      const res = await apiFetch(`/api/drivers/${selected.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message);
      setDrivers((current) => current.map((driver) => driver.id === data.id ? data : driver));
      setMessage(`${data.name} is now ${STATUS_LABELS[data.status]}.`);
    } catch (err) { setMessage(err.message || 'Unable to update driver status. Please try again.'); }
  };

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-xl font-semibold text-white">Drivers &amp; Safety Profiles</h1><p className="mt-1 text-sm text-gray-400">License compliance, performance, and driver availability.</p></div>
      <button className="btn-primary" onClick={() => { setErrors({}); setShowForm(true); }}>+ Add Driver</button>
    </div>
    {message && <div className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-gray-200">{message}</div>}
    <div className="panel mt-6 overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead><tr className="border-b border-base-border text-xs uppercase tracking-wide text-gray-500"><th className="p-4">Driver</th><th className="p-4">License No.</th><th className="p-4">Category</th><th className="p-4">Expiry</th><th className="p-4">Contact</th><th className="p-4">Trip Compl.</th><th className="p-4">Safety</th><th className="p-4">Status</th></tr></thead><tbody>
      {loading && <tr><td colSpan="8" className="p-8 text-center text-gray-500">Loading drivers...</td></tr>}
      {!loading && drivers.map((driver) => { const expiry = expiryInfo(driver.licenseExpiry); return <tr key={driver.id} onClick={() => setSelectedId(driver.id)} className={`cursor-pointer border-b border-base-border/60 transition-colors last:border-0 ${selectedId === driver.id ? 'bg-accent/10' : 'hover:bg-white/[0.03]'}`}><td className="p-4 font-medium text-white">{driver.name}</td><td className="p-4 text-gray-300">{driver.licenseNo}</td><td className="p-4 text-gray-300">{driver.licenseCategory}</td><td className={`p-4 font-medium ${expiry.className}`}>{expiry.text}</td><td className="p-4 text-gray-300">{driver.contact}</td><td className="p-4 text-gray-300">{Number(driver.tripCompletionPct).toFixed(1)}%</td><td className="p-4"><SafetyBadge score={driver.safetyScore} /></td><td className="p-4"><StatusBadge status={driver.status} /></td></tr>; })}
    </tbody></table></div>
    <div className="panel mt-6 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Quick Status Update</h2><p className="mt-1 text-xs text-gray-400">{selected ? `Selected: ${selected.name}` : 'Select a driver from the table first.'}</p></div><div className="flex flex-wrap gap-2">{STATUS_OPTIONS.map((status) => <button key={status} onClick={() => changeStatus(status)} className={`badge px-3 py-1.5 transition-colors ${selected?.status === status ? 'border-accent bg-accent/20 text-accent' : 'border-base-border text-gray-300 hover:bg-white/5'}`}>{STATUS_LABELS[status]}</button>)}</div></div></div>
    <p className="mt-4 rounded-md border border-status-orange/30 bg-status-orange/10 px-3 py-2 text-sm text-status-orange">Rule: Expired license or Suspended status → blocked from trip assignment.</p>
    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={submit} className="panel w-full max-w-2xl p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Add Driver</h2><button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">✕</button></div><div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Driver name" value={form.name} onChange={setField('name')} error={errors.name} /><Field label="License No." value={form.licenseNo} onChange={setField('licenseNo')} error={errors.licenseNo} /><Select label="Category" value={form.licenseCategory} onChange={setField('licenseCategory')} options={['LMV', 'HMV']} error={errors.licenseCategory} /><Field label="License expiry" type="date" value={form.licenseExpiry} onChange={setField('licenseExpiry')} error={errors.licenseExpiry} /><Field label="Contact (10 digits)" value={form.contact} onChange={setField('contact')} error={errors.contact} /><Field label="Safety score (%)" type="number" value={form.safetyScore} onChange={setField('safetyScore')} error={errors.safetyScore} /><Field label="Trip completion (%)" type="number" value={form.tripCompletionPct} onChange={setField('tripCompletionPct')} error={errors.tripCompletionPct} />
    </div><div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Driver'}</button></div></form></div>}
  </div>;
}

function Field({ label, error, ...props }) { return <label className="block text-xs font-medium text-gray-400">{label}<input className="input-field mt-1 w-full" {...props} />{error && <span className="mt-1 block text-xs text-status-red">{error}</span>}</label>; }
function Select({ label, options, error, ...props }) { return <label className="block text-xs font-medium text-gray-400">{label}<select className="input-field mt-1 w-full" {...props}>{options.map((option) => <option key={option}>{option}</option>)}</select>{error && <span className="mt-1 block text-xs text-status-red">{error}</span>}</label>; }
