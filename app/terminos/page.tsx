import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata(
  "Términos y condiciones",
  "Términos y condiciones de uso de BúhoLex.",
  "/terminos/"
);

export default function TermsPage() {
  return (
    <main>
      <PageHero
        eyebrow="LEGAL"
        title="Términos y Condiciones"
        description="Condiciones de uso de la plataforma BúhoLex."
        status="Versión 1.0 — Pendiente de publicación"
      />
      <section className="content-section">
        <div className="container">
          <article className="legal-copy" style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
            <nav aria-label="Índice de Términos y Condiciones" style={{ background: "var(--background-secondary)", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem" }}>
              <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Índice</h2>
              <ol style={{ margin: 0, paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li><a href="#identidad">Identidad y aceptación</a></li>
                <li><a href="#descripcion">Descripción actual de BúhoLex</a></li>
                <li><a href="#naturaleza">Naturaleza de la información</a></li>
                <li><a href="#ausencia-relacion">Ausencia de relación abogado-cliente automática</a></li>
                <li><a href="#buho-analitico">Búho Analítico</a></li>
                <li><a href="#consulta-profesional">Consulta profesional</a></li>
                <li><a href="#uso-permitido">Uso permitido</a></li>
                <li><a href="#uso-prohibido">Uso prohibido</a></li>
                <li><a href="#propiedad-intelectual">Propiedad intelectual</a></li>
                <li><a href="#contenido-usuario">Contenido aportado por el usuario</a></li>
                <li><a href="#disponibilidad">Disponibilidad</a></li>
                <li><a href="#enlaces-externos">Enlaces externos</a></li>
                <li><a href="#servicios-pagados">Servicios pagados</a></li>
                <li><a href="#responsabilidad">Responsabilidad</a></li>
                <li><a href="#proteccion-consumidor">Protección del consumidor</a></li>
                <li><a href="#modificaciones">Modificaciones</a></li>
                <li><a href="#legislacion">Legislación y solución de controversias</a></li>
              </ol>
            </nav>

            <section id="identidad">
              <h2>1. Identidad y aceptación</h2>
              <p>
                BúhoLex es una plataforma operada por <strong>{siteConfig.legalName}</strong> (en adelante, la &quot;Empresa&quot;),
                identificada con RUC N.° {siteConfig.ruc} y con domicilio en {siteConfig.legalAddress}.
              </p>
              <p>
                El acceso y uso de la plataforma queda sujeto a las reglas generales contenidas en estos Términos y Condiciones. Cuando una funcionalidad requiera consentimiento específico, aceptación contractual expresa o confirmación previa —por ejemplo, tratamiento de datos, contratación de servicios o pagos—, BúhoLex solicitará una manifestación diferenciada antes de ejecutarla. Si el usuario no está de acuerdo con estas reglas generales, deberá abstenerse de utilizar la plataforma.
              </p>
            </section>

            <section id="descripcion">
              <h2>2. Descripción actual de BúhoLex</h2>
              <p>Actualmente, BúhoLex funciona como:</p>
              <ul>
                <li>Portal jurídico informativo.</li>
                <li>Interfaz informativa para la consulta y organización de información jurídica pública, dentro de las funcionalidades efectivamente habilitadas.</li>
                <li>Conjunto de herramientas de estructuración de consultas.</li>
                <li>Canal de contacto para consulta profesional.</li>
                <li>Entorno de prueba (simulado) de Búho Analítico.</li>
              </ul>
              <p>
                Algunos servicios, herramientas y contenidos de la plataforma pueden encontrarse marcados como &quot;próximamente&quot;.
                El usuario reconoce expresamente que en la etapa actual de despliegue:
              </p>
              <ul>
                <li><strong>No</strong> existe inteligencia artificial real conectada a la plataforma.</li>
                <li><strong>No</strong> se ejecuta un análisis jurídico de fondo automatizado.</li>
                <li><strong>No</strong> existen créditos, energías cognitivas, membresías, pagos activos ni sistema de autenticación operativa.</li>
                <li><strong>No</strong> existe almacenamiento de expedientes por parte de la plataforma.</li>
              </ul>
            </section>

            <section id="naturaleza">
              <h2>3. Naturaleza de la información</h2>
              <p>
                El contenido disponible en BúhoLex tiene un carácter estrictamente informativo u orientativo.
                De ninguna manera constituye un dictamen legal vinculante, no garantiza un resultado judicial o administrativo,
                y no sustituye la revisión profesional personalizada.
              </p>
              <p>
                La normativa y jurisprudencia peruana se encuentran en constante cambio. Corresponde al usuario verificar la aplicabilidad
                y vigencia de la información presentada a su caso concreto.
              </p>
            </section>

            <section id="ausencia-relacion">
              <h2>4. Ausencia de relación abogado-cliente automática</h2>
              <p>
                El simple uso del sitio web o el envío de una solicitud a través de nuestros formularios no crea, por sí solo, una relación formal abogado-cliente.
                El envío de una consulta profesional no implica la aceptación del caso por parte de la Empresa.
              </p>
              <p>
                La representación y asunción de patrocinio exige la celebración de un acuerdo expreso posterior, previa evaluación de posibles
                conflictos de interés, competencia material y disponibilidad. Asimismo, no se garantiza una respuesta inmediata a las comunicaciones recibidas.
              </p>
            </section>

            <section id="buho-analitico">
              <h2>5. Búho Analítico</h2>
              <p>
                La herramienta denominada &quot;Búho Analítico&quot; es actualmente un entorno simulado para demostrar flujos de interfaz.
              </p>
              <ul>
                <li>No ejecuta inteligencia artificial jurídica real.</li>
                <li>Cualquier respuesta de estado (por ejemplo, &quot;ready&quot; o &quot;analizado&quot;) corresponde exclusivamente al procesamiento visual de la interfaz y no constituye un análisis de fondo.</li>
                <li>Los resultados que se implementen en el futuro serán procesos automatizados de carácter meramente orientativo.</li>
                <li>El usuario debe verificar el contenido recibido, valorar su pertinencia y adoptar sus decisiones bajo su propia responsabilidad, sin perjuicio de las obligaciones legales que correspondan a la Empresa.</li>
                <li>Queda terminantemente prohibido utilizar esta herramienta como única base para decidir o ejecutar una actuación urgente, crítica o judicial.</li>
                <li>El usuario no debe ingresar datos personales innecesarios, información confidencial sensible o expedientes completos.</li>
              </ul>
            </section>

            <section id="consulta-profesional">
              <h2>6. Consulta profesional</h2>
              <p>
                La herramienta de consulta profesional asiste al usuario en la preparación y estructuración de un mensaje.
                Al confirmar el envío, se procede a la apertura de la aplicación externa (WhatsApp o el cliente de correo del usuario).
              </p>
              <p>
                Antes de confirmar el envío desde WhatsApp o desde su cliente de correo, el usuario debe revisar el contenido del mensaje generado y decidir qué información desea remitir. Esta obligación de revisión no excluye las responsabilidades que legalmente correspondan a la Empresa por el diseño y funcionamiento de la herramienta. El envío no constituye una contratación automática de servicios y queda sujeto a evaluación y acuerdo posterior.
              </p>
            </section>

            <section id="uso-permitido">
              <h2>7. Uso permitido</h2>
              <p>El usuario está autorizado a:</p>
              <ul>
                <li>Navegar por la plataforma con fines informativos.</li>
                <li>Realizar consultas personales o profesionales legítimas.</li>
                <li>Realizar citas razonables de los contenidos propios, reconociendo la fuente.</li>
                <li>Utilizar las herramientas de estructuración dentro de sus finalidades previstas.</li>
              </ul>
            </section>

            <section id="uso-prohibido">
              <h2>8. Uso prohibido</h2>
              <p>Queda estrictamente prohibido:</p>
              <ul>
                <li>Realizar actividades ilícitas o contrarias a la buena fe.</li>
                <li>Ejecutar ataques informáticos o intentos de vulneración de seguridad.</li>
                <li>El <em>scraping</em> abusivo y la extracción masiva de información.</li>
                <li>La automatización no autorizada del uso de la plataforma.</li>
                <li>La ingeniería inversa sobre el código o flujos operativos.</li>
                <li>La evasión de medidas técnicas de protección.</li>
                <li>La suplantación de identidad.</li>
                <li>La introducción de malware, virus o código malicioso.</li>
                <li>Afectar la disponibilidad del servicio para terceros.</li>
                <li>Ingresar datos o documentos obtenidos ilícitamente.</li>
                <li>Cualquier intento de convertir la plataforma en un repositorio no autorizado de expedientes legales o documentos de terceros.</li>
              </ul>
            </section>

            <section id="propiedad-intelectual">
              <h2>9. Propiedad intelectual</h2>
              <p>
                La Empresa es titular o cuenta con las autorizaciones correspondientes respecto de la marca BúhoLex, la identidad institucional EMCCON, el diseño visual, los textos originales, las plantillas propias, la selección y organización editorial y los desarrollos informáticos creados específicamente para la plataforma.
              </p>
              <p>
                Los componentes, librerías, tipografías, recursos y demás elementos de terceros se rigen por sus respectivas licencias y condiciones. La Empresa no reclama propiedad sobre normas legales, resoluciones públicas, jurisprudencia de acceso público, documentos de terceros ni información perteneciente al usuario.
              </p>
            </section>

            <section id="contenido-usuario">
              <h2>10. Contenido aportado por el usuario</h2>
              <p>
                El usuario conserva los derechos que le correspondan sobre la información y los textos que aporte a la plataforma.
              </p>
              <p>
                Al utilizar una herramienta, el usuario autoriza exclusivamente el tratamiento técnico temporal necesario para recibir, validar y procesar la solicitud conforme a la funcionalidad elegida. Esta autorización no transfiere la propiedad del contenido ni habilita su explotación para finalidades distintas.
              </p>
              <p>
                La Empresa no utilizará dicho contenido para el entrenamiento general de modelos de lenguaje.
              </p>
              <p>
                El usuario declara que cuenta con autorización, legitimidad o fundamento suficiente para remitir la información proporcionada y se obliga a minimizar la inclusión de datos personales de terceros, especialmente cuando no resulten necesarios para la finalidad de la consulta.
              </p>
            </section>

            <section id="disponibilidad">
              <h2>11. Disponibilidad</h2>
              <p>
                Los servicios de la plataforma pueden ser suspendidos temporalmente por razones de mantenimiento, actualización técnica o causas de fuerza mayor.
              </p>
              <p>
                Las funcionalidades descritas como &quot;próximamente&quot; no constituyen una promesa contractual vinculante de implementación en un plazo determinado.
                La Empresa no garantiza un funcionamiento ininterrumpido o libre de errores de la plataforma, pero se compromete a atender razonablemente
                las fallas técnicas reportadas.
              </p>
            </section>

            <section id="enlaces-externos">
              <h2>12. Enlaces externos</h2>
              <p>
                La plataforma puede derivar al usuario hacia aplicaciones de terceros (como WhatsApp o proveedores de correo corporativo).
                Dichos enlaces externos, así como el funcionamiento de tales aplicaciones, están sujetos a las propias condiciones de servicio y privacidad de sus respectivos titulares.
              </p>
            </section>

            <section id="servicios-pagados">
              <h2>13. Servicios pagados</h2>
              <p>
                En la etapa actual, los servicios de cobro automatizado, pagos en línea o suscripciones no se encuentran técnicamente habilitados.
              </p>
              <p>
                Cualquier servicio pagado futuro tendrá su precio, alcance y condiciones comerciales debidamente informadas antes de que el usuario proceda a contratarlo.
                No se genera obligación de pago alguna por el simple hecho de navegar en la plataforma o enviar una consulta inicial. Las políticas comerciales
                y de devolución correspondientes serán publicadas antes de la activación de cualquier pasarela de pagos.
              </p>
              <p>
                La Empresa no habilitará cobros ni contratación electrónica hasta publicar las condiciones específicas del servicio, la política de cancelación o devolución, los medios de pago, las reglas de entrega, la emisión de comprobantes y el acceso funcional al Libro de Reclamaciones.
              </p>
            </section>

            <section id="responsabilidad">
              <h2>14. Responsabilidad</h2>
              <p>
                La Empresa asume su responsabilidad legal de manera equilibrada. La presente cláusula no busca excluir responsabilidad en casos de dolo o culpa inexcusable,
                ni excluir los derechos reconocidos normativamente a los consumidores, ni eliminar responsabilidades que resulten imperativas según la ley peruana.
              </p>
              <p>
                La limitación de responsabilidad aplica a los riesgos razonablemente atribuibles al uso indebido de la plataforma por parte del usuario,
                a la provisión de información incompleta, o a las decisiones que el usuario adopte de forma autónoma basándose exclusiva e inadecuadamente en contenidos puramente orientativos.
              </p>
            </section>

            <section id="proteccion-consumidor">
              <h2>15. Protección del consumidor</h2>
              <p>
                Los derechos reconocidos por la legislación peruana de protección al consumidor (Código de Protección y Defensa del Consumidor) prevalecen sobre
                cualquier estipulación de estos términos que pudiera resultar incompatible.
              </p>
              <p>
                El Libro de Reclamaciones Virtual será habilitado y enlazado permanentemente desde la página de inicio antes de comenzar cualquier actividad comercial dirigida a consumidores, con independencia de que el pago se realice en la propia web, por transferencia, WhatsApp, correo u otro canal.
              </p>
            </section>

            <section id="modificaciones">
              <h2>16. Modificaciones</h2>
              <p>
                Estos términos podrán actualizarse para reflejar cambios legales, técnicos, operativos o comerciales. Las modificaciones indicarán su fecha de publicación y entrada en vigencia. Las condiciones nuevas no se aplicarán retroactivamente en perjuicio del usuario ni alterarán servicios ya contratados, salvo que una norma imperativa exija lo contrario.
              </p>
              <ul>
                <li><strong>Versión:</strong> 1.0 — Pendiente de publicación</li>
                <li><strong>Fecha de publicación:</strong> Pendiente</li>
              </ul>
            </section>

            <section id="legislacion">
              <h2>17. Legislación y solución de controversias</h2>
              <p>
                Estos Términos y Condiciones se rigen por la legislación de la República del Perú. La Empresa y el usuario procurarán resolver de buena fe cualquier controversia, discrepancia o reclamo relacionado con la interpretación o ejecución de estos términos mediante los canales institucionales disponibles.
              </p>
              <p>
                Si no fuera posible una solución directa, las partes podrán acudir a las autoridades administrativas de protección al consumidor (INDECOPI) o someterse a la jurisdicción de
                los jueces y tribunales peruanos competentes, sin que esta cláusula constituya una renuncia abusiva a los fueros que legalmente le correspondan al usuario.
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
