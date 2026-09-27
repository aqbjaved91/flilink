export default function Loading() {
  return (
    <div className="px-5 pt-5">
      <div className="flex items-center justify-between">
        <div className="skeleton h-9 w-32" />
        <div className="skeleton h-11 w-11 rounded-full" />
      </div>
      <div className="skeleton mt-8 h-9 w-44" />
      <div className="skeleton mt-2 h-5 w-52" />
      <div className="mt-5 flex gap-2.5">
        <div className="skeleton h-11 w-28" />
        <div className="skeleton h-11 w-36" />
      </div>
      <div className="skeleton mt-5 h-[380px] rounded-[28px]" />
    </div>
  );
}
