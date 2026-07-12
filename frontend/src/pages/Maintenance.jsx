import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge.jsx';
import { apiFetch } from '../lib/api.js';

const EMPTY = { vehicleId: '', serviceType: '', cost: '', serviceDate: new Date().toISOString().slice(0, 10), status: 'active' };

export default function Maintenance() {
  const [form, setForm] = useState(EMPTY);
  const [vehicles, setVehicles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [vehicleRes, logRes] = await Promise.all([apiFetch('/api/maintenance/vehicles'), apiFetch('/api/maintenance')]);
      const [vehicleData, logData] = await Promise.all([vehicleRes.json(), logRes.json()]);
      if (!vehicleRes.ok) throw new Error(vehicleData.message); if (!logRes.ok) throw new Error(logData.message);
      setVehicles(vehicleData); setLogs(logData);
    } catch (err) { setMessage(err.message || 'Unable to load maintenance data. Please try again.'); }
  };
  useEffect(() => { load(); }, []);
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const save = async (event) => {
    event.preventDefault(); setErrors({}); setMessage(''); setSaving(true);
    try {
      const response = await apiFetch('/api/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) { if (data.field) setErrors({ [data.field]: data.message }); else setMessage(data.message); return; }
      setLogs((current) => [data, ...current]); setForm(EMPTY); setMessage(data.status === 'active' ? `${data.vehicleRegNo} moved to In Shop.` : 'Completed service record saved.'); await load();
    } catch { setMessage('Unable to save service record. Please try again.'); }
    finally { setSaving(false); }
  };
  const complete = async (log) => {
    setMessage('');
    try {
      const response = await apiFetch(`/api/maintenance/${log.id}/complete`, { method: 'POST' }); const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setLogs((current) => current.map((item) => item.id === data.id ? data : item)); setMessage(`${data.vehicleRegNo} is available for dispatch again.`); await load();
    } catch (err) { setMessage(err.message || 'Unable to complete service record. Please try again.'); }
  };
  return <div>
    <h1 className="text-xl font-semibold text-white">Maintenance</h1><p className="mt-1 text-sm text-gray-400">Keep service records current and protect dispatch availability.</p>
    {message && <div className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-gray-200">{message}</div>}
    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
      <form className="panel p-5" onSubmit={save}><h2 className="text-sm font-semibold text-white">Log Service Record</h2><div className="mt-4 space-y-4"><Select label="Vehicle" value={form.vehicleId} onChange={setField('vehicleId')} error={errors.vehicleId}><option value="">Select vehicle...</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.regNo} {vehicle.status === 'in_shop' ? '(In Shop)' : ''}</option>)}</Select><Field label="Service Type" value={form.serviceType} onChange={setField('serviceType')} error={errors.serviceType} placeholder="e.g. Scheduled oil service" /><Field label="Cost (₹)" type="number" min="0" value={form.cost} onChange={setField('cost')} error={errors.cost} /><Field label="Service Date" type="date" max={new Date().toISOString().slice(0, 10)} value={form.serviceDate} onChange={setField('serviceDate')} error={errors.serviceDate} /><Select label="Status" value={form.status} onChange={setField('status')} error={errors.status}><option value="active">Active — Move vehicle to In Shop</option><option value="completed">Completed — Historical record</option></Select></div><button className="btn-primary mt-5 w-full" disabled={saving}>{saving ? 'Saving...' : 'Save Service Record'}</button></form>
      <section className="panel overflow-x-auto p-5"><h2 className="text-sm font-semibold text-white">Service Log</h2><table className="mt-4 w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-base-border text-xs uppercase tracking-wide text-gray-500"><th className="pb-3 pr-4">Vehicle</th><th className="pb-3 pr-4">Service</th><th className="pb-3 pr-4">Cost</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Action</th></tr></thead><tbody>{logs.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-gray-500">No service records yet.</td></tr>}{logs.map((log) => <tr className="border-b border-base-border/60 last:border-0" key={log.id}><td className="py-3 pr-4 font-medium text-gray-200">{log.vehicleRegNo}</td><td className="py-3 pr-4 text-gray-300">{log.serviceType}<span className="mt-0.5 block text-xs text-gray-500">{new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${log.serviceDate}T00:00:00`))}</span></td><td className="py-3 pr-4 text-gray-300">₹{Number(log.cost).toLocaleString('en-IN')}</td><td className="py-3 pr-4"><StatusBadge status={log.status} label={log.status === 'active' ? 'In Shop' : 'Completed'} /></td><td className="py-3">{log.status === 'active' && <button className="btn-secondary px-3 py-1.5" onClick={() => complete(log)}>Mark Complete</button>}</td></tr>)}</tbody></table></section>
    </div>
    <section className="panel mt-6 p-5"><h2 className="text-sm font-semibold text-white">Maintenance Availability Flow</h2><div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center"><div className="rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 text-status-green">Available</div><span className="text-center text-gray-500">→ creating active record →</span><div className="rounded-md border border-status-orange/30 bg-status-orange/10 px-3 py-2 text-status-orange">In Shop</div><span className="text-center text-gray-500">→ closing record, not retired →</span><div className="rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 text-status-green">Available</div></div><p className="mt-4 text-xs text-gray-400">In Shop vehicles are removed from the dispatch pool.</p></section>
  </div>;
}
function Field({ label, error, ...props }) { return <label className="block text-xs font-medium text-gray-400">{label}<input className="input-field mt-1 w-full" {...props} />{error && <span className="mt-1 block text-xs text-status-red">{error}</span>}</label>; }
function Select({ label, error, children, ...props }) { return <label className="block text-xs font-medium text-gray-400">{label}<select className="input-field mt-1 w-full" {...props}>{children}</select>{error && <span className="mt-1 block text-xs text-status-red">{error}</span>}</label>; }
