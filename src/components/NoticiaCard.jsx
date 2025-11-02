// src/components/NoticiaCard.jsx
import { proxifyMedia } from "@services/newsApis.js"; // o desde donde lo expongas

export default function NoticiaCard({ item }) {
  const img = item?.imagen ? proxifyMedia(item.imagen) : "/placeholder.jpg";
  return (
    <article className="card">
      <img src={img} alt={item?.titulo || "Noticia"} loading="lazy" />
      <h3>{item?.titulo}</h3>
      <p>{item?.resumen}</p>
    </article>
  );
}
