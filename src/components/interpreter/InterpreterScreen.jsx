export default function InterpreterScreen({
  onExit,
  originalText,
  translatedText,
}) {
  return (
    <div className="fixed inset-0 z-[10000] bg-white flex flex-col">
      <header className="h-14 flex items-center px-4 border-b">
        <button onClick={onExit} className="mr-3">
          ⬅
        </button>
        <div className="font-semibold">Intérprete jurídico</div>
      </header>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <section>
          <div className="text-xs font-semibold mb-1">
            Texto original
          </div>
          <div className="p-3 bg-gray-100 rounded">
            {originalText || "—"}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold mb-1">
            Traducción
          </div>
          <div className="p-3 bg-[#F7EFE8] rounded">
            {translatedText || "—"}
          </div>
        </section>
      </div>

      <footer className="p-4 border-t flex justify-center">
        <button className="w-20 h-20 rounded-full bg-[#5C2E0B] text-white">
          🎙️
        </button>
      </footer>
    </div>
  );
}
