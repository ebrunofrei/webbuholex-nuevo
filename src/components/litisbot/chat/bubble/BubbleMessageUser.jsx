export default function BubbleMessageUser({ text }) {
  return (
    <div className="flex justify-end w-full">
      <div
        className="rounded-[1.5rem] px-4 py-3 text-white max-w-[88%]"
        style={{ background: "#5C2E0B" }}
      >
        {text}
      </div>
    </div>
  );
}
