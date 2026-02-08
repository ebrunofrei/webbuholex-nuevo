import { sanitizeHtml } from "./utils/text.utils";

export default function BubbleMessageBot({ html }) {
  return (
    <div
      className="max-w-[92%] rounded-[1.5rem] shadow border px-4 py-4 bg-white"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
