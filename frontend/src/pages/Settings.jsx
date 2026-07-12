import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const MATRIX = [
  ['Fleet Manager', '✓', '✓', '–', '–', '✓'],
  ['Dispatcher', 'view', '–', '✓', '–', '–'],
  ['Safety Officer', '–', '✓', 'view', '–', '–'],
  ['Financial Analyst', 'view', '–', '–', '✓', '✓'],
];
const EMPTY = { depotName: '', currency: 'INR (Rs)', distanceUnit: 'Kilometers' };

export default function Settings() {
  const [form, setForm] = useState(EMPTY); const [errors, setErrors] = useState({}); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { apiFetch('/api/settings').then(async (res) => { const body = await res.json(); if (!res.ok) throw new Error(body.message); return body; }).then(setForm).catch((err) => setMessage(err.message || 'Unable to load settings.')); }, []);
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const save = async (event) => { event.preventDefault(); setErrors({}); setMessage(''); setSaving(true); try { const res = await apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const body = await res.json(); if (!res.ok) { if (body.field) setErrors({ [body.field]: body.message }); else setMessage(body.message); return; } setForm(body); setMessage('Settings saved successfully.'); } catch { setMessage('Unable to save settings. Please try again.'); } finally { setSaving(false); } };
  return <div><h1 className="text-xl font-semibold text-white">Settings &amp; RBAC</h1><p className="mt-1 text-sm text-gray-400">Configure depot defaults and review access responsibilities.</p>{message && <div className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-gray-200">{message}</div>}<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.4fr)]"><form className="panel p-5" onSubmit={save}><h2 className="text-sm font-semibold text-white">General</h2><div className="mt-5 space-y-4"><Field label="Depot Name" value={form.depotName} onChange={setField('depotName')} error={errors.depotName}/><Field label="Currency" value={form.currency} onChange={setField('currency')} error={errors.currency}/><Field label="Distance Unit" value={form.distanceUnit} onChange={setField('distanceUnit')} error={errors.distanceUnit}/></div><button className="btn-primary mt-6 w-full" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></form><section className="panel overflow-x-auto p-5"><h2 className="text-sm font-semibold text-white">Role-Based Access (RBAC)</h2><p className="mt-1 text-xs text-gray-400">Read-only permission matrix for TransitOps roles.</p><table className="mt-5 w-full min-w-[620px] text-center text-sm"><thead><tr className="border-b border-base-border text-xs uppercase tracking-wide text-gray-500"><th className="pb-3 text-left">Role</th>{['Fleet','Drivers','Trips','Fuel/Exp.','Analytics'].map((h) => <th className="pb-3" key={h}>{h}</th>)}</tr></thead><tbody>{MATRIX.map((row) => <tr key={row[0]} className="border-b border-base-border/60 last:border-0"><td className="py-4 text-left font-medium text-gray-200">{row[0]}</td>{row.slice(1).map((value, index) => <td className={`py-4 font-medium ${value === '✓' ? 'text-status-green' : value === 'view' ? 'text-accent' : 'text-gray-600'}`} key={index}>{value}</td>)}</tr>)}</tbody></table></section></div></div>;
}
function Field({ label, error, ...props }) { return <label className="block text-xs font-medium text-gray-400">{label}<input className="input-field mt-1 w-full" {...props}/>{error && <span className="mt-1 block text-xs text-status-red">{error}</span>}</label>; }
