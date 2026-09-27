export default function Loading() {
  return (
    <div className="min-h-dvh bg-white">
      <div className="h-[76px] border-b border-line/70 px-4 pt-4">
        <div className="skeleton h-6 w-40" />
      </div>
      <div className="px-5 pt-8">
        <div className="skeleton h-5 w-52" />
        <div className="skeleton mt-3 h-13 rounded-2xl" />
        <div className="skeleton mt-5 h-13 rounded-2xl" />
      </div>
    </div>
  );
}
