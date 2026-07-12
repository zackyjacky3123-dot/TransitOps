export default function EmptyState({ icon = "📭", title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-3xl mb-3 opacity-60">{icon}</div>
      <p className="text-sm font-medium text-gray-300">{title}</p>
      {description && <p className="text-xs text-gray-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
