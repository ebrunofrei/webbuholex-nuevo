import type { TemplateProduct } from "@/types/catalog";
import type {
  ManualProductDelivery,
  ProductDocument,
  ProductDocumentRequirement,
  ProductPackage,
  ProductPackageIntegrityError,
  ProductPackageInventory,
  ProductPackageStatus,
} from "@/types/product-package";

export function getPackageDocuments(productPackage: ProductPackageInventory): readonly ProductDocument[] {
  return [
    ...productPackage.internalFiles,
    ...productPackage.customerEditableFiles,
    ...productPackage.customerPdfFiles,
    ...productPackage.publicInformationFiles,
  ];
}

export function getProductPublicationRequirements(product: TemplateProduct, productPackage: ProductPackageInventory): readonly ProductDocumentRequirement[] {
  const documents = getPackageDocuments(productPackage);
  const deliverableDocuments = documents.filter((document) => document.intendedForDelivery && document.requiredBeforePublication);
  const commercialDocuments = documents.filter((document) => document.purpose === "contract" || document.purpose === "annex");
  const requiredAuxiliaryDocuments = documents.filter((document) => document.requiredBeforePublication && ["guide", "checklist", "license", "readme"].includes(document.purpose));
  const licenseDocument = documents.find((document) => document.purpose === "license");
  const currentVersion = product.versionHistory.find((version) => version.version === product.version);
  const allPresentAndVerified = (purpose: ProductDocument["purpose"], expected: number) => {
    const matches = documents.filter((document) => document.purpose === purpose);
    return matches.length === expected && matches.every((document) => document.fileRef !== null && document.fileMetadata !== null && ["verified", "approved"].includes(document.status));
  };

  return [
    { code: "price_approved", label: "Precio aprobado", description: "El titular debe aprobar un importe comercial antes de publicar.", blocking: true, resolved: product.priceStatus === "approved" && product.price !== null },
    { code: "currency_approved", label: "Moneda aprobada", description: "El titular debe definir y aprobar la moneda comercial.", blocking: true, resolved: product.priceStatus === "approved" && product.currency !== null },
    { code: "license_approved", label: "Licencia de uso aprobada", description: "La licencia definitiva y su documento PDF deben estar aprobados.", blocking: true, resolved: product.licenseStatus === "approved" && product.usageLicense !== null && licenseDocument?.status === "approved" },
    { code: "editorial_owner_identified", label: "Responsable editorial real", description: "Debe registrarse una persona responsable identificada por el titular.", blocking: true, resolved: product.editorialOwnerId !== null },
    { code: "legal_reviewer_identified", label: "Revisor jurídico real", description: "La versión vigente debe identificar a la persona responsable de su revisión jurídica.", blocking: true, resolved: currentVersion?.reviewerId != null },
    { code: "publication_authorized", label: "Autorización de publicación", description: "Se requiere autorización expresa, autorizante y fecha.", blocking: true, resolved: product.publicationAuthorization.authorized && product.publicationAuthorization.authorizedBy !== null && product.publicationAuthorization.authorizedAt !== null },
    { code: "deliverable_routes_verified", label: "Rutas verificadas de entregables", description: "Cada documento obligatorio para el cliente debe tener referencia verificada.", blocking: true, resolved: deliverableDocuments.length > 0 && deliverableDocuments.every((document) => document.fileRef !== null && ["verified", "approved"].includes(document.status)) },
    { code: "commercial_files_received", label: "Archivos comerciales reales incorporados", description: "Los tres contratos y ocho anexos deben estar recibidos y verificados.", blocking: true, resolved: commercialDocuments.length === 11 && commercialDocuments.every((document) => document.fileRef !== null && ["verified", "approved"].includes(document.status)) },
    { code: "required_auxiliary_documents", label: "Documentos auxiliares obligatorios", description: "Guía, checklist, licencia y Léeme deben estar incorporados y aprobados para el paquete.", blocking: true, resolved: requiredAuxiliaryDocuments.length > 0 && requiredAuxiliaryDocuments.every((document) => document.fileRef !== null && document.status === "approved") },
    { code: "delivery_channel_approved", label: "Canal de entrega aprobado", description: "Debe definirse y aprobarse el canal institucional de entrega manual.", blocking: true, resolved: productPackage.deliveryChannelStatus === "approved" },
    { code: "commercial_refund_rules", label: "Reglas comerciales y de reembolso", description: "Las reglas comerciales y de reembolso deben estar aprobadas.", blocking: true, resolved: product.commercialPolicyStatus === "approved" && productPackage.refundRulesStatus === "approved" },
    { code: "contracts_received", label: "Contratos incorporados", description: "Los tres contratos comerciales deben existir y estar verificados.", blocking: true, resolved: allPresentAndVerified("contract", 3) },
    { code: "annexes_received", label: "Anexos incorporados", description: "Los ocho anexos editables deben existir y estar verificados.", blocking: true, resolved: allPresentAndVerified("annex", 8) },
    { code: "guide_received", label: "Guía incorporada", description: "La guía PDF para el cliente debe existir y estar verificada.", blocking: true, resolved: allPresentAndVerified("guide", 1) },
    { code: "checklist_received", label: "Checklist incorporado", description: "Las versiones Word y PDF del checklist deben existir y estar verificadas.", blocking: true, resolved: allPresentAndVerified("checklist", 2) },
    { code: "readme_received", label: "Léeme incorporado", description: "El documento Léeme PDF debe existir y estar verificado.", blocking: true, resolved: allPresentAndVerified("readme", 1) },
    { code: "license_file_received", label: "Licencia física incorporada", description: "El PDF de licencia debe existir y estar verificado; su aprobación se controla por separado.", blocking: true, resolved: allPresentAndVerified("license", 1) },
    { code: "technical_sheet_received", label: "Ficha técnica incorporada", description: "La ficha técnica PDF debe existir y estar verificada, sin adquirir visibilidad pública.", blocking: true, resolved: allPresentAndVerified("technical_sheet", 1) },
    { code: "document_integrity_verified", label: "Integridad documental verificada", description: "Todos los archivos requeridos deben tener referencia privada, tamaño, hash y verificación registrada.", blocking: true, resolved: documents.filter((document) => document.requiredBeforePublication).every((document) => document.fileRef !== null && document.fileMetadata !== null && document.fileMetadata.verifiedAt !== null && ["verified", "approved"].includes(document.status)) },
  ];
}

