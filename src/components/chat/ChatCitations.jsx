import React from "react";
export default function ChatCitations({ citations = [] }) {
  if (!citations.length) return null;
  return (
    <div className="chat-citations">
      <h4>Citas y fuentes</h4>
      <ol>
        {citations.map((c, i) => (
          <li key={i}>
            <strong>{c.title}</strong> <em>({c.source})</em><br/>
            <a href={c.url} target="_blank" rel="noreferrer">{c.url}</a>
            {c.date ? <div>Fecha: {c.date}</div> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
