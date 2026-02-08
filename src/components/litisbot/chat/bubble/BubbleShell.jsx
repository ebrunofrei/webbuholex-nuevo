export default function BubbleShell({ header, children, footer }) {
  return (
    <div className="fixed bottom-24 right-6 w-[420px] max-h-[80vh] bg-white shadow-xl rounded-xl flex flex-col">
      {header}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {children}
      </div>
      {footer}
    </div>
  );
}
