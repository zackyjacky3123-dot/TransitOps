const STYLES = {
  // Vehicle statuses
  available: 'text-status-green border-status-green/40 bg-status-green/10',
  on_trip: 'text-status-blue border-status-blue/40 bg-status-blue/10',
  in_shop: 'text-status-orange border-status-orange/40 bg-status-orange/10',
  retired: 'text-status-red border-status-red/40 bg-status-red/10',

  // Driver statuses
  off_duty: 'text-status-gray border-status-gray/40 bg-status-gray/10',
  suspended: 'text-status-orange border-status-orange/40 bg-status-orange/10',

  // Trip statuses
  draft: 'text-status-gray border-status-gray/40 bg-status-gray/10',
  dispatched: 'text-status-blue border-status-blue/40 bg-status-blue/10',
  completed: 'text-status-green border-status-green/40 bg-status-green/10',
  cancelled: 'text-status-red border-status-red/40 bg-status-red/10',

  // Maintenance statuses
  active: 'text-status-orange border-status-orange/40 bg-status-orange/10',
};

const LABELS = {
  available: 'Available',
  on_trip: 'On Trip',
  in_shop: 'In Shop',
  retired: 'Retired',
  off_duty: 'Off Duty',
  suspended: 'Suspended',
  draft: 'Draft',
  dispatched: 'Dispatched',
  completed: 'Completed',
  cancelled: 'Cancelled',
  active: 'Active',
};

export default function StatusBadge({ status, label }) {
  const style = STYLES[status] || 'text-status-gray border-status-gray/40 bg-status-gray/10';
  const text = label || LABELS[status] || status;
  return <span className={`badge ${style}`}>{text}</span>;
}
