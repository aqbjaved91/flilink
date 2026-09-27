export default function Loading() {
  return (
    <div className="min-h-dvh bg-white">
      <div className="h-14 border-b border-line/70 px-4 pt-4">
        <div className="skeleton h-6 w-32" />
      </div>
      <div className="space-y-5 px-4 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton aspect-[4/5] rounded-3xl" />
          <div className="skeleton aspect-[4/5] rounded-3xl" />
        </div>
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-13 rounded-2xl" />
          <div className="skeleton h-13 rounded-2xl" />
        </div>
        <div className="skeleton h-13 rounded-2xl" />
      </div>
    </div>
  );
}
