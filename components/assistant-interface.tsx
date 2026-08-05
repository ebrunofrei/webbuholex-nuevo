"use client";

import { useState } from "react";

type InterfaceState = "idle" | "draft" | "consent-required" | "ready";

export function AssistantInterface() {
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<InterfaceState>("idle");

  const prepare = () => {
    if (!consent) {
      setState("consent-required");
      return;
    }
    setState("ready");
  };

  return (
    <section className="assistant-demo" aria-labelledby="assistant-demo-title">
      <div className="assistant-demo-header">
        <div className="assistant-mark" aria-hidden="true">B</div>
        <div><h2 id="assistant-demo-title">Asistente Legal BúhoLex</h2><p>Orientación inicial de demostración</p></div>
        <span className="status-dot">Demostración local</span>
      </div>
      <div className="assistant-conversation" aria-live="polite">
        <div className="assistant-bubble">
          <strong>¿Cómo puedo orientarle?</strong>
          <p>Describa brevemente su situación, indicando país o jurisdicción y qué necesita resolver. Evite incluir documentos de identidad, datos bancarios o información sensible en esta demostración.</p>
        </div>
        {state === "consent-required" ? <p className="form-alert" role="alert">Debe confirmar el aviso de privacidad antes de preparar la consulta.</p> : null}
        {state === "ready" ? <div className="assistant-bubble success"><strong>Consulta preparada</strong><p>Ningún dato ha sido transmitido. Las capacidades avanzadas estarán disponibles dentro del Espacio Virtual Inteligente.</p></div> : null}
      </div>
      <div className="assistant-composer">
        <label htmlFor="assistant-message">Su consulta inicial</label>
        <textarea id="assistant-message" value={message} maxLength={3000} onChange={(event) => { setMessage(event.target.value); setState("draft"); }} placeholder="Ejemplo: Necesito identificar qué información debo reunir para evaluar..." rows={4} />
        <label className="check-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> <span>He leído el aviso de alcance y autorizo el tratamiento de esta consulta para orientación inicial.</span></label>
        <div className="composer-actions"><span>{message.length}/3000</span><button className="button" type="button" disabled={message.trim().length < 10} onClick={prepare}>Preparar consulta</button></div>
      </div>
      <p className="security-note">Demostración local · Sin envío de información</p>
    </section>
  );
}
