export default function Loading() {
  return (
    <div>
      <div className="h-14 border-b border-line/70 bg-white px-4 pt-4">
        <div className="skeleton h-6 w-44" />
      </div>
      <div className="px-4 pt-4">
        <div className="skeleton h-[300px] rounded-[28px]" />
        <div className="skeleton mt-6 h-5 w-28" />
        <div className="mt-3 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[116px] rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
