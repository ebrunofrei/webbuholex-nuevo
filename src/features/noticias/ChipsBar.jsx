
export default function ChipsBar({ items = [], value, onChange }) {
  return (
    <div className="w-full flex flex-wrap gap-2">
      {items.map((chip) => {
        const active = chip.id === value;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange?.(chip.id)}
            className={[
              "px-3 py-1.5 rounded-full text-sm font-semibold border transition",
              active
                ? "bg-[#b03a1a] text-white border-[#b03a1a]"
                : "bg-white text-[#4b2e19] border-[#e7d9cc] hover:bg-[#fff6f2]",
            ].join(" ")}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
