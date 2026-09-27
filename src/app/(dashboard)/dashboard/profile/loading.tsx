export default function Loading() {
  return (
    <div>
      <div className="h-14 border-b border-line/70 bg-white px-4 pt-4">
        <div className="skeleton h-6 w-24" />
      </div>
      <div className="space-y-4 px-4 pt-5">
        <div className="skeleton h-[196px] rounded-[28px]" />
        <div className="skeleton h-[400px] rounded-[28px]" />
      </div>
    </div>
  );
}
