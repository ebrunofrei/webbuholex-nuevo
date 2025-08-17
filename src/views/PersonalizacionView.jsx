import SelectorPlantillaOficina from "../components/SelectorPlantillaOficina";
import PanelPersonalizacion from "../oficinaVirtual/components/PanelPersonalizacion";
import PublicarOficinaBtn from "../components/PublicarOficinaBtn";

const PersonalizacionView = () => (
  <div className="max-w-3xl mx-auto py-10 px-2">
    <h1 className="text-2xl font-bold text-[#b03a1a] mb-6">Personaliza tu Oficina Virtual</h1>
    {/* 1. Plantillas prediseñadas (opcional) */}
    <SelectorPlantillaOficina />
    {/* 2. Panel de personalización */}
    <PanelPersonalizacion />
    {/* 3. Botón para publicar (URL única) */}
    <PublicarOficinaBtn />
    {/* 4. Puedes agregar una preview aquí si lo deseas */}
  </div>
);

export default PersonalizacionView;
