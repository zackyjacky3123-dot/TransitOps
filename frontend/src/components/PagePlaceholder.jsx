export default function PagePlaceholder({ title, description }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}

      <div className="panel mt-6 flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">
          {title} module scaffolded — screen build lands in the next pass.
        </p>
      </div>
    </div>
  );
}
