const COLORS = [
  "bg-purple-500", "bg-red-500", "bg-pink-500", "bg-green-500",
  "bg-blue-500", "bg-amber-500", "bg-teal-500", "bg-indigo-500",
];

function colorForName(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = "md", ring = false }) {
  const sizes = { sm: "w-6 h-6 text-[10px]", md: "w-8 h-8 text-xs", lg: "w-10 h-10 text-sm" };
  return (
    <div
      title={name}
      className={`${sizes[size]} ${colorForName(name)} rounded-full flex items-center justify-center font-semibold text-white shrink-0 ${ring ? "ring-2 ring-bg" : ""}`}
    >
      {initials(name)}
    </div>
  );
}

export function AvatarStack({ names, max = 5 }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((n, i) => (
        <Avatar key={i} name={n} size="sm" ring />
      ))}
      {extra > 0 && (
        <div className="w-6 h-6 rounded-full bg-gray-700 border-2 border-bg flex items-center justify-center text-[10px] font-semibold text-gray-300">
          +{extra}
        </div>
      )}
    </div>
  );
}
