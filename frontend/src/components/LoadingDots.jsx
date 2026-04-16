export default function LoadingDots() {
  return (
    <div className="flex items-end justify-start">
      <div className="bg-white border border-[#e4d4c4] rounded-[1.25rem] rounded-bl-[0.3rem] px-4 py-3.5 flex gap-1.5 items-center shadow-sm">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}
