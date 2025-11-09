// src/components/NoticiaCard.jsx
import { proxifyMedia } from "@/services/newsApis.js"; // o donde lo tengas

const FALLBACK_IMG = "/assets/img/noticia_fallback.png";

export default function NoticiaCard({ item }) {
  const src0 = item?.imagen ? proxifyMedia(item.imagen) : "";
  const src = src0 || FALLBACK_IMG;

  return (
    <article className="card">
      <img
        src={src}
        alt={item?.titulo || "Noticia"}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          const el = e.currentTarget;
          if (el.dataset.fbk === "1") return; // evita loop si el fallback falla
          el.dataset.fbk = "1";
          el.src = FALLBACK_IMG;
        }}
        style={{ objectFit: "cover", aspectRatio: "16 / 9", background: "#f5f5f5" }}
      />
      <h3>{item?.titulo}</h3>
      <p>{item?.resumen}</p>
    </article>
  );
}
