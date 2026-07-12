export function TableSkeleton({ columns = 5, rows = 4 }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r} className="border-t border-border">
            {Array.from({ length: columns }).map((_, c) => (
              <td key={c} className="py-3 px-4">
                <div className="skeleton h-4 w-full max-w-[120px]" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="card">
      <div className="skeleton h-3 w-20 mb-3" />
      <div className="skeleton h-7 w-16" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card space-y-3">
      <div className="skeleton h-4 w-1/3" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-2/3" />
    </div>
  );
}
