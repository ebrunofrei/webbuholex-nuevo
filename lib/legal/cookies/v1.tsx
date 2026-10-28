import Link from "next/link";
import { LEGAL_DOCUMENTS } from "@/lib/legal/legal-documents";

export function CookieNoticeV1() {
  const doc = LEGAL_DOCUMENTS.cookies;

  return (
    <article className="legal-copy" style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
      <nav aria-label="Índice del Aviso de Cookies" style={{ background: "var(--background-secondary)", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Índice</h2>
        <ol style={{ margin: 0, paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <li><a href="#objeto">1. Objeto</a></li>
          <li><a href="#definicion">2. ¿Qué son las cookies y tecnologías similares?</a></li>
          <li><a href="#uso-actual">3. Uso actual de cookies y tecnologías similares en BúhoLex</a></li>
          <li><a href="#cookies-tecnicas">4. Cookies técnicas y de autenticación</a></li>
          <li><a href="#proveedores-auth">5. Proveedores relacionados con la autenticación</a></li>
          <li><a href="#analitica-vercel">6. Analítica de tráfico mediante Vercel Web Analytics</a></li>
          <li><a href="#modelo-analitica">7. Modelo de analítica utilizado</a></li>
          <li><a href="#informacion-procesada">8. Información técnica procesada</a></li>
          <li><a href="#cookies-analiticas">9. Cookies analíticas no esenciales</a></li>
          <li><a href="#publicidad">10. Cookies publicitarias, remarketing y perfilado</a></li>
          <li><a href="#consentimiento">11. Consentimiento y tecnologías no esenciales</a></li>
          <li><a href="#estrictamente-necesarias">12. Cookies estrictamente necesarias</a></li>
          <li><a href="#almacenamiento-local">13. Almacenamiento local del navegador</a></li>
          <li><a href="#gestion-navegador">14. Gestión desde el navegador</a></li>
          <li><a href="#cambios">15. Cambios futuros</a></li>
          <li><a href="#relacion-privacidad">16. Relación con la Política de Privacidad</a></li>
          <li><a href="#vigencia">17. Vigencia</a></li>
        </ol>
      </nav>

      <section id="objeto">
        <h2>1. Objeto</h2>
        <p>
          El presente Aviso explica el uso de cookies y tecnologías similares en BúhoLex, plataforma digital operada por EMPRESA CONSTRUCTORA, CONSULTORA, BIENES Y SERVICIOS EN GENERAL JULITA S.A.C., identificada con RUC N.° 20571585902.
        </p>
        <p>
          Este documento debe leerse conjuntamente con la <Link href="/privacidad" className="text-link">Política de Privacidad y Tratamiento de Datos Personales</Link> de BúhoLex.
        </p>
      </section>

      <section id="definicion">
        <h2>2. ¿Qué son las cookies y tecnologías similares?</h2>
        <p>
          Las cookies son pequeños archivos o identificadores que un sitio web o servicio puede almacenar o utilizar en el navegador del usuario para permitir determinadas funciones, mantener una sesión, recordar información técnica o, según el caso, realizar mediciones, personalización o seguimiento.
        </p>
        <p>
          También existen tecnologías con finalidades semejantes que pueden operar sin utilizar cookies persistentes, por ejemplo mediante identificadores técnicos efímeros, registros de acceso o mecanismos de medición agregada.
        </p>
      </section>

      <section id="uso-actual">
        <h2>3. Uso actual de cookies y tecnologías similares en BúhoLex</h2>
        <p>Actualmente BúhoLex utiliza:</p>
        <ul>
          <li>cookies técnicas necesarias para autenticación, sesión y seguridad;</li>
          <li>tecnologías de medición estadística del tráfico y uso de la plataforma mediante Vercel Web Analytics; y</li>
          <li>registros técnicos necesarios para funcionamiento, seguridad, prevención de abuso y diagnóstico.</li>
        </ul>
        <p>
          BúhoLex no utiliza actualmente cookies publicitarias, herramientas de remarketing ni tecnologías destinadas al seguimiento comportamental del usuario entre diferentes sitios web.
        </p>
      </section>

      <section id="cookies-tecnicas">
        <h2>4. Cookies técnicas y de autenticación</h2>
        <p>
          Cuando el usuario inicia un proceso de autenticación, BúhoLex utiliza cookies técnicas necesarias para permitir y proteger el inicio de sesión, completar el proceso de autenticación y mantener la sesión.
        </p>
        <p>Estas cookies pueden utilizarse para:</p>
        <ul>
          <li>completar de forma segura el proceso de autenticación;</li>
          <li>mantener la sesión iniciada;</li>
          <li>verificar la continuidad del proceso de acceso;</li>
          <li>aplicar medidas de seguridad;</li>
          <li>impedir determinados usos indebidos de la sesión; y</li>
          <li>permitir el acceso a funcionalidades privadas autorizadas.</li>
        </ul>
        <p>
          Estas cookies son necesarias para prestar las funcionalidades solicitadas por el usuario y no se utilizan con finalidad publicitaria.
        </p>
      </section>

      <section id="proveedores-auth">
        <h2>5. Proveedores relacionados con la autenticación</h2>
        <p>
          BúhoLex utiliza infraestructura tecnológica de terceros para determinadas funcionalidades.
        </p>
        <p>En particular:</p>
        <ul>
          <li>Supabase participa en la gestión de autenticación y sesión;</li>
          <li>Google puede intervenir cuando el usuario decide utilizar Google como proveedor de identidad.</li>
        </ul>
        <p>
          Estos proveedores pueden aplicar medidas técnicas propias para prestar sus servicios, sin perjuicio de las obligaciones que correspondan a BúhoLex respecto del tratamiento realizado bajo su responsabilidad.
        </p>
      </section>

      <section id="analitica-vercel">
        <h2>6. Analítica de tráfico mediante Vercel Web Analytics</h2>
        <p>
          BúhoLex utiliza Vercel Web Analytics para obtener información estadística agregada sobre el uso de la plataforma.
        </p>
        <p>Esta herramienta permite conocer, entre otros aspectos:</p>
        <ul>
          <li>número de visitas;</li>
          <li>número de visitantes;</li>
          <li>páginas y rutas consultadas;</li>
          <li>procedencia general del tráfico;</li>
          <li>país o ubicación geográfica aproximada;</li>
          <li>tipo de dispositivo;</li>
          <li>navegador;</li>
          <li>sistema operativo; y</li>
          <li>determinados eventos de uso definidos por BúhoLex.</li>
        </ul>
        <p>La información se utiliza para:</p>
        <ul>
          <li>conocer qué contenidos y funcionalidades son utilizados;</li>
          <li>evaluar el funcionamiento de la plataforma;</li>
          <li>detectar tendencias generales de navegación;</li>
          <li>mejorar la experiencia de usuario;</li>
          <li>priorizar mejoras técnicas y de contenido; y</li>
          <li>medir el desempeño general de determinadas funcionalidades.</li>
        </ul>
      </section>

      <section id="modelo-analitica">
        <h2>7. Modelo de analítica utilizado</h2>
        <p>
          La implementación actual de Vercel Web Analytics utilizada por BúhoLex está orientada a medición estadística sin emplear cookies analíticas persistentes para realizar seguimiento publicitario del usuario.
        </p>
        <p>BúhoLex no utiliza esta herramienta para:</p>
        <ul>
          <li>construir perfiles publicitarios individuales;</li>
          <li>realizar remarketing;</li>
          <li>seguir al usuario entre distintos sitios web;</li>
          <li>comercializar información sobre su comportamiento; ni</li>
          <li>combinar los datos de navegación con información sensible o con el contenido de consultas jurídicas privadas.</li>
        </ul>
        <p>
          Los eventos personalizados que BúhoLex incorpore deberán limitarse a información categórica necesaria para comprender el uso del producto.
        </p>
        <p>No deberán remitirse a Analytics:</p>
        <ul>
          <li>nombres;</li>
          <li>apellidos;</li>
          <li>correos electrónicos;</li>
          <li>números de documento;</li>
          <li>RUC;</li>
          <li>teléfonos;</li>
          <li>textos de reclamos;</li>
          <li>consultas jurídicas;</li>
          <li>números de expediente;</li>
          <li>documentos privados;</li>
          <li>tokens privados;</li>
          <li>mensajes del usuario;</li>
          <li>cualquier otro dato personal innecesario para medición estadística.</li>
        </ul>
      </section>

      <section id="informacion-procesada">
        <h2>8. Información técnica procesada</h2>
        <p>
          La infraestructura utilizada para prestar y medir el servicio puede procesar información técnica asociada a las solicitudes efectuadas por el navegador, como:
        </p>
        <ul>
          <li>dirección IP;</li>
          <li>fecha y hora;</li>
          <li>ruta solicitada;</li>
          <li>información general del navegador;</li>
          <li>características generales del dispositivo;</li>
          <li>sistema operativo; y</li>
          <li>ubicación aproximada derivada de datos técnicos.</li>
        </ul>
        <p>
          BúhoLex utiliza esta información de manera limitada a finalidades de prestación del servicio, medición estadística, seguridad, disponibilidad y diagnóstico.
        </p>
        <p>
          La existencia de estos datos técnicos no autoriza su utilización para finalidades incompatibles ni para la construcción de perfiles publicitarios.
        </p>
      </section>

      <section id="cookies-analiticas">
        <h2>9. Cookies analíticas no esenciales</h2>
        <p>
          Actualmente BúhoLex no utiliza cookies analíticas persistentes de terceros para publicidad, perfilado o seguimiento comportamental.
        </p>
        <p>
          Si en el futuro se incorporan herramientas que requieran cookies u otros identificadores no esenciales y cuyo tratamiento requiera consentimiento, dichas tecnologías deberán permanecer desactivadas hasta que el usuario haya recibido la información correspondiente y, cuando resulte legalmente exigible, haya otorgado una manifestación válida.
        </p>
      </section>

      <section id="publicidad">
        <h2>10. Cookies publicitarias, remarketing y perfilado</h2>
        <p>BúhoLex no utiliza actualmente:</p>
        <ul>
          <li>cookies de publicidad comportamental;</li>
          <li>cookies de remarketing;</li>
          <li>píxeles publicitarios;</li>
          <li>seguimiento entre sitios web;</li>
          <li>plataformas de gestión publicitaria basadas en perfilado;</li>
          <li>mecanismos destinados a comercializar el comportamiento del usuario.</li>
        </ul>
        <p>
          La incorporación futura de tecnologías de esta naturaleza requerirá revisión previa de este Aviso, de la Política de Privacidad y de los mecanismos de información y consentimiento aplicables.
        </p>
      </section>

      <section id="consentimiento">
        <h2>11. Consentimiento y tecnologías no esenciales</h2>
        <p>
          Cuando una cookie o tecnología similar requiera consentimiento conforme a la normativa aplicable, BúhoLex implementará un mecanismo que permita al usuario adoptar una decisión previa, libre e informada.
        </p>
        <p>Dicho mecanismo deberá permitir, según corresponda:</p>
        <ul>
          <li>aceptar;</li>
          <li>rechazar; o</li>
          <li>configurar</li>
        </ul>
        <p>las tecnologías no esenciales.</p>
        <p>
          La negativa a utilizar tecnologías no esenciales no deberá impedir el acceso a funcionalidades que puedan prestarse razonablemente sin ellas.
        </p>
      </section>

      <section id="estrictamente-necesarias">
        <h2>12. Cookies estrictamente necesarias</h2>
        <p>
          Las cookies estrictamente necesarias para prestar una funcionalidad solicitada por el usuario, proteger una sesión o mantener la seguridad operativa pueden resultar indispensables para el funcionamiento de determinadas partes de BúhoLex.
        </p>
        <p>
          La desactivación de estas cookies desde la configuración del navegador puede impedir o afectar funcionalidades como el inicio de sesión o el acceso al espacio privado.
        </p>
      </section>

      <section id="almacenamiento-local">
        <h2>13. Almacenamiento local del navegador</h2>
        <p>
          Actualmente BúhoLex no utiliza claves propias en localStorage o sessionStorage con fines de publicidad, remarketing, perfilado comercial o seguimiento comportamental.
        </p>
        <p>
          Si en el futuro se incorporan tecnologías de almacenamiento local con finalidades adicionales, este Aviso será actualizado cuando resulte necesario.
        </p>
      </section>

      <section id="gestion-navegador">
        <h2>14. Gestión desde el navegador</h2>
        <p>
          El usuario puede utilizar las opciones de configuración de su navegador para visualizar, eliminar o bloquear cookies.
        </p>
        <p>
          Debe tenerse en cuenta que el bloqueo general de cookies técnicas puede impedir el correcto funcionamiento de ciertas funcionalidades de autenticación o sesión.
        </p>
        <p>
          La configuración del navegador no sustituye los mecanismos específicos de consentimiento que BúhoLex deba implementar cuando una tecnología no esencial así lo requiera.
        </p>
      </section>

      <section id="cambios">
        <h2>15. Cambios futuros</h2>
        <p>BúhoLex podrá modificar este Aviso cuando:</p>
        <ul>
          <li>incorpore nuevos proveedores;</li>
          <li>modifique su sistema de analítica;</li>
          <li>active tecnologías adicionales de medición;</li>
          <li>incorpore cookies no esenciales;</li>
          <li>modifique sus mecanismos de autenticación;</li>
          <li>incorpore funcionalidades comerciales; o</li>
          <li>cambie la normativa aplicable.</li>
        </ul>
        <p>
          Toda nueva versión deberá indicar su fecha de publicación y entrada en vigencia.
        </p>
      </section>

      <section id="relacion-privacidad">
        <h2>16. Relación con la Política de Privacidad</h2>
        <p>
          El tratamiento de datos personales relacionado con cookies, analítica y tecnologías similares se encuentra sujeto a la <Link href="/privacidad" className="text-link">Política de Privacidad y Tratamiento de Datos Personales</Link> de BúhoLex.
        </p>
        <p>
          <strong>Correo para privacidad:</strong> <a href="mailto:eduardo@buholex.com">eduardo@buholex.com</a>
        </p>
      </section>

      <section id="vigencia">
        <h2>17. Vigencia</h2>
        <p>
          La versión vigente de este Aviso será la publicada en la ruta oficial destinada a cookies y tecnologías similares ({doc.canonicalPath}).
        </p>
        <ul>
          <li><strong>Versión:</strong> {doc.version}</li>
          <li><strong>Fecha de publicación:</strong> {doc.publishedAt ?? "Pendiente de publicación oficial"}</li>
          <li><strong>Fecha de entrada en vigencia:</strong> {doc.effectiveAt ?? "Pendiente de publicación oficial"}</li>
        </ul>
      </section>

      <hr style={{ margin: "3rem 0", borderColor: "var(--border-color)", opacity: 0.5 }} />

      <p>
        <Link href="/" style={{ textDecoration: "none", color: "var(--foreground)", fontWeight: 500 }}>
          ← Volver a la página principal
        </Link>
      </p>
    </article>
  );
}