export function calculateProductPackageStatus(product: TemplateProduct, productPackage: ProductPackageInventory, requirements: readonly ProductDocumentRequirement[]): ProductPackageStatus {
  const documents = getPackageDocuments(productPackage);
  if (documents.length === 0) return "draft";
  if (product.editorialStatus === "withdrawn") return "withdrawn";
  const unresolved = requirements.some((requirement) => !requirement.resolved);
  if (!unresolved && (product.editorialStatus === "published" || product.editorialStatus === "updated")) return "published";
  if (!unresolved && product.editorialStatus === "approved") return "ready_for_publication";
  if (!unresolved) return "approved_for_packaging";
  const requiredDocuments = documents.filter((document) => document.requiredBeforePublication);
  if (requiredDocuments.some((document) => ["planned", "replaced", "withdrawn"].includes(document.status))) return "incomplete";
  if (requiredDocuments.every((document) => document.status === "approved")) return "approved_for_packaging";
  if (requiredDocuments.every((document) => ["received", "verified", "approved"].includes(document.status))) return "ready_for_review";
  return "incomplete";
}

export function validateProductPackageIntegrity(
  product: TemplateProduct,
  productPackage: ProductPackage,
  delivery?: ManualProductDelivery,
): readonly ProductPackageIntegrityError[] {
  const errors: ProductPackageIntegrityError[] = [];
  const documents = getPackageDocuments(productPackage);
  const customerDocuments = [...productPackage.customerEditableFiles, ...productPackage.customerPdfFiles];
  const add = (code: ProductPackageIntegrityError["code"], message: string, documentId: string | null = null) => errors.push({ code, documentId, message });

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const seenHashes = new Set<string>();
  const seenReferences = new Set<string>();
  documents.forEach((document) => {
    if (seenIds.has(document.id)) add("duplicate_document_id", "El identificador documental está duplicado.", document.id);
    const normalizedName = document.fileName.toLocaleLowerCase("es-PE");
    if (seenNames.has(normalizedName)) add("duplicate_file_name", "El nombre de archivo está duplicado.", document.id);
    seenIds.add(document.id);
    seenNames.add(normalizedName);
    if (document.status === "planned" && (document.fileRef !== null || document.fileMetadata !== null)) add("missing_file_marked_received", "Un archivo pendiente no puede conservar referencia ni metadatos físicos.", document.id);
    if (["received", "verified", "approved"].includes(document.status) && (!document.fileRef || !document.fileMetadata)) add("metadata_without_file", "Un archivo existente requiere referencia privada y metadatos calculados.", document.id);
    if (document.status === "approved" && document.fileMetadata?.verifiedAt === null) add("unverified_file_marked_approved", "Un archivo no verificado no puede marcarse como aprobado.", document.id);
    if (document.fileRef && (!document.fileRef.startsWith(`product-assets/${product.code}/`) || /^[A-Za-z]:[\\/]/.test(document.fileRef) || document.fileRef.startsWith("/") || /(^|\/)public(\/|$)/i.test(document.fileRef) || /^https?:\/\//i.test(document.fileRef))) add("unsafe_private_reference", "La referencia debe ser relativa, privada, pertenecer al producto y ser ajena a public/.", document.id);
    if (document.fileRef) {
      if (seenReferences.has(document.fileRef)) add("duplicate_file_reference", "La referencia privada está duplicada.", document.id);
      seenReferences.add(document.fileRef);
    }
    if (document.fileMetadata) {
      if (seenHashes.has(document.fileMetadata.sha256)) add("duplicate_file_content", "El contenido físico coincide con otro archivo del inventario.", document.id);
      seenHashes.add(document.fileMetadata.sha256);
      if (document.fileMetadata.physicalFileName !== document.fileName || !document.fileMetadata.nameMatches) add("physical_name_mismatch", "El nombre físico no coincide con el nombre declarado.", document.id);
      if (["verified", "approved"].includes(document.status) && (!document.fileMetadata.exists || !document.fileMetadata.readable || document.fileMetadata.errors.length > 0)) add("unreadable_verified_file", "Un documento verificado debe existir, ser legible y carecer de errores de inspección.", document.id);
    }
    if (document.downloadable && (!document.fileRef || document.status !== "approved" || !document.publicAuthorized)) add("download_without_verified_file", "Una descarga exige ruta, estado aprobado y autorización.", document.id);
    if (document.audience === "public_information" && document.status === "approved" && !document.publicAuthorized) add("public_document_without_authorization", "Un documento público aprobado requiere autorización.", document.id);
    if (document.status === "withdrawn" && (document.deliverable || document.downloadable)) add("withdrawn_document_deliverable", "Un documento retirado no puede entregarse.", document.id);
    if (document.status === "replaced" && (document.deliverable || document.downloadable)) add("replaced_document_deliverable", "Un documento reemplazado no puede entregarse como vigente.", document.id);
  });

  customerDocuments.forEach((document) => {
    if (document.purpose === "master_source") add("master_in_customer_package", "La plantilla maestra no puede formar parte del paquete del cliente.", document.id);
    if (document.audience === "internal") add("internal_document_in_customer_package", "Un documento interno no puede formar parte del paquete del cliente.", document.id);
  });

  if (productPackage.packageVersion !== product.version) add("package_version_mismatch", "La versión del paquete no coincide con la versión editorial aprobada.");
  const claimsReadiness = ["ready_for_publication", "published"].includes(productPackage.packageStatus) || product.editorialStatus === "published" || product.editorialStatus === "updated";
  if (claimsReadiness && !documents.some((document) => document.purpose === "license" && document.status === "approved" && document.fileRef)) add("license_missing_before_publication", "La licencia aprobada debe existir antes de publicar.");
  if (claimsReadiness && productPackage.requiredBeforePublication.some((requirement) => !requirement.resolved)) add("publication_blockers_active", "El paquete conserva bloqueos obligatorios de publicación.");

  if (delivery) {
    if (delivery.productCode !== product.code) add("delivery_product_mismatch", "La entrega no corresponde al producto evaluado.");
    if (delivery.packageVersion !== productPackage.packageVersion) add("package_version_mismatch", "La versión de entrega no coincide con el paquete.");
    const documentsById = new Map(documents.map((document) => [document.id, document]));
    delivery.deliveredDocumentIds.forEach((documentId) => {
      const document = documentsById.get(documentId);
      if (!document) {
        add("delivery_contains_unknown_document", "La entrega contiene un identificador desconocido.", documentId);
        return;
      }
      if (document.audience === "internal" || document.purpose === "master_source") add("delivery_contains_internal_document", "La entrega no puede contener documentos internos.", documentId);
      if (!document.deliverable || !document.fileRef || document.status !== "approved") add("delivery_contains_unavailable_document", "El documento todavía no está disponible para entrega.", documentId);
    });
  }
  return errors;
}
