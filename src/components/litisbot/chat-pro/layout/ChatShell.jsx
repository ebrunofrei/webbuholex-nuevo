export default function ChatShell({ header, children, composer }) {
  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
      
      {/* HEADER */}
      <div className="h-14 px-6 flex items-center border-b border-neutral-200 dark:border-neutral-800">
        {header}
      </div>

      {/* CONVERSATION */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
          {children}
        </div>
      </div>

      {/* COMPOSER */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {composer}
        </div>
      </div>
    </div>
  );
}