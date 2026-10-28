import Link from "next/link";
import { LEGAL_DOCUMENTS } from "@/lib/legal/legal-documents";

export function PrivacyPolicyV1() {
  const doc = LEGAL_DOCUMENTS.privacy;

  return (
    <article className="legal-copy" style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
      <nav aria-label="Índice de la Política de Privacidad" style={{ background: "var(--background-secondary)", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Índice</h2>
        <ol style={{ margin: 0, paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <li><a href="#identificacion">1. Identificación del responsable</a></li>
          <li><a href="#objeto">2. Objeto y alcance</a></li>
          <li><a href="#categorias">3. Categorías de datos personales tratados</a></li>
          <li><a href="#finalidades">4. Finalidades del tratamiento</a></li>
          <li><a href="#fundamento">5. Fundamento del tratamiento</a></li>
          <li><a href="#libro-reclamaciones">6. Libro de Reclamaciones y protección de datos</a></li>
          <li><a href="#menores">7. Menores de edad</a></li>
          <li><a href="#herramientas-ia">8. Jurisprudencia, herramientas jurídicas e inteligencia artificial</a></li>
          <li><a href="#destinatarios">9. Destinatarios y proveedores tecnológicos</a></li>
          <li><a href="#transferencias">10. Transferencias y tratamiento internacional</a></li>
          <li><a href="#conservacion">11. Conservación</a></li>
          <li><a href="#seguridad">12. Seguridad</a></li>
          <li><a href="#derechos">13. Derechos del titular</a></li>
          <li><a href="#bancos-datos">14. Bancos de datos personales</a></li>
          <li><a href="#cookies">15. Cookies y tecnologías similares</a></li>
          <li><a href="#comunicaciones">16. Comunicaciones por WhatsApp y correo electrónico</a></li>
          <li><a href="#modificaciones">17. Modificaciones de la Política</a></li>
          <li><a href="#vigencia">18. Vigencia y trazabilidad</a></li>
        </ol>
      </nav>

      <section id="identificacion">
        <h2>1. Identificación del responsable</h2>
        <p>
          BúhoLex es una marca y plataforma digital de titularidad y operación de EMPRESA CONSTRUCTORA, CONSULTORA, BIENES Y SERVICIOS EN GENERAL JULITA S.A.C., identificada con RUC N.° 20571585902, en adelante, la Empresa o BúhoLex.
        </p>
        <ul>
          <li><strong>Domicilio:</strong> Jr. José Gálvez N.° 844, Barranca, Lima, Perú.</li>
          <li><strong>Correo corporativo y canal inicial para asuntos de privacidad:</strong> <a href="mailto:eduardo@buholex.com">eduardo@buholex.com</a>.</li>
          <li><strong>Teléfono / WhatsApp:</strong> +51 922 038 147.</li>
        </ul>
        <p>
          La Empresa es responsable de determinar las finalidades y condiciones del tratamiento de los datos personales realizado mediante las funcionalidades de BúhoLex, sin perjuicio de la intervención de proveedores tecnológicos que puedan participar en determinados tratamientos por cuenta propia o como prestadores de servicios.
        </p>
      </section>

      <section id="objeto">
        <h2>2. Objeto y alcance</h2>
        <p>
          La presente Política informa cómo BúhoLex recopila, utiliza, almacena, comunica, protege y, cuando corresponda, elimina, anonimiza o bloquea datos personales derivados de las funcionalidades efectivamente habilitadas en la plataforma.
        </p>
        <p>Actualmente comprende, según corresponda:</p>
        <ul>
          <li>a) la navegación por el sitio web;</li>
          <li>b) el contacto institucional;</li>
          <li>c) la solicitud de consulta profesional;</li>
          <li>d) la autenticación y acceso mediante cuentas de usuario;</li>
          <li>e) el Libro de Reclamaciones Virtual;</li>
          <li>f) las funcionalidades jurídicas y de jurisprudencia que se encuentren habilitadas;</li>
          <li>g) los registros técnicos necesarios para seguridad, disponibilidad, prevención de abuso y diagnóstico de la plataforma; y</li>
          <li>h) la atención de solicitudes relacionadas con protección de datos personales.</li>
        </ul>
        <p>
          Las funcionalidades que se encuentren identificadas como “próximamente”, en preparación o no habilitadas no implican, por su sola aparición en la interfaz, que BúhoLex esté realizando el tratamiento asociado a ellas.
        </p>
      </section>

      <section id="categorias">
        <h2>3. Categorías de datos personales tratados</h2>
        <p>BúhoLex trata únicamente los datos que resultan pertinentes para cada interacción.</p>

        <h3>3.1. Autenticación y cuenta de usuario</h3>
        <p>Cuando el usuario inicia sesión mediante el proveedor de identidad habilitado, pueden tratarse:</p>
        <ul>
          <li>identificador único de la cuenta;</li>
          <li>dirección de correo electrónico;</li>
          <li>nombre mostrado por el proveedor de identidad;</li>
          <li>imagen o avatar asociado a la cuenta, cuando sea proporcionado;</li>
          <li>identificadores técnicos necesarios para mantener y proteger la sesión;</li>
          <li>datos de vinculación y autorización necesarios para determinar el acceso a funcionalidades privadas.</li>
        </ul>
        <p>
          BúhoLex no solicita ni almacena directamente la contraseña de la cuenta de Google utilizada para la autenticación.
        </p>

        <h3>3.2. Consulta profesional</h3>
        <p>Cuando el usuario utiliza los canales de consulta profesional, pueden tratarse:</p>
        <ul>
          <li>nombres y apellidos;</li>
          <li>correo electrónico;</li>
          <li>teléfono o número de WhatsApp;</li>
          <li>materia o información general de la consulta;</li>
          <li>mensaje preparado o remitido por el usuario; y</li>
          <li>cualquier información que el propio usuario decida incluir voluntariamente.</li>
        </ul>
        <p>
          El usuario debe evitar incorporar datos personales de terceros, datos sensibles o documentación que no resulte necesaria para una evaluación inicial.
        </p>

        <h3>3.3. Libro de Reclamaciones Virtual</h3>
        <p>Cuando una persona presenta un reclamo o una queja pueden tratarse, según corresponda:</p>
        <ul>
          <li>condición de persona natural o jurídica;</li>
          <li>nombres y apellidos;</li>
          <li>razón social y RUC, cuando corresponda;</li>
          <li>tipo y número de documento de identidad;</li>
          <li>domicilio;</li>
          <li>correo electrónico;</li>
          <li>teléfono;</li>
          <li>datos de representantes o apoderados;</li>
          <li>condición de menor de edad del consumidor, cuando corresponda;</li>
          <li>datos de su padre, madre, tutor o representante;</li>
          <li>identificación y descripción del producto o servicio;</li>
          <li>monto reclamado, cuando resulte aplicable;</li>
          <li>fecha y referencia de la operación;</li>
          <li>canal relacionado con la contratación;</li>
          <li>hechos que sustentan el reclamo o queja;</li>
          <li>pedido concreto del consumidor;</li>
          <li>declaraciones y confirmaciones efectuadas al registrar la hoja;</li>
          <li>datos de seguimiento, estado, respuesta y actuaciones necesarias para la atención del reclamo.</li>
        </ul>
        <p>
          Los campos de texto libre pueden contener información adicional introducida voluntariamente por el consumidor. Se recomienda no incluir datos sensibles ni datos personales de terceros que no resulten necesarios para sustentar la reclamación.
        </p>

        <h3>3.4. Navegación, seguridad y funcionamiento</h3>
        <p>La infraestructura tecnológica puede procesar información técnica necesaria para entregar y proteger el servicio, que puede incluir:</p>
        <ul>
          <li>dirección IP;</li>
          <li>información de navegador y dispositivo;</li>
          <li>fecha y hora de acceso;</li>
          <li>ruta solicitada;</li>
          <li>registros técnicos de funcionamiento, seguridad o diagnóstico; y</li>
          <li>identificadores técnicos asociados a controles de seguridad o limitación de uso.</li>
        </ul>
        <p>
          BúhoLex aplica medidas de minimización y no incorpora automáticamente toda esta información a los expedientes o registros funcionales del usuario.
        </p>
      </section>

      <section id="finalidades">
        <h2>4. Finalidades del tratamiento</h2>
        <p>Los datos personales pueden ser tratados para:</p>
        <ul>
          <li>a) autenticar al usuario y mantener una sesión segura;</li>
          <li>b) controlar el acceso a espacios privados y funcionalidades autorizadas;</li>
          <li>c) atender solicitudes de contacto y consultas profesionales;</li>
          <li>d) gestionar actuaciones precontractuales solicitadas por el usuario;</li>
          <li>e) recibir, registrar, gestionar, responder y acreditar la atención de reclamos y quejas;</li>
          <li>f) remitir al consumidor una copia, constancia o respuesta cuando corresponda;</li>
          <li>g) mantener la trazabilidad y seguridad de los procedimientos del Libro de Reclamaciones;</li>
          <li>h) operar, proteger y mantener la disponibilidad de la plataforma;</li>
          <li>i) prevenir abuso, accesos no autorizados, duplicaciones, fraude técnico o incidentes de seguridad;</li>
          <li>j) atender solicitudes relacionadas con el ejercicio de derechos sobre datos personales;</li>
          <li>k) cumplir obligaciones legales, requerimientos de autoridades competentes y deberes de conservación; y</li>
          <li>l) conservar evidencias necesarias para el ejercicio o defensa de derechos cuando exista fundamento legal para ello.</li>
        </ul>
        <p>
          Los datos no serán utilizados para finalidades incompatibles con aquellas que dieron lugar a su recopilación sin que previamente se adopten las medidas de información y, cuando corresponda, consentimiento exigibles.
        </p>
      </section>

      <section id="fundamento">
        <h2>5. Fundamento del tratamiento</h2>
        <p>La base aplicable dependerá de la finalidad concreta.</p>
        <p>BúhoLex podrá tratar datos personales:</p>
        <ul>
          <li>cuando el titular haya otorgado válidamente su consentimiento y este sea legalmente exigible;</li>
          <li>cuando el tratamiento resulte necesario para realizar actuaciones solicitadas por el propio usuario antes de una eventual contratación;</li>
          <li>cuando resulte necesario para ejecutar una relación contractual válidamente establecida;</li>
          <li>cuando el tratamiento sea necesario para cumplir obligaciones legales aplicables a la Empresa;</li>
          <li>cuando corresponda atender el ejercicio de derechos o requerimientos de autoridades competentes; o</li>
          <li>en los demás supuestos en que la Ley N.° 29733 y su Reglamento permitan realizar el tratamiento sin requerir consentimiento.</li>
        </ul>
        <p>
          La publicación o lectura de esta Política no convierte por sí misma al consentimiento en la base jurídica de todos los tratamientos realizados por BúhoLex.
        </p>
        <p>
          Cuando una finalidad requiera consentimiento, este será solicitado de manera diferenciada y bajo las condiciones exigidas por la normativa aplicable.
        </p>
      </section>

      <section id="libro-reclamaciones">
        <h2>6. Libro de Reclamaciones y protección de datos</h2>
        <p>
          El tratamiento de los datos consignados en el Libro de Reclamaciones tiene por finalidad gestionar la queja o reclamo, identificar al consumidor o a su representante, mantener la evidencia de su presentación, realizar las actuaciones necesarias para su atención, emitir y comunicar la respuesta correspondiente y cumplir las obligaciones legales de protección al consumidor.
        </p>
        <p>
          La información del Libro de Reclamaciones se conservará durante el plazo mínimo exigido por la normativa aplicable y durante cualquier período adicional que resulte necesario por una obligación legal, requerimiento de autoridad, controversia pendiente o ejercicio o defensa de derechos.
        </p>
        <p>
          La Política de Privacidad informa al consumidor sobre el tratamiento de sus datos. Cuando el formulario requiera una manifestación específica adicional, esta será registrada separadamente de la declaración de veracidad de la reclamación.
        </p>
      </section>

      <section id="menores">
        <h2>7. Menores de edad</h2>
        <p>
          Los servicios generales de BúhoLex no están dirigidos específicamente a menores de edad.
        </p>
        <p>
          No obstante, el Libro de Reclamaciones puede requerir legítimamente datos de un consumidor menor de edad y de su padre, madre, tutor o representante, conforme a las reglas aplicables a dicho mecanismo de protección al consumidor.
        </p>
        <p>
          Fuera de estos supuestos, no deben proporcionarse datos personales de menores que no resulten necesarios para la finalidad legítima de la interacción.
        </p>
      </section>

      <section id="herramientas-ia">
        <h2>8. Jurisprudencia, herramientas jurídicas e inteligencia artificial</h2>
        <p>
          BúhoLex desarrolla funcionalidades de análisis y organización de conocimiento jurídico mediante sistemas automatizados.
        </p>
        <p>
          Actualmente, la infraestructura de inteligencia artificial destinada al análisis jurisprudencial se encuentra diseñada para operar sobre fuentes jurídicas públicas y registros de jurisprudencia previamente incorporados al sistema.
        </p>
        <p>
          BúhoLex no utiliza actualmente Hermes ni sus proveedores de inteligencia artificial para procesar documentos privados, expedientes personales o información confidencial aportada por usuarios dentro de un espacio documental privado, mientras dicha funcionalidad no se encuentre expresamente habilitada.
        </p>
        <p>
          La activación futura de funcionalidades que impliquen tratamiento de documentos privados, conversaciones persistentes, memoria, expedientes u otra información personal requerirá la correspondiente actualización de esta Política y la adopción previa de las medidas técnicas, contractuales, organizativas y de información aplicables.
        </p>
        <p>
          BúhoLex no autoriza el uso de contenidos privados aportados por sus usuarios para el entrenamiento general de modelos de inteligencia artificial, salvo que existiera en el futuro una finalidad distinta, lícita, informada y jurídicamente habilitada.
        </p>
      </section>

      <section id="destinatarios">
        <h2>9. Destinatarios y proveedores tecnológicos</h2>
        <p>
          Según la funcionalidad utilizada, determinados datos pueden ser procesados mediante servicios de terceros necesarios para la operación de BúhoLex.
        </p>
        <p>Actualmente pueden intervenir:</p>
        <ul>
          <li><strong>Vercel</strong>, como proveedor de infraestructura de alojamiento, ejecución y entrega de la aplicación;</li>
          <li><strong>Supabase</strong>, como proveedor de infraestructura de base de datos y autenticación;</li>
          <li><strong>Google</strong>, cuando el usuario utiliza Google como proveedor de identidad para iniciar sesión;</li>
          <li><strong>Zoho</strong>, en relación con el correo electrónico corporativo;</li>
          <li><strong>Meta / WhatsApp</strong>, cuando el usuario decide voluntariamente comunicarse mediante WhatsApp.</li>
        </ul>
        <p>
          También podrá comunicarse información a autoridades administrativas, judiciales u otras autoridades competentes cuando exista obligación legal o requerimiento válido.
        </p>
        <p>
          BúhoLex no comercializa datos personales de sus usuarios.
        </p>
      </section>

      <section id="transferencias">
        <h2>10. Transferencias y tratamiento internacional</h2>
        <p>
          Algunos de los proveedores tecnológicos utilizados por BúhoLex operan infraestructura global y pueden procesar o alojar información fuera del territorio peruano.
        </p>
        <p>
          Cuando el tratamiento implique una transferencia nacional o internacional de datos personales, BúhoLex aplicará las obligaciones de información, seguridad y demás garantías previstas por la normativa peruana.
        </p>
        <p>
          El uso voluntario de servicios externos como Google, WhatsApp o correo electrónico también queda sujeto a las condiciones y políticas propias de dichos proveedores, sin perjuicio de las obligaciones que correspondan a BúhoLex respecto del tratamiento bajo su responsabilidad.
        </p>
      </section>

      <section id="conservacion">
        <h2>11. Conservación</h2>
        <p>
          BúhoLex conservará los datos durante el tiempo necesario para cumplir la finalidad que motivó su tratamiento y los períodos adicionales impuestos o permitidos por el ordenamiento jurídico.
        </p>
        <p>En particular:</p>
        <ul>
          <li>los datos del Libro de Reclamaciones serán conservados como mínimo durante el período exigido por la normativa de protección al consumidor;</li>
          <li>los datos asociados a una relación contractual podrán conservarse durante la vigencia de dicha relación y posteriormente durante los períodos necesarios para el cumplimiento de obligaciones y la atención de responsabilidades;</li>
          <li>la información de cuenta y autenticación se conservará mientras resulte necesaria para gestionar la cuenta y las relaciones asociadas a ella, sin perjuicio de las obligaciones legales de conservación;</li>
          <li>los registros técnicos y de seguridad se conservarán únicamente durante el período razonablemente necesario para su finalidad técnica, de seguridad, auditoría o defensa.</li>
        </ul>
        <p>
          Cuando una obligación legal impida la eliminación inmediata de determinados datos, podrán conservarse restringidos al cumplimiento de dicha obligación o al ejercicio o defensa de derechos.
        </p>
        <p>
          BúhoLex continuará implementando mecanismos técnicos de retención, bloqueo, eliminación o anonimización adecuados a cada categoría de información.
        </p>
      </section>

      <section id="seguridad">
        <h2>12. Seguridad</h2>
        <p>
          BúhoLex aplica medidas técnicas y organizativas orientadas a proteger la confidencialidad, integridad, disponibilidad y trazabilidad de la información.
        </p>
        <p>Entre ellas se encuentran, según la funcionalidad:</p>
        <ul>
          <li>separación de roles y privilegios de acceso;</li>
          <li>autenticación y autorización de operadores;</li>
          <li>conexiones y credenciales de base de datos diferenciadas por función;</li>
          <li>almacenamiento de determinados identificadores mediante funciones criptográficas;</li>
          <li>controles de idempotencia;</li>
          <li>registros de auditoría;</li>
          <li>restricciones de acceso a información privada;</li>
          <li>controles de tamaño, formato y origen en determinados endpoints;</li>
          <li>comunicaciones mediante HTTPS; y</li>
          <li>medidas de seguridad propias de los proveedores de infraestructura utilizados.</li>
        </ul>
        <p>
          Ningún sistema conectado a internet puede garantizar seguridad absoluta. Cuando BúhoLex detecte un incidente de seguridad que afecte datos personales, adoptará las medidas de evaluación, documentación, mitigación y, cuando legalmente corresponda, comunicación a los titulares y autoridades competentes.
        </p>
      </section>

      <section id="derechos">
        <h2>13. Derechos del titular</h2>
        <p>
          El titular de los datos personales puede ejercer los derechos reconocidos por la Ley N.° 29733 y su Reglamento, incluyendo los derechos de información, acceso, rectificación, cancelación y oposición, así como la revocación del consentimiento cuando corresponda.
        </p>
        <p>Las solicitudes podrán dirigirse inicialmente a:</p>
        <p><strong>Correo:</strong> <a href="mailto:eduardo@buholex.com">eduardo@buholex.com</a></p>
        <p>
          La solicitud deberá permitir identificar al titular o a su representante, precisar el derecho que desea ejercer y proporcionar la información razonablemente necesaria para localizar los datos correspondientes.
        </p>
        <p>
          BúhoLex atenderá estas solicitudes dentro de los plazos establecidos por la normativa vigente.
        </p>
        <p>
          La cancelación o supresión no implicará necesariamente la eliminación inmediata de información que deba conservarse por mandato legal, por una relación jurídica pendiente o para el ejercicio o defensa de derechos.
        </p>
        <p>
          Cuando el titular considere que su solicitud no ha sido atendida conforme a la normativa aplicable, podrá acudir a la Autoridad Nacional de Protección de Datos Personales.
        </p>
      </section>

      <section id="bancos-datos">
        <h2>14. Bancos de datos personales</h2>
        <p>
          Los datos personales sujetos a conservación organizada serán incorporados a los bancos de datos personales de titularidad de la Empresa que correspondan según su finalidad.
        </p>
        <p>
          La Empresa debe identificar, inscribir y mantener actualizados ante el Registro Nacional de Protección de Datos Personales los bancos sujetos a dicha obligación.
        </p>
        <p>
          Los códigos y denominaciones registrales correspondientes serán incorporados a esta Política una vez que su situación registral haya sido verificada administrativamente.
        </p>
        <p>
          La existencia de nuevas funcionalidades que generen bancos de datos personales o modifiquen sustancialmente los tratamientos existentes dará lugar a la revisión de esta Política y, cuando corresponda, a la actualización registral respectiva.
        </p>
      </section>

      <section id="cookies">
        <h2>15. Cookies y tecnologías similares</h2>
        <p>
          Las páginas públicas de BúhoLex no utilizan actualmente cookies publicitarias, de perfilado ni herramientas de seguimiento comportamental de terceros activas.
        </p>
        <p>
          BúhoLex utiliza Vercel Web Analytics para medición estadística agregada del tráfico y uso de la plataforma conforme al <Link href="/cookies" className="text-link">Aviso de Cookies y Tecnologías Similares</Link>.
        </p>
        <p>
          El proceso de autenticación utiliza cookies técnicas necesarias para iniciar y mantener de manera segura la sesión del usuario. Estas cookies no tienen por finalidad elaborar perfiles publicitarios.
        </p>
        <p>
          BúhoLex no almacena actualmente claves propias de seguimiento en localStorage o sessionStorage para publicidad o analítica comportamental.
        </p>
        <p>
          Antes de incorporar cookies analíticas, publicitarias o tecnologías no esenciales que requieran consentimiento, BúhoLex actualizará la información correspondiente y habilitará el mecanismo de elección que resulte jurídicamente necesario.
        </p>
        <p>
          La información detallada sobre cookies y tecnologías similares se desarrolla en el <Link href="/cookies" className="text-link">Aviso de Cookies de BúhoLex</Link>.
        </p>
      </section>

      <section id="comunicaciones">
        <h2>16. Comunicaciones por WhatsApp y correo electrónico</h2>
        <p>
          Cuando el usuario decide contactar a BúhoLex mediante WhatsApp o correo electrónico, la información es remitida a servicios externos elegidos o utilizados para esa comunicación.
        </p>
        <p>
          Antes de efectuar el envío, el usuario debe revisar el contenido de su mensaje y evitar incorporar datos personales o información confidencial que no resulte necesaria.
        </p>
        <p>
          Las comunicaciones recibidas podrán conservarse en la medida necesaria para atender la solicitud, continuar una relación profesional, acreditar comunicaciones o cumplir obligaciones legales.
        </p>
      </section>

      <section id="modificaciones">
        <h2>17. Modificaciones de la Política</h2>
        <p>
          BúhoLex podrá actualizar esta Política cuando cambien sus funcionalidades, proveedores, tratamientos de datos, obligaciones legales o medidas organizativas.
        </p>
        <p>
          Cada versión publicada deberá identificar su versión y fecha de entrada en vigencia.
        </p>
        <p>
          Cuando una modificación implique una nueva finalidad que requiera consentimiento, una transferencia no informada previamente u otro cambio que jurídicamente exija una nueva manifestación del titular, BúhoLex implementará el mecanismo correspondiente antes de iniciar dicho tratamiento.
        </p>
      </section>

      <section id="vigencia">
        <h2>18. Vigencia y trazabilidad</h2>
        <p>
          La versión vigente de esta Política será la publicada en la dirección oficial de BúhoLex destinada a la Política de Privacidad ({doc.canonicalPath}).
        </p>
        <p>
          BúhoLex mantendrá mecanismos que permitan identificar la versión de la Política aplicable a aquellas operaciones en las que resulte necesario conservar evidencia de la información o aceptación proporcionada al usuario.
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
