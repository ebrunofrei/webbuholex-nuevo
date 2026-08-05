import type { ProductDocument, ProductFileMetadata } from "@/types/product-package";

export const rentalHousingFilesVerifiedAt = "2026-07-28T01:19:27.797Z";

export interface VerifiedProductFileRecord {
  documentId: string;
  relativeReference: string;
  metadata: ProductFileMetadata;
}

function verifiedFile(documentId: string, relativeReference: string, byteSize: number, sha256: string): VerifiedProductFileRecord {
  const physicalFileName = relativeReference.slice(relativeReference.lastIndexOf("/") + 1);
  return {
    documentId,
    relativeReference,
    metadata: {
      fileName: physicalFileName,
      physicalFileName,
      extension: physicalFileName.toLowerCase().endsWith(".pdf") ? "pdf" : "docx",
      byteSize,
      sha256,
      verifiedAt: rentalHousingFilesVerifiedAt,
      exists: true,
      readable: true,
      nameMatches: true,
      duplicateName: false,
      duplicateHash: false,
      warnings: [],
      errors: [],
    },
  };
}

export const rentalHousingVerifiedFileInventory: Readonly<Record<string, VerifiedProductFileRecord>> = {
  "bl-leg-con-001-contract-1": verifiedFile("bl-leg-con-001-contract-1", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/01_CONTRATOS_EDITABLES/01-Contrato-Arrendamiento-Vivienda-Ordinario.docx", 78006, "c3f72d9eeeab480ee582cf1f483b265065bbc99679c6912c5b1d608cdc79d888"),
  "bl-leg-con-001-contract-2": verifiedFile("bl-leg-con-001-contract-2", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/01_CONTRATOS_EDITABLES/02-Contrato-Arrendamiento-Vivienda-Allanamiento-Futuro.docx", 80382, "464ba41e1106c272684f9e53985167b16847fc489df7d9f7d9b43281e95f1ee7"),
  "bl-leg-con-001-contract-3": verifiedFile("bl-leg-con-001-contract-3", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/01_CONTRATOS_EDITABLES/03-Contrato-Arrendamiento-Vivienda-Ley-30933.docx", 83729, "d0ab3a252b35f1b23859660c487d917b0f6be80ac3096e6aee5dbd9c2c57bbff"),
  "bl-leg-con-001-annex-1": verifiedFile("bl-leg-con-001-annex-1", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/01-Anexo-Acta-de-Entrega-e-Inventario.docx", 42967, "149dbbdee83b32e8c259d91fc658d0424b46ab0dca8789b939755e358a1c8650"),
  "bl-leg-con-001-annex-2": verifiedFile("bl-leg-con-001-annex-2", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/02-Anexo-Acta-de-Devolucion-del-Inmueble.docx", 45307, "72146594eab5abad5b5ee1e893a40f847aef8f0d2d652d390fd8ef3b9a457e83"),
  "bl-leg-con-001-annex-3": verifiedFile("bl-leg-con-001-annex-3", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/03-Anexo-Registro-Fotografico-Inicial.docx", 35514, "d40459be7e647ec27e357cfbc107ed148dce71b1ec40849c97c021680bec8b5d"),
  "bl-leg-con-001-annex-4": verifiedFile("bl-leg-con-001-annex-4", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/04-Anexo-Constancia-Reglamento-Interno.docx", 35650, "4fa459d998d84fcebca45c68bc890d2472e39775e89f290e1f19c882e4403ae1"),
  "bl-leg-con-001-annex-5": verifiedFile("bl-leg-con-001-annex-5", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/05-Anexo-Relacion-de-Ocupantes-Autorizados.docx", 36192, "c73e06e1b71fffab83ac61a4f96f691470c87e48757df8125fa6b2c5dd56cda2"),
  "bl-leg-con-001-annex-6": verifiedFile("bl-leg-con-001-annex-6", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/06-Anexo-Autorizacion-y-Condiciones-para-Mascotas.docx", 36128, "75756e880d7cc4c9993c9132ac8c9a07518f539a7ba839a76865c47e0098a7a5"),
  "bl-leg-con-001-annex-7": verifiedFile("bl-leg-con-001-annex-7", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/07-Anexo-Autorizacion-de-Mejoras-Instalaciones-o-Modificaciones.docx", 38082, "759d139a449d74002ed98a110fd71b0b8bc009003f5eaeb6debc9bb33ff80a80"),
  "bl-leg-con-001-annex-8": verifiedFile("bl-leg-con-001-annex-8", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/02_ANEXOS_EDITABLES/08-Anexo-Cronograma-y-Constancia-del-Primer-Pago.docx", 39719, "8cf00f19a124078d22a1a275f179e9104d17503bc13f09a7e97a6dbe05eeaa5e"),
  "bl-leg-con-001-guide-pdf": verifiedFile("bl-leg-con-001-guide-pdf", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/03_GUIA_DE_USO/GUIA-DE-USO-Y-PERSONALIZACION-BL-LEG-CON-001.pdf", 137964, "1de05e63a8eda419141fa141593daaa40faaffe9949ab39312f4b1e7215f4952"),
  "bl-leg-con-001-checklist-docx": verifiedFile("bl-leg-con-001-checklist-docx", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/04_LISTAS_DE_VERIFICACION/CHECKLIST-PREVIO-A-LA-FIRMA-BL-LEG-CON-001.docx", 35371, "0123301f913beb44c0311767d4396d92e12657439333ae788ef00cb5e4f447b1"),
  "bl-leg-con-001-checklist-pdf": verifiedFile("bl-leg-con-001-checklist-pdf", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/04_LISTAS_DE_VERIFICACION/CHECKLIST-PREVIO-A-LA-FIRMA-BL-LEG-CON-001.pdf", 75223, "5d7c993e1e63a1155aba4cbb1b32904ebb60c777640de93119bd4afdd2dfbbdc"),
  "bl-leg-con-001-license-pdf": verifiedFile("bl-leg-con-001-license-pdf", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/05_INFORMACION_DEL_PRODUCTO/LICENCIA-DE-USO-BL-LEG-CON-001.pdf", 55123, "aad6629907f9345d77cc255ec450d5e663195ee3c392be53fe64bf0b2d289d67"),
  "bl-leg-con-001-readme-pdf": verifiedFile("bl-leg-con-001-readme-pdf", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/05_INFORMACION_DEL_PRODUCTO/LEEME-BL-LEG-CON-001.pdf", 53950, "dd3dee381a79fefba23f956e762d525702e8fd163290ad22f480274131b2da2d"),
  "bl-leg-con-001-technical-sheet-pdf": verifiedFile("bl-leg-con-001-technical-sheet-pdf", "product-assets/BL-LEG-CON-001/04_PRODUCTO_PUBLICO/05_INFORMACION_DEL_PRODUCTO/FICHA-TECNICA-Y-COMERCIAL-BL-LEG-CON-001.pdf", 65127, "7c425ad9b15ca037c46856c46a41fbfb555d51b0fd26e84865783bc8d1ce1183"),
  "bl-leg-con-001-master-source": verifiedFile("bl-leg-con-001-master-source", "product-assets/BL-LEG-CON-001/03_EDICION/contrato-arrendamiento-vivienda-plantilla-maestra-v0.10.docx", 91448, "ffa0620b4ec8361224dd2435756c3e6d916507b81e32480ab5039eea4ebb5681"),
  "bl-leg-con-001-guide-source": verifiedFile("bl-leg-con-001-guide-source", "product-assets/BL-LEG-CON-001/03_EDICION/DOCUMENTOS_DEL_PRODUCTO/GUIA-DE-USO-Y-PERSONALIZACION-BL-LEG-CON-001.docx", 40544, "8038e6e81ca2f5fd22407f7cb701f4d5e1d22e27b9da738b6890dacef78d2746"),
  "bl-leg-con-001-license-source": verifiedFile("bl-leg-con-001-license-source", "product-assets/BL-LEG-CON-001/03_EDICION/DOCUMENTOS_DEL_PRODUCTO/LICENCIA-DE-USO-BL-LEG-CON-001.docx", 33493, "a6a0e0ce2536a06173e5b0a7e1d4dbf44c8a2ae26d7ed1716ceb509dc0b9d892"),
  "bl-leg-con-001-technical-sheet-source": verifiedFile("bl-leg-con-001-technical-sheet-source", "product-assets/BL-LEG-CON-001/03_EDICION/DOCUMENTOS_DEL_PRODUCTO/FICHA-TECNICA-Y-COMERCIAL-BL-LEG-CON-001.docx", 33231, "bb8fb401dddde06226389b8535ef4e07367f53be2ad331e568f6e59dda8d8d05"),
  "bl-leg-con-001-readme-source": verifiedFile("bl-leg-con-001-readme-source", "product-assets/BL-LEG-CON-001/03_EDICION/DOCUMENTOS_DEL_PRODUCTO/LEEME-BL-LEG-CON-001.docx", 31877, "5b740019c06131bb457efa20a83bff0d81aae85efe399587589243d4875b011e"),
};

export function getVerifiedProductFileRecord(documentId: string): VerifiedProductFileRecord {
  const record = rentalHousingVerifiedFileInventory[documentId];
  if (!record) throw new Error(`No existe un archivo físico verificado para ${documentId}.`);
  return record;
}

export function getVerifiedProductDocumentState(documentId: string): Pick<ProductDocument, "status" | "fileRef" | "fileMetadata"> {
  const record = getVerifiedProductFileRecord(documentId);
  return { status: "verified", fileRef: record.relativeReference, fileMetadata: record.metadata };
}
