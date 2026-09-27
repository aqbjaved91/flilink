export default function Loading() {
  return (
    <div>
      <div className="h-[106px] border-b border-line/70 bg-white px-4 pt-4">
        <div className="skeleton h-6 w-32" />
        <div className="mt-7 flex gap-5">
          <div className="skeleton h-4 w-14" />
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-4 w-16" />
        </div>
      </div>
      <div className="space-y-2.5 px-4 pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-[92px] rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
