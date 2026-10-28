import Link from "next/link";
import { LEGAL_DOCUMENTS } from "@/lib/legal/legal-documents";

export function TermsAndConditionsV1() {
  const doc = LEGAL_DOCUMENTS.terms;

  return (
    <article className="legal-copy" style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
      <nav aria-label="Índice de Términos y Condiciones" style={{ background: "var(--background-secondary)", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Índice</h2>
        <ol style={{ margin: 0, paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <li><a href="#identidad">1. Identidad, objeto y ámbito de aplicación</a></li>
          <li><a href="#descripcion">2. Descripción actual de BúhoLex</a></li>
          <li><a href="#cuenta">3. Registro, autenticación y cuenta de usuario</a></li>
          <li><a href="#naturaleza">4. Naturaleza de la información jurídica</a></li>
          <li><a href="#ausencia-relacion">5. Ausencia de relación abogado-cliente automática</a></li>
          <li><a href="#herramientas-ia">6. Hermes, Búho Analítico e inteligencia artificial</a></li>
          <li><a href="#consulta-profesional">7. Consulta profesional</a></li>
          <li><a href="#libro-reclamaciones">8. Libro de Reclamaciones Virtual</a></li>
          <li><a href="#uso-permitido">9. Uso permitido</a></li>
          <li><a href="#uso-prohibido">10. Uso prohibido</a></li>
          <li><a href="#contenido-usuario">11. Contenido aportado por el usuario</a></li>
          <li><a href="#propiedad-intelectual">12. Propiedad intelectual</a></li>
          <li><a href="#fuentes-juridicas">13. Fuentes jurídicas y jurisprudencia</a></li>
          <li><a href="#disponibilidad">14. Disponibilidad y evolución del servicio</a></li>
          <li><a href="#servicios-pagados">15. Servicios pagados, planes y medios de pago</a></li>
          <li><a href="#proveedores">16. Proveedores y servicios externos</a></li>
          <li><a href="#seguridad">17. Seguridad</a></li>
          <li><a href="#suspension">18. Suspensión o restricción de acceso</a></li>
          <li><a href="#responsabilidad">19. Responsabilidad</a></li>
          <li><a href="#proteccion-consumidor">20. Protección al consumidor</a></li>
          <li><a href="#proteccion-datos">21. Protección de datos personales</a></li>
          <li><a href="#modificaciones">22. Modificaciones de los Términos</a></li>
          <li><a href="#legislacion">23. Legislación aplicable y solución de controversias</a></li>
          <li><a href="#contacto">24. Contacto</a></li>
          <li><a href="#vigencia">25. Vigencia y trazabilidad</a></li>
        </ol>
      </nav>

      <section id="identidad">
        <h2>1. Identidad, objeto y ámbito de aplicación</h2>
        <p>
          BúhoLex es una plataforma digital de tecnología jurídica operada por EMPRESA CONSTRUCTORA, CONSULTORA, BIENES Y SERVICIOS EN GENERAL JULITA S.A.C., identificada con RUC N.° 20571585902, con domicilio en Jr. José Gálvez N.° 844, Barranca, Lima, Perú, en adelante, la Empresa o BúhoLex.
        </p>
        <p>
          Los presentes Términos y Condiciones regulan el acceso y uso de las funcionalidades, contenidos y servicios que BúhoLex pone efectivamente a disposición del usuario.
        </p>
        <p>
          La disponibilidad de una sección, módulo, referencia visual o funcionalidad identificada como “próximamente”, “en preparación” o equivalente no implica que dicha funcionalidad se encuentre habilitada ni constituye una obligación de implementación dentro de un plazo determinado.
        </p>
        <p>
          Cuando una funcionalidad requiera una aceptación contractual específica, consentimiento, confirmación de pago u otra manifestación expresa, BúhoLex solicitará dicha actuación de manera diferenciada.
        </p>
      </section>

      <section id="descripcion">
        <h2>2. Descripción actual de BúhoLex</h2>
        <p>
          BúhoLex funciona como una plataforma de información, investigación, organización y asistencia jurídica mediante herramientas digitales.
        </p>
        <p>Según las funcionalidades actualmente habilitadas, BúhoLex puede comprender:</p>
        <ul>
          <li>contenidos jurídicos públicos;</li>
          <li>consulta y organización de jurisprudencia;</li>
          <li>acceso autenticado a espacios privados de usuario;</li>
          <li>herramientas de estructuración de consultas;</li>
          <li>canales de contacto y consulta profesional;</li>
          <li>Libro de Reclamaciones Virtual;</li>
          <li>funcionalidades administrativas internas;</li>
          <li>herramientas automatizadas o asistidas mediante inteligencia artificial cuando se encuentren expresamente habilitadas.</li>
        </ul>
        <p>
          La existencia técnica de componentes en desarrollo no significa que estén disponibles comercialmente para todos los usuarios.
        </p>
        <p>
          Actualmente, los servicios públicos de pago, suscripciones o contratación automatizada mediante pasarela de pagos no se encuentran habilitados para usuarios finales.
        </p>
      </section>

      <section id="cuenta">
        <h2>3. Registro, autenticación y cuenta de usuario</h2>
        <p>
          BúhoLex puede permitir el acceso a determinadas funcionalidades mediante autenticación con proveedores externos de identidad.
        </p>
        <p>
          Actualmente, el acceso autenticado puede realizarse mediante servicios de identidad integrados con la infraestructura de BúhoLex.
        </p>
        <p>El usuario es responsable de:</p>
        <ul>
          <li>utilizar una identidad legítimamente vinculada a su persona;</li>
          <li>proteger el acceso a su proveedor de identidad;</li>
          <li>no permitir que terceros utilicen indebidamente su sesión;</li>
          <li>cerrar sesión cuando utilice dispositivos compartidos; y</li>
          <li>comunicar cualquier uso no autorizado del que tenga conocimiento.</li>
        </ul>
        <p>
          BúhoLex no solicita ni almacena directamente la contraseña de la cuenta externa utilizada como proveedor de identidad.
        </p>
        <p>
          La existencia de una cuenta autenticada no implica por sí sola contratación de un servicio profesional, suscripción pagada ni relación abogado-cliente.
        </p>
      </section>

      <section id="naturaleza">
        <h2>4. Naturaleza de la información jurídica</h2>
        <p>
          Los contenidos, herramientas, resultados automatizados y demás información proporcionada por BúhoLex tienen carácter informativo, investigativo, organizativo u orientativo, según la funcionalidad utilizada.
        </p>
        <p>No constituyen por sí mismos:</p>
        <ul>
          <li>un dictamen jurídico vinculante;</li>
          <li>una garantía de resultado judicial, administrativo o arbitral;</li>
          <li>una sustitución automática del análisis profesional del caso concreto; ni</li>
          <li>una instrucción irrevocable para adoptar una determinada actuación jurídica.</li>
        </ul>
        <p>
          La aplicación de una norma, jurisprudencia, precedente, doctrina o criterio jurídico depende de su vigencia, contexto, hechos, procedimiento y demás circunstancias relevantes.
        </p>
        <p>
          El usuario debe evaluar la pertinencia de la información obtenida antes de emplearla en una decisión jurídica concreta.
        </p>
      </section>

      <section id="ausencia-relacion">
        <h2>5. Ausencia de relación abogado-cliente automática</h2>
        <p>
          El acceso a BúhoLex, la creación de una cuenta, el uso de sus herramientas o el envío de una consulta no crea automáticamente una relación abogado-cliente ni implica que la Empresa haya aceptado asumir el patrocinio, defensa o representación del usuario.
        </p>
        <p>Una relación profesional específica requerirá, cuando corresponda:</p>
        <ul>
          <li>evaluación del asunto;</li>
          <li>verificación de conflictos de interés;</li>
          <li>determinación del alcance del encargo;</li>
          <li>acuerdo respecto de las condiciones del servicio; y</li>
          <li>aceptación expresa de la relación profesional.</li>
        </ul>
        <p>
          La remisión de información mediante un formulario, WhatsApp, correo electrónico u otro canal previo a esa aceptación no obliga a la Empresa a asumir el caso.
        </p>
      </section>

      <section id="herramientas-ia">
        <h2>6. Hermes, Búho Analítico e inteligencia artificial</h2>
        <p>
          BúhoLex desarrolla y utiliza herramientas automatizadas de análisis jurídico y procesamiento de conocimiento.
        </p>
        <p>
          La infraestructura actualmente disponible puede integrar sistemas de inteligencia artificial para trabajar sobre fuentes jurídicas públicas y registros de jurisprudencia previamente incorporados y gobernados dentro de la plataforma.
        </p>
        <p>
          La existencia de esta infraestructura no significa que todas las funcionalidades de inteligencia artificial estén habilitadas para todos los usuarios ni que BúhoLex procese actualmente documentos privados, expedientes personales o información confidencial del usuario mediante proveedores externos de inteligencia artificial.
        </p>
        <p>
          Cuando una funcionalidad privada de inteligencia artificial sea habilitada, sus condiciones específicas de tratamiento, alcance, persistencia, proveedores y medidas de protección deberán encontrarse previamente informadas.
        </p>
        <p>Los resultados automatizados:</p>
        <ul>
          <li>pueden contener errores, omisiones o interpretaciones que requieran verificación;</li>
          <li>deben ser contrastados con las fuentes jurídicas correspondientes;</li>
          <li>no garantizan resultados procesales o administrativos;</li>
          <li>no deben utilizarse como única base para actuaciones urgentes o irreversibles sin una evaluación adecuada.</li>
        </ul>
        <p>
          BúhoLex podrá aplicar mecanismos de trazabilidad, control de fuentes, versiones, autorizaciones, registros de auditoría y otras medidas destinadas a mejorar la confiabilidad del conocimiento jurídico utilizado por sus sistemas.
        </p>
      </section>

      <section id="consulta-profesional">
        <h2>7. Consulta profesional</h2>
        <p>
          BúhoLex puede facilitar mecanismos para estructurar y remitir una consulta mediante canales externos, como correo electrónico o WhatsApp.
        </p>
        <p>
          Antes de enviar la comunicación, el usuario debe revisar el contenido y decidir qué información resulta necesaria.
        </p>
        <p>La consulta inicial:</p>
        <ul>
          <li>no constituye contratación automática;</li>
          <li>no garantiza aceptación del asunto;</li>
          <li>no garantiza respuesta inmediata; y</li>
          <li>puede estar sujeta a posterior verificación de disponibilidad, especialidad y conflictos de interés.</li>
        </ul>
        <p>
          El usuario debe evitar remitir información excesiva o datos de terceros que no resulten necesarios para la evaluación inicial.
        </p>
      </section>

      <section id="libro-reclamaciones">
        <h2>8. Libro de Reclamaciones Virtual</h2>
        <p>
          BúhoLex mantiene un Libro de Reclamaciones Virtual accesible desde su plataforma.
        </p>
        <p>
          El consumidor podrá utilizarlo para formular reclamos o quejas relacionados con productos o servicios sujetos a las normas de protección al consumidor.
        </p>
        <p>
          La presentación genera un número de hoja y mecanismos de seguimiento conforme a las funcionalidades habilitadas.
        </p>
        <p>
          BúhoLex atenderá los reclamos y quejas dentro del plazo previsto por la normativa vigente.
        </p>
        <p>La presentación de una reclamación:</p>
        <ul>
          <li>no está condicionada a pago alguno;</li>
          <li>no constituye por sí misma una denuncia administrativa;</li>
          <li>no restringe los derechos que correspondan al consumidor ante INDECOPI u otra autoridad competente; y</li>
          <li>será gestionada conforme a la información proporcionada y las normas aplicables.</li>
        </ul>
        <p>
          El tratamiento de los datos personales consignados en el Libro se rige por la <Link href="/privacidad" className="text-link">Política de Privacidad</Link> de BúhoLex.
        </p>
      </section>

      <section id="uso-permitido">
        <h2>9. Uso permitido</h2>
        <p>
          El usuario puede utilizar BúhoLex para finalidades legítimas relacionadas con las funcionalidades ofrecidas, incluyendo:
        </p>
        <ul>
          <li>consulta de información jurídica;</li>
          <li>investigación y análisis;</li>
          <li>organización de información;</li>
          <li>utilización de herramientas habilitadas;</li>
          <li>gestión de una cuenta personal;</li>
          <li>presentación de reclamaciones;</li>
          <li>comunicación con la Empresa; y</li>
          <li>demás usos compatibles con la finalidad del servicio.</li>
        </ul>
        <p>
          El usuario podrá realizar citas razonables de contenidos propios de BúhoLex respetando la atribución correspondiente y los derechos de terceros.
        </p>
      </section>

      <section id="uso-prohibido">
        <h2>10. Uso prohibido</h2>
        <p>No está permitido:</p>
        <ul>
          <li>utilizar la plataforma para actividades ilícitas;</li>
          <li>suplantar identidades;</li>
          <li>intentar acceder sin autorización a cuentas, sistemas, bases de datos o funciones internas;</li>
          <li>evadir mecanismos de seguridad, límites de uso o controles de autorización;</li>
          <li>introducir malware, código malicioso o contenido destinado a comprometer la plataforma;</li>
          <li>realizar ataques de disponibilidad o degradación deliberada del servicio;</li>
          <li>realizar extracción masiva o automatizada de información en contravención de los mecanismos técnicos o condiciones aplicables;</li>
          <li>realizar ingeniería inversa ilícita o destinada a vulnerar medidas de protección;</li>
          <li>utilizar credenciales ajenas;</li>
          <li>introducir deliberadamente información o documentos obtenidos ilícitamente;</li>
          <li>utilizar las funcionalidades de BúhoLex para vulnerar derechos de terceros; o</li>
          <li>emplear herramientas automatizadas para generar cargas abusivas o eludir controles operativos.</li>
        </ul>
        <p>
          La Empresa podrá adoptar medidas razonables de protección, limitación, suspensión o bloqueo cuando detecte usos incompatibles con estas reglas.
        </p>
      </section>

      <section id="contenido-usuario">
        <h2>11. Contenido aportado por el usuario</h2>
        <p>
          El usuario conserva los derechos que legalmente le correspondan sobre los datos, documentos, textos o materiales que proporcione.
        </p>
        <p>
          El uso de una funcionalidad autoriza el tratamiento técnico necesario para ejecutar la operación solicitada, dentro de los límites establecidos por la Política de Privacidad y las condiciones específicas de dicha funcionalidad.
        </p>
        <p>
          El usuario declara que cuenta con legitimidad suficiente para proporcionar los contenidos que incorpore a BúhoLex.
        </p>
        <p>
          Cuando los contenidos incluyan datos personales o información de terceros, el usuario debe limitarse a aquella información que resulte necesaria y cuya utilización sea lícita.
        </p>
        <p>
          BúhoLex no adquiere la propiedad de los documentos privados del usuario por el solo hecho de que sean procesados mediante la plataforma.
        </p>
        <p>
          BúhoLex no autoriza el uso de contenidos privados proporcionados por los usuarios para el entrenamiento general de modelos de inteligencia artificial, salvo que en el futuro exista una finalidad distinta, lícita, previamente informada y jurídicamente habilitada.
        </p>
      </section>

      <section id="propiedad-intelectual">
        <h2>12. Propiedad intelectual</h2>
        <p>
          La Empresa es titular, o cuenta con los derechos o licencias correspondientes, respecto de los elementos propios de BúhoLex, incluyendo, según corresponda:
        </p>
        <ul>
          <li>marca e identidad visual;</li>
          <li>diseño de interfaz;</li>
          <li>textos originales;</li>
          <li>estructuras editoriales;</li>
          <li>software desarrollado para la plataforma;</li>
          <li>modelos de organización propios;</li>
          <li>compilaciones y productos editoriales originales.</li>
        </ul>
        <p>
          Los componentes, bibliotecas, fuentes tipográficas, frameworks y demás recursos de terceros se rigen por sus respectivas licencias.
        </p>
        <p>BúhoLex no reclama propiedad sobre:</p>
        <ul>
          <li>normas jurídicas de dominio público;</li>
          <li>resoluciones judiciales o administrativas públicas;</li>
          <li>documentos públicos pertenecientes a sus respectivas fuentes;</li>
          <li>obras o documentos pertenecientes a terceros; ni</li>
          <li>contenido privado cuya titularidad corresponda al usuario.</li>
        </ul>
        <p>
          La organización, enriquecimiento editorial, sistematización, metadatos propios, interfaces, modelos de análisis y otros desarrollos originales de BúhoLex pueden encontrarse protegidos independientemente del carácter público de la fuente subyacente.
        </p>
      </section>

      <section id="fuentes-juridicas">
        <h2>13. Fuentes jurídicas y jurisprudencia</h2>
        <p>
          BúhoLex puede incorporar normas, resoluciones, jurisprudencia y otras fuentes jurídicas procedentes de repositorios oficiales o públicos.
        </p>
        <p>La plataforma puede aplicar procesos técnicos de:</p>
        <ul>
          <li>adquisición;</li>
          <li>verificación;</li>
          <li>extracción;</li>
          <li>normalización;</li>
          <li>clasificación;</li>
          <li>versionado;</li>
          <li>trazabilidad;</li>
          <li>gobierno editorial; y</li>
          <li>publicación.</li>
        </ul>
        <p>
          BúhoLex procura preservar la vinculación entre el contenido procesado y su fuente de origen.
        </p>
        <p>
          Sin embargo, el usuario debe verificar la fuente oficial cuando la exactitud, integridad, autenticidad o vigencia del documento resulte determinante para una actuación jurídica.
        </p>
        <p>
          La clasificación editorial realizada por BúhoLex no modifica la naturaleza jurídica que corresponda al documento conforme al ordenamiento aplicable.
        </p>
      </section>

      <section id="disponibilidad">
        <h2>14. Disponibilidad y evolución del servicio</h2>
        <p>BúhoLex se encuentra en evolución continua.</p>
        <p>La Empresa puede:</p>
        <ul>
          <li>incorporar funcionalidades;</li>
          <li>modificar interfaces;</li>
          <li>corregir errores;</li>
          <li>sustituir proveedores tecnológicos;</li>
          <li>realizar mantenimiento;</li>
          <li>suspender temporalmente determinados servicios;</li>
          <li>retirar funcionalidades obsoletas; o</li>
          <li>modificar límites técnicos razonables.</li>
        </ul>
        <p>
          Estas actuaciones no afectarán derechos adquiridos ni obligaciones contractuales previamente asumidas en términos incompatibles con la normativa aplicable.
        </p>
        <p>
          La Empresa no garantiza disponibilidad absoluta e ininterrumpida, pero adoptará medidas razonables para mantener la continuidad y seguridad del servicio.
        </p>
      </section>

      <section id="servicios-pagados">
        <h2>15. Servicios pagados, planes y medios de pago</h2>
        <p>
          Actualmente, BúhoLex no mantiene habilitada para el público una pasarela de pagos ni un sistema general de suscripciones automatizadas.
        </p>
        <p>
          La existencia de infraestructura técnica, integraciones en prueba o módulos administrativos relacionados con medios de pago no significa que exista una oferta comercial activa.
        </p>
        <p>Antes de habilitar una contratación electrónica pagada, BúhoLex informará, según corresponda:</p>
        <ul>
          <li>identidad del proveedor;</li>
          <li>descripción del servicio;</li>
          <li>precio;</li>
          <li>impuestos aplicables;</li>
          <li>modalidad y periodicidad del pago;</li>
          <li>duración;</li>
          <li>condiciones de renovación;</li>
          <li>condiciones de cancelación;</li>
          <li>política de devolución cuando corresponda;</li>
          <li>medio de pago;</li>
          <li>condiciones de acceso;</li>
          <li>emisión del comprobante correspondiente; y</li>
          <li>demás información exigible.</li>
        </ul>
        <p>
          Ningún usuario adquiere una obligación de pago por el simple hecho de navegar, crear una cuenta, consultar jurisprudencia gratuita o formular una consulta inicial.
        </p>
      </section>

      <section id="proveedores">
        <h2>16. Proveedores y servicios externos</h2>
        <p>
          BúhoLex utiliza o puede utilizar proveedores tecnológicos externos para prestar determinadas funcionalidades.
        </p>
        <p>
          El uso de servicios de terceros, como proveedores de identidad, alojamiento, infraestructura, correo electrónico o mensajería, puede quedar sujeto además a las condiciones propias del respectivo proveedor.
        </p>
        <p>
          BúhoLex seleccionará y configurará sus proveedores de acuerdo con las necesidades técnicas, contractuales y regulatorias de la plataforma.
        </p>
        <p>
          La información sobre tratamiento de datos personales por dichos proveedores se desarrolla en la <Link href="/privacidad" className="text-link">Política de Privacidad</Link>.
        </p>
      </section>

      <section id="seguridad">
        <h2>17. Seguridad</h2>
        <p>
          El usuario no debe intentar vulnerar las medidas de seguridad de BúhoLex.
        </p>
        <p>
          La Empresa puede emplear controles de autenticación, autorización, limitación de uso, separación de roles, registros de auditoría, controles criptográficos y otras medidas técnicas u organizativas.
        </p>
        <p>
          Cuando exista evidencia razonable de compromiso de una cuenta o actividad potencialmente ilícita, BúhoLex podrá adoptar medidas provisionales para proteger el sistema y a sus usuarios.
        </p>
      </section>

      <section id="suspension">
        <h2>18. Suspensión o restricción de acceso</h2>
        <p>
          BúhoLex podrá suspender, limitar o restringir determinadas funcionalidades cuando resulte razonablemente necesario por:
        </p>
        <ul>
          <li>riesgo de seguridad;</li>
          <li>incumplimiento grave de estos Términos;</li>
          <li>utilización abusiva;</li>
          <li>fraude;</li>
          <li>suplantación;</li>
          <li>requerimiento de autoridad competente;</li>
          <li>mantenimiento técnico; o</li>
          <li>protección de derechos de terceros.</li>
        </ul>
        <p>
          Cuando la naturaleza del caso lo permita, la medida será proporcional a la causa que la justifica.
        </p>
        <p>
          La suspensión de una cuenta no extingue automáticamente obligaciones o relaciones jurídicas que deban mantenerse por mandato legal o contractual.
        </p>
      </section>

      <section id="responsabilidad">
        <h2>19. Responsabilidad</h2>
        <p>
          BúhoLex responde por las obligaciones que le correspondan conforme a la legislación aplicable.
        </p>
        <p>
          Estos Términos no tienen por objeto excluir responsabilidad por dolo, culpa inexcusable, incumplimiento de obligaciones imperativas ni derechos reconocidos a los consumidores.
        </p>
        <p>BúhoLex no será responsable por consecuencias derivadas exclusivamente de:</p>
        <ul>
          <li>utilización contraria a estos Términos;</li>
          <li>información falsa o sustancialmente incompleta proporcionada por el usuario;</li>
          <li>decisiones adoptadas ignorando advertencias expresas de verificación;</li>
          <li>indisponibilidad atribuible exclusivamente a servicios externos fuera de su control razonable; o</li>
          <li>utilización de contenidos meramente orientativos como sustituto absoluto de la evaluación necesaria para una actuación concreta,</li>
        </ul>
        <p>
          sin perjuicio de las responsabilidades que legalmente correspondan a la Empresa en cada caso.
        </p>
      </section>

      <section id="proteccion-consumidor">
        <h2>20. Protección al consumidor</h2>
        <p>
          Cuando exista una relación de consumo, se aplicarán las disposiciones imperativas del Código de Protección y Defensa del Consumidor y demás normas aplicables.
        </p>
        <p>
          Ninguna disposición de estos Términos limita derechos irrenunciables del consumidor.
        </p>
        <p>
          BúhoLex mantiene accesible su <Link href="/libro-de-reclamaciones" className="text-link">Libro de Reclamaciones Virtual</Link> para la formulación de reclamos y quejas.
        </p>
        <p>
          La atención del reclamo no se condicionará al pago previo de suma alguna.
        </p>
        <p>
          El consumidor mantiene su derecho de acudir a INDECOPI u otras autoridades competentes cuando corresponda.
        </p>
      </section>

      <section id="proteccion-datos">
        <h2>21. Protección de datos personales</h2>
        <p>
          El tratamiento de datos personales realizado mediante BúhoLex se rige por la <Link href="/privacidad" className="text-link">Política de Privacidad y Tratamiento de Datos Personales</Link>, la Ley N.° 29733, su Reglamento y demás disposiciones aplicables.
        </p>
        <p>
          La existencia de estos Términos no sustituye las obligaciones específicas de información o consentimiento que resulten exigibles para un tratamiento concreto.
        </p>
      </section>

      <section id="modificaciones">
        <h2>22. Modificaciones de los Términos</h2>
        <p>BúhoLex podrá modificar estos Términos cuando cambien:</p>
        <ul>
          <li>las funcionalidades de la plataforma;</li>
          <li>las condiciones comerciales;</li>
          <li>las tecnologías utilizadas;</li>
          <li>las exigencias legales; o</li>
          <li>las reglas operativas del servicio.</li>
        </ul>
        <p>
          Cada versión deberá identificar su fecha de publicación y entrada en vigencia.
        </p>
        <p>
          Las modificaciones no se aplicarán retroactivamente en perjuicio de derechos previamente adquiridos, salvo cuando una norma imperativa exija lo contrario.
        </p>
        <p>
          Cuando una modificación requiera nueva aceptación expresa por parte del usuario, BúhoLex implementará el mecanismo correspondiente antes de exigirla.
        </p>
      </section>

      <section id="legislacion">
        <h2>23. Legislación aplicable y solución de controversias</h2>
        <p>Estos Términos se rigen por la legislación de la República del Perú.</p>
        <p>
          La Empresa y el usuario podrán procurar una solución directa mediante los canales institucionales disponibles.
        </p>
        <p>
          Cuando corresponda una relación de consumo, el usuario podrá ejercer los derechos y mecanismos previstos por la normativa de protección al consumidor, incluyendo acudir a INDECOPI.
        </p>
        <p>
          Las controversias que correspondan al Poder Judicial serán sometidas a los órganos jurisdiccionales competentes conforme a las normas peruanas aplicables, sin imponer al consumidor una renuncia a los fueros o derechos que legalmente le correspondan.
        </p>
      </section>

      <section id="contacto">
        <h2>24. Contacto</h2>
        <p>
          <strong>BúhoLex</strong><br />
          EMPRESA CONSTRUCTORA, CONSULTORA, BIENES Y SERVICIOS EN GENERAL JULITA S.A.C.<br />
          RUC N.° 20571585902<br />
          Jr. José Gálvez N.° 844, Barranca, Lima, Perú<br />
          Correo: <a href="mailto:eduardo@buholex.com">eduardo@buholex.com</a><br />
          Teléfono / WhatsApp: +51 922 038 147
        </p>
      </section>

      <section id="vigencia">
        <h2>25. Vigencia y trazabilidad</h2>
        <p>
          La versión vigente será aquella publicada en la dirección oficial de BúhoLex correspondiente a los Términos y Condiciones ({doc.canonicalPath}).
        </p>
        <p>
          Cuando una operación requiera aceptación expresa, BúhoLex podrá conservar evidencia de la versión de los Términos aceptada, la fecha de dicha manifestación y demás elementos necesarios para acreditar el acto.
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
