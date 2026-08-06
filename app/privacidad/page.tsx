import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata(
  "Política de Privacidad",
  "Política de privacidad de BúhoLex y tratamiento de datos personales.",
  "/privacidad/"
);

export default function PrivacyPage() {
  return (
    <main>
      <PageHero
        eyebrow="LEGAL"
        title="Política de Privacidad"
        description="Información sobre el tratamiento de datos personales en BúhoLex."
        status="Versión 1.0 — Pendiente de publicación"
      />
      <section className="content-section">
        <div className="container">
          <article className="legal-copy" style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
            <nav aria-label="Índice de la Política de Privacidad" style={{ background: "var(--background-secondary)", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem" }}>
              <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Índice</h2>
              <ol style={{ margin: 0, paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li><a href="#identificacion">Identificación del titular</a></li>
                <li><a href="#alcance">Alcance</a></li>
                <li><a href="#categorias">Categorías de datos</a></li>
                <li><a href="#finalidades">Finalidades</a></li>
                <li><a href="#base-juridica">Base jurídica</a></li>
                <li><a href="#consulta-profesional">Consulta profesional por WhatsApp y correo</a></li>
                <li><a href="#buho-analitico">Búho Analítico</a></li>
                <li><a href="#conservacion">Conservación</a></li>
                <li><a href="#destinatarios">Destinatarios y proveedores</a></li>
                <li><a href="#transferencias">Transferencias internacionales</a></li>
                <li><a href="#seguridad">Seguridad</a></li>
                <li><a href="#derechos">Derechos del titular</a></li>
                <li><a href="#bancos-datos">Bancos de datos personales</a></li>
                <li><a href="#cookies">Cookies y tecnologías similares</a></li>
                <li><a href="#menores">Menores de edad</a></li>
                <li><a href="#cambios">Cambios</a></li>
              </ol>
            </nav>

            <section id="identificacion">
              <h2>1. Identificación del titular</h2>
              <p>
                BúhoLex es una marca y plataforma digital de titularidad y operación de <strong>{siteConfig.legalName}</strong>,
                identificada con RUC N.° {siteConfig.ruc}, que opera institucionalmente bajo la identidad <strong>{siteConfig.institutionalIdentity}</strong>.
              </p>
              <ul>
                <li><strong>Domicilio:</strong> {siteConfig.legalAddress}</li>
                <li><strong>Correo corporativo:</strong> <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a></li>
                <li><strong>Teléfono / WhatsApp:</strong> {siteConfig.contact.phone}</li>
                <li><strong>Responsable interno de privacidad:</strong> {siteConfig.internalPrivacyOfficer} (Abogado de la División de Asuntos Legales)</li>
                <li><strong>Gerente general:</strong> {siteConfig.legalRepresentative}</li>
              </ul>
            </section>

            <section id="alcance">
              <h2>2. Alcance</h2>
              <p>Esta política se aplica a los tratamientos de datos derivados de:</p>
              <ul>
                <li>La navegación pública en nuestro sitio web.</li>
                <li>El contacto institucional.</li>
                <li>La solicitud de consulta profesional.</li>
                <li>El uso de Búho Analítico.</li>
                <li>El uso de futuras cuentas o servicios (únicamente cuando sean habilitados).</li>
                <li>La atención de solicitudes vinculadas a la privacidad.</li>
              </ul>
            </section>

            <section id="categorias">
              <h2>3. Categorías de datos</h2>
              <p>Procesamos información según el flujo de interacción:</p>
              <h3>Consulta profesional</h3>
              <ul>
                <li>Nombres.</li>
                <li>Correo electrónico.</li>
                <li>Teléfono o WhatsApp.</li>
                <li>Medio de contacto preferido.</li>
                <li>Materia y jurisdicción del caso.</li>
                <li>Modalidad de atención deseada y urgencia.</li>
                <li>Descripción del caso proporcionada.</li>
                <li>Cualquier otro dato incluido voluntariamente por el usuario.</li>
              </ul>
              <h3>Búho Analítico</h3>
              <ul>
                <li>Texto jurídico ingresado.</li>
                <li>Aceptaciones y confirmaciones.</li>
                <li>Metadatos estrictamente técnicos necesarios para procesar la solicitud.</li>
              </ul>
              <h3>Navegación</h3>
              <ul>
                <li>Información técnica procesable por nuestra infraestructura de alojamiento.</li>
                <li>Dirección IP.</li>
                <li>Navegador y dispositivo utilizado.</li>
                <li>Fecha, hora y ruta solicitada.</li>
                <li>Registros técnicos de seguridad y funcionamiento, cuando corresponda.</li>
              </ul>
            </section>

            <section id="finalidades">
              <h2>4. Finalidades</h2>
              <p>Los datos son tratados exclusivamente para las siguientes finalidades actuales o claramente identificadas:</p>
              <ul>
                <li>Atender consultas y estructurar una solicitud de atención.</li>
                <li>Contactar al usuario.</li>
                <li>Ejecutar la admisión simulada de Búho Analítico.</li>
                <li>Garantizar la seguridad de la plataforma y diagnosticar errores.</li>
                <li>Cumplir obligaciones legales aplicables.</li>
                <li>Atender solicitudes para el ejercicio de los derechos de protección de datos.</li>
              </ul>
            </section>

            <section id="base-juridica">
              <h2>5. Base jurídica</h2>
              <p>La base jurídica aplicable depende de la interacción realizada:</p>
              <ul>
                <li>Los datos remitidos mediante la consulta profesional se tratan sobre la base del consentimiento del usuario y de la ejecución de actuaciones precontractuales solicitadas por este.</li>
                <li>Los datos derivados de una relación profesional formalizada se tratarán para la ejecución del servicio contratado y el cumplimiento de las obligaciones legales correspondientes.</li>
                <li>Los datos técnicos indispensables para la entrega, seguridad, estabilidad y diagnóstico del sitio podrán tratarse cuando resulten necesarios para su funcionamiento y para proteger la plataforma frente a usos indebidos o incidentes.</li>
                <li>Los datos requeridos para atender solicitudes de derechos, reclamos o requerimientos de autoridades se tratarán para cumplir las obligaciones legales aplicables.</li>
              </ul>
              <p>
                BúhoLex no utilizará estas bases jurídicas para incorporar finalidades incompatibles o no informadas previamente.
              </p>
            </section>

            <section id="consulta-profesional">
              <h2>6. Consulta profesional por WhatsApp y correo</h2>
              <p>
                El formulario de consulta profesional se procesa directamente en su navegador web. El usuario puede elegir entre enviar su información a través de WhatsApp o correo electrónico.
                Al confirmar el envío, el mensaje preestructurado se abre en una aplicación o servicio externo seleccionado, momento en el cual la información deja nuestro sitio.
              </p>
              <p>
                Servicios como WhatsApp y Zoho (nuestro proveedor de correo corporativo) pueden procesar información conforme a sus propias condiciones de servicio y privacidad.
                BúhoLex no controla íntegramente los registros que dichos servicios mantienen en sus plataformas. Recomendamos encarecidamente al usuario no remitir información innecesaria o excesiva que no aporte a la evaluación inicial.
              </p>
            </section>

            <section id="buho-analitico">
              <h2>7. Búho Analítico</h2>
              <p>
                Actualmente, Búho Analítico opera en una modalidad inicial y simulada para fines de demostración de la interfaz.
                En este estado de desarrollo:
              </p>
              <ul>
                <li>No existe un análisis jurídico real de fondo.</li>
                <li>No existe inteligencia artificial externa conectada al sistema.</li>
                <li>No se crea un expediente permanente ni un historial personal asociado al usuario.</li>
                <li>El tratamiento de la información ingresada es efímero por defecto.</li>
                <li>BúhoLex no utiliza actualmente los textos ingresados para entrenar modelos generales de inteligencia artificial ni autoriza su utilización para esa finalidad. Antes de integrar proveedores externos se adoptarán las restricciones contractuales, técnicas y de configuración correspondientes.</li>
                <li>Recomendamos encarecidamente no ingresar nombres completos, números de DNI, domicilios exactos, expedientes íntegros ni datos sensibles que resulten innecesarios.</li>
              </ul>
              <p>
                Aunque el tratamiento realizado por la aplicación es efímero, la infraestructura tecnológica puede generar o conservar temporalmente registros técnicos mínimos necesarios para la entrega del servicio, la seguridad, el diagnóstico de errores y la continuidad operativa.
                Esta política será actualizada antes de conectar proveedores externos definitivos de análisis de lenguaje.
              </p>
            </section>

            <section id="conservacion">
              <h2>8. Conservación</h2>
              <p>Se adoptan los siguientes criterios de conservación de la información:</p>
              <ul>
                <li><strong>Consultas profesionales (sin contratación final):</strong> Se conservan hasta por 24 meses desde la última comunicación, procediendo luego a su eliminación o anonimización.</li>
                <li><strong>Contratación de servicios:</strong> La información se conserva durante toda la vigencia de la relación profesional y, posteriormente, durante los plazos legales aplicables para atención de responsabilidades.</li>
                <li><strong>Búho Analítico:</strong> En su modalidad actual, la información no se incorpora a un banco documental permanente ni se mantiene un historial de análisis.</li>
                <li><strong>Registros técnicos de seguridad:</strong> Se conservan según las necesidades razonables y ordinarias de seguridad de la infraestructura utilizada.</li>
                <li>Podrá aplicarse un plazo de conservación adicional en caso de obligación legal, controversia, o defensa jurídica legítima.</li>
              </ul>
            </section>

            <section id="destinatarios">
              <h2>9. Destinatarios y proveedores</h2>
              <p>La información puede ser tratada a través de los siguientes proveedores y entidades que prestan servicios técnicos y de comunicación:</p>
              <ul>
                <li>Nuestro proveedor de infraestructura de alojamiento web.</li>
                <li>Nuestro proveedor de correo electrónico corporativo (Zoho).</li>
                <li>WhatsApp, cuando el usuario decida voluntariamente utilizar dicho canal para contactarnos.</li>
                <li>Nuestros asesores legales externos o autoridades competentes, únicamente cuando exista una obligación legal ineludible.</li>
              </ul>
            </section>

            <section id="transferencias">
              <h2>10. Transferencias internacionales</h2>
              <p>
                Al utilizar servicios tecnológicos globales y en la nube, es posible que algunos proveedores (específicamente nuestro alojamiento web, correo institucional y sistema de mensajería)
                procesen información en centros de datos ubicados fuera del territorio de la República del Perú.
              </p>
            </section>

            <section id="seguridad">
              <h2>11. Seguridad</h2>
              <p>
                La Empresa aplica y continuará desarrollando medidas técnicas y organizativas razonables destinadas a proteger la confidencialidad, integridad y disponibilidad de la información. Estas medidas comprenden la minimización de datos, la restricción de accesos según necesidad y controles operativos acordes con las funcionalidades habilitadas.
              </p>
              <p>
                No obstante, ningún sistema o transmisión de información a través de internet es absolutamente invulnerable.
              </p>
            </section>

            <section id="derechos">
              <h2>12. Derechos del titular</h2>
              <p>
                Usted puede ejercer sus derechos de acceso, rectificación, cancelación y oposición —derechos ARCO—, así como solicitar información sobre el tratamiento, revocar el consentimiento cuando corresponda y ejercer los demás derechos reconocidos por la normativa peruana.
              </p>
              <p>
                Para ejercerlos, el canal de atención inicial dispuesto por el Responsable Interno es el correo electrónico: <a href={`mailto:${siteConfig.privacyContact}`}>{siteConfig.privacyContact}</a>.
                Deberá identificar claramente su solicitud y aportar la información suficiente para verificar adecuadamente su identidad y ubicar los datos correspondientes.
              </p>
              <p>
                La solicitud deberá contener información suficiente para acreditar la identidad del solicitante o de su representante y para identificar el tratamiento respecto del cual se ejerce el derecho. La Empresa atenderá la solicitud dentro de los plazos y conforme al procedimiento establecido por la normativa vigente.
              </p>
            </section>

            <section id="bancos-datos">
              <h2>13. Bancos de datos personales</h2>
              <p>
                Los datos correspondientes a consultas profesionales, contactos institucionales, clientes y demás interacciones que impliquen conservación organizada serán incorporados únicamente a los bancos de datos personales de titularidad de la Empresa que resulten aplicables.
              </p>
              <p>
                Antes del lanzamiento comercial, la Empresa culminará la inscripción de dichos bancos ante el Registro Nacional de Protección de Datos Personales. Una vez obtenidas las constancias correspondientes, esta sección será actualizada con su denominación y código registral.
              </p>
              <p>
                Las nuevas funcionalidades que impliquen almacenamiento estructurado de cuentas, documentos, expedientes, conversaciones o reclamaciones no serán habilitadas hasta completar su evaluación técnica, organizativa y regulatoria.
              </p>
            </section>

            <section id="cookies">
              <h2>14. Cookies y tecnologías similares</h2>
              <ul>
                <li>Actualmente, BúhoLex no utiliza cookies publicitarias, cookies de perfilado ni herramientas analíticas activas.</li>
                <li>La infraestructura del sitio puede procesar información técnica indispensable para entregar las páginas, proteger el servicio y diagnosticar incidencias, sin que ello implique actualmente la creación de perfiles publicitarios.</li>
                <li>Antes de activar una herramienta analítica, cookie no esencial o tecnología equivalente, esta política será actualizada.</li>
                <li>Cuando una tecnología requiera consentimiento, se habilitará previamente un mecanismo específico para aceptarla, rechazarla o configurar su uso.</li>
              </ul>
            </section>

            <section id="menores">
              <h2>15. Menores de edad</h2>
              <p>
                Los servicios y herramientas públicas de BúhoLex no están dirigidos específicamente a menores de edad. No deben remitirse datos personales de menores mediante los formularios o herramientas públicas.
              </p>
              <p>
                Cuando una atención jurídica requiera legítimamente información de un menor, esta deberá ser proporcionada por su padre, madre, tutor o representante facultado, a través del canal profesional correspondiente y bajo las medidas aplicables.
              </p>
            </section>

            <section id="cambios">
              <h2>16. Cambios a esta política</h2>
              <p>
                Esta política podrá ser revisada y actualizada periódicamente para reflejar cambios en nuestras prácticas operativas, tecnológicas o exigencias legales.
              </p>
              <ul>
                <li><strong>Versión:</strong> 1.0 — Pendiente de publicación</li>
                <li><strong>Fecha de publicación:</strong> Pendiente</li>
                <li><strong>Fecha de vigencia:</strong> Pendiente</li>
              </ul>
              <p>
                Publicaremos cualquier modificación relevante en esta misma página e implementaremos mecanismos de comunicación adicional cuando sea jurídicamente necesario.
              </p>
            </section>

            <hr style={{ margin: "3rem 0", borderColor: "var(--border-color)", opacity: 0.5 }} />

            <p>
              <Link href="/" style={{ textDecoration: "none", color: "var(--foreground)", fontWeight: 500 }}>
                ← Volver a la página principal
              </Link>
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
