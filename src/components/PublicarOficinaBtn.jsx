import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import slugify from "slugify";
import { slugDisponible } from "@/utils/validarSlug";
import useLegalOSStore from "@/store/useLegalOSStore";

const PublicarOficinaBtn = () => {
  const { branding, plan } = useLegalOSStore();
  const [slug, setSlug] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [editSlug, setEditSlug] = React.useState(false);

  const generarSlug = () =>
    slugify(branding.nombreEstudio || "oficina", { lower: true, strict: true });

  React.useEffect(() => {
    setSlug(generarSlug());
  }, [branding.nombreEstudio]);

  const publicar = async () => {
    if (!slug) {
      setMsg("Ponle un nombre a tu oficina.");
      return;
    }
    const disponible = await slugDisponible(slug);
    if (!disponible) {
      setMsg("Ese nombre/slug ya está en uso. Elige otro.");
      setEditSlug(true);
      return;
    }
    await setDoc(doc(db, "oficinas_publicas", slug), {
      branding,
      plan,
      actualizado: new Date().toISOString()
    });
    setMsg("¡Oficina publicada!");
    window.open(`/oficina/${slug}`, "_blank");
  };

  return (
    <div className="my-6 p-4 border rounded-xl bg-blue-50">
      <div className="mb-2 font-semibold">URL pública de tu oficina:</div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs">https://buholex.com/oficina/</span>
        {editSlug ? (
          <input
            className="border px-2 rounded"
            value={slug}
            onChange={e => setSlug(slugify(e.target.value, { lower: true, strict: true }))}
          />
        ) : (
          <span className="font-mono px-2">{slug}</span>
        )}
        <button className="underline text-blue-700" onClick={() => setEditSlug(e => !e)}>
          {editSlug ? "Listo" : "Editar"}
        </button>
      </div>
      <button
        className="bg-[#2266bb] text-white px-4 py-2 rounded"
        onClick={publicar}
      >Publicar mi Oficina Virtual</button>
      {msg && <div className="mt-2 text-xs text-[#b03a1a]">{msg}</div>}
    </div>
  );
};
export default PublicarOficinaBtn;
