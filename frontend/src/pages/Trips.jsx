import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../components/StatusBadge.jsx';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { canWrite } from '../lib/permissions.js';

const EMPTY_FORM = { source: '', destination: '', vehicleId: '', driverId: '', cargoWeightKg: '', plannedDistanceKm: '' };
const STEPS = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

export default function Trips() {
  const { role } = useAuth();
  const canDispatch = canWrite(role, 'trips');
  const [form, setForm] = useState(EMPTY_FORM);
  const [options, setOptions] = useState({ vehicles: [], drivers: [] });
  const [trips, setTrips] = useState([]);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completionTrip, setCompletionTrip] = useState(null);
  const [completion, setCompletion] = useState({ finalOdometer: '', fuelConsumedL: '', fuelPricePerL: '100' });

  const load = async () => {
    setLoading(true);
    try {
      const [optionsRes, tripsRes] = await Promise.all([apiFetch('/api/trips/dispatch-options'), apiFetch('/api/trips')]);
      const [optionsData, tripsData] = await Promise.all([optionsRes.json(), tripsRes.json()]);
      if (!optionsRes.ok) throw new Error(optionsData.message);
      if (!tripsRes.ok) throw new Error(tripsData.message);
      setOptions(optionsData); setTrips(tripsData);
    } catch (err) { setNotice(err.message || 'Unable to load trip dispatcher. Please try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const vehicle = options.vehicles.find((item) => String(item.id) === String(form.vehicleId));
  const cargo = Number(form.cargoWeightKg);
  const capacityExceeded = vehicle && Number.isFinite(cargo) && cargo > Number(vehicle.maxCapacityKg);
  const capacityError = capacityExceeded ? `Vehicle Capacity: ${Number(vehicle.maxCapacityKg)} kg / Cargo Weight: ${cargo} kg / ✗ Capacity exceeded by ${(cargo - Number(vehicle.maxCapacityKg)).toFixed(2)} kg — dispatch blocked` : '';
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (capacityExceeded) return;
    setErrors({}); setNotice(''); setSubmitting(true);
    try {
      const res = await apiFetch('/api/trips/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { if (data.field) setErrors({ [data.field]: data.message }); else setNotice(data.message); return; }
      setTrips((current) => [data, ...current]); setForm(EMPTY_FORM); setNotice(`Trip #${data.id} dispatched. Vehicle and driver are now On Trip.`); await refreshOptions();
    } catch { setNotice('Unable to dispatch trip. Please try again.'); }
    finally { setSubmitting(false); }
  };
  const refreshOptions = async () => { const res = await apiFetch('/api/trips/dispatch-options'); if (res.ok) setOptions(await res.json()); };
  const replaceTrip = (updated) => setTrips((current) => current.map((trip) => trip.id === updated.id ? updated : trip));
  const cancel = async (trip) => {
    setNotice('');
    try { const res = await apiFetch(`/api/trips/${trip.id}/cancel`, { method: 'POST' }); const data = await res.json(); if (!res.ok) throw new Error(data.message); replaceTrip(data); setNotice(`Trip #${trip.id} cancelled. Vehicle and driver are available again.`); await refreshOptions(); }
    catch (err) { setNotice(err.message || 'Unable to cancel trip. Please try again.'); }
  };
  const complete = async (event) => {
    event.preventDefault(); setErrors({});
    try { const res = await apiFetch(`/api/trips/${completionTrip.id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(completion) }); const data = await res.json(); if (!res.ok) { setErrors(data.field ? { [data.field]: data.message } : {}); if (!data.field) setNotice(data.message); return; } replaceTrip(data); setCompletionTrip(null); setCompletion({ finalOdometer: '', fuelConsumedL: '', fuelPricePerL: '100' }); setNotice(`Trip #${data.id} completed. Fuel cost was added; vehicle and driver are available again.`); await refreshOptions(); }
    catch { setNotice('Unable to complete trip. Please try again.'); }
  };

  const currentStage = useMemo(() => trips.find((trip) => trip.status === 'dispatched')?.status || 'draft', [trips]);
  return <div>
    <h1 className="text-xl font-semibold text-white">Trip Dispatcher</h1><p className="mt-1 text-sm text-gray-400">Dispatch trips with live capacity, vehicle, and driver safety checks.</p>
    {notice && <div className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-gray-200">{notice}</div>}
    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="space-y-6"><div className="panel p-5"><h2 className="text-sm font-semibold text-white">Trip Lifecycle</h2><div className="mt-5 flex items-center">{STEPS.map((step, index) => { const key = step.toLowerCase(); const active = key === currentStage; return <div key={step} className="flex flex-1 items-center last:flex-none"><div className="flex flex-col items-center"><span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${active ? 'border-accent bg-accent text-white' : 'border-base-border bg-base-bg text-gray-500'}`}>{index + 1}</span><span className={`mt-2 text-xs ${active ? 'text-accent' : 'text-gray-500'}`}>{step}</span></div>{index < STEPS.length - 1 && <div className="mb-5 h-px flex-1 bg-base-border" />}</div>; })}</div></div>
        {canDispatch ? (
          <form className="panel p-5" onSubmit={submit}><h2 className="text-sm font-semibold text-white">Create &amp; Dispatch Trip</h2><div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Source" value={form.source} onChange={setField('source')} error={errors.source} placeholder="e.g. Ahmedabad" /><Input label="Destination" value={form.destination} onChange={setField('destination')} error={errors.destination} placeholder="e.g. Surat" /><Select label="Vehicle" value={form.vehicleId} onChange={setField('vehicleId')} error={errors.vehicleId}><option value="">Select available vehicle...</option>{options.vehicles.map((item) => <option key={item.id} value={item.id}>{item.regNo} - {Number(item.maxCapacityKg)} kg capacity</option>)}</Select><Select label="Driver" value={form.driverId} onChange={setField('driverId')} error={errors.driverId}><option value="">Select eligible driver...</option>{options.drivers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Input label="Cargo Weight (kg)" type="number" min="0" value={form.cargoWeightKg} onChange={setField('cargoWeightKg')} error={errors.cargoWeightKg} /><Input label="Planned Distance (km)" type="number" min="0" value={form.plannedDistanceKm} onChange={setField('plannedDistanceKm')} error={errors.plannedDistanceKm} /></div>{capacityError && <div className="mt-4 rounded-md border border-status-red/40 bg-status-red/10 px-3 py-2 text-sm text-status-red">{capacityError}</div>}<button className="btn-primary mt-5 w-full" disabled={submitting || capacityExceeded || loading}>{submitting ? 'Dispatching...' : 'Dispatch Trip'}</button><p className="mt-4 text-xs text-gray-500">On Complete: odometer → fuel log → expenses → Vehicle &amp; Driver Available.</p></form>
        ) : (
          <div className="panel p-5"><h2 className="text-sm font-semibold text-white">Create &amp; Dispatch Trip</h2><p className="mt-3 text-sm text-gray-400">Your role has read-only access to Trips. Dispatching, completing, and cancelling trips is restricted to the Dispatcher role.</p></div>
        )}
      </section>
      <section className="panel p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Live Board</h2><p className="mt-1 text-xs text-gray-400">Latest trips and live lifecycle actions.</p></div><span className="badge border-base-border text-gray-400">{trips.length} trips</span></div><div className="mt-4 space-y-3">{loading && <p className="py-8 text-center text-sm text-gray-500">Loading trips...</p>}{!loading && trips.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No trips yet. Dispatch the first one.</p>}{trips.map((trip) => <article key={trip.id} className="rounded-lg border border-base-border bg-base-bg p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-gray-500">TRIP #{trip.id}</p><h3 className="mt-1 font-medium text-white">{trip.source} → {trip.destination}</h3></div><StatusBadge status={trip.status} /></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><p className="text-gray-400">Vehicle <span className="ml-1 text-gray-200">{trip.vehicleRegNo || 'Unassigned'}</span></p><p className="text-gray-400">Driver <span className="ml-1 text-gray-200">{trip.driverName || 'Awaiting driver'}</span></p><p className="col-span-2 text-accent">{trip.eta}</p></div>{trip.status === 'dispatched' && canDispatch && <div className="mt-4 flex gap-2"><button className="btn-primary flex-1" onClick={() => { setCompletionTrip(trip); setErrors({}); }}>Complete</button><button className="btn-secondary" onClick={() => cancel(trip)}>Cancel</button></div>}</article>)}</div></section>
    </div>
    {completionTrip && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={complete} className="panel w-full max-w-md p-6"><div className="flex justify-between"><h2 className="text-lg font-semibold text-white">Complete Trip #{completionTrip.id}</h2><button type="button" className="text-gray-400 hover:text-white" onClick={() => setCompletionTrip(null)}>✕</button></div><p className="mt-2 text-sm text-gray-400">Record final readings before returning vehicle and driver to the available pool.</p><div className="mt-5 space-y-4"><Input label="Final Odometer" type="number" min="0" value={completion.finalOdometer} onChange={(event) => setCompletion((value) => ({ ...value, finalOdometer: event.target.value }))} error={errors.finalOdometer} /><Input label="Fuel Consumed (L)" type="number" min="0" value={completion.fuelConsumedL} onChange={(event) => setCompletion((value) => ({ ...value, fuelConsumedL: event.target.value }))} error={errors.fuelConsumedL} /><Input label="Fuel Price per L (₹)" type="number" min="0" value={completion.fuelPricePerL} onChange={(event) => setCompletion((value) => ({ ...value, fuelPricePerL: event.target.value }))} error={errors.fuelPricePerL} /></div><div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setCompletionTrip(null)}>Cancel</button><button className="btn-primary">Complete Trip</button></div></form></div>}
  </div>;
}
function Input({ label, error, ...props }) { return <label className="block text-xs font-medium text-gray-400">{label}<input className="input-field mt-1 w-full" {...props} />{error && <span className="mt-1 block text-xs text-status-red">{error}</span>}</label>; }
function Select({ label, error, children, ...props }) { return <label className="block text-xs font-medium text-gray-400">{label}<select className="input-field mt-1 w-full" {...props}>{children}</select>{error && <span className="mt-1 block text-xs text-status-red">{error}</span>}</label>; }
