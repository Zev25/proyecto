# Seguridad del backend

Fecha de revision: 2026-10-19

Este documento describe lo que se observa actualmente en el codigo del backend y lo pendiente antes de usarlo con datos reales o desplegarlo publicamente. Es una revision del codigo, no una auditoria de infraestructura ni una prueba de penetracion.

## Estado actual

### Autenticacion y roles
- `POST /login` busca al usuario por nombre y compara la contrasena recibida directamente con `Usuario.contrasena`.
- No se emite JWT, cookie de sesion ni otro mecanismo de autenticacion persistente.
- `autorizarRoles` obtiene el rol desde `req.user`, `x-user-role`, `body.tipo` o `query.tipo`. En el estado actual no hay middleware que verifique una identidad y establezca `req.user`.
- Por ello, enviar `x-user-role: admin`, `profesor` o `alumno` basta para superar las comprobaciones de rol. CORS no evita llamadas directas con curl u otros clientes.
- El registro valida presencia/formato de email y duplicados, pero recibe `tipo` y cursos desde el cliente. La interfaz publica oculta el selector de perfil, pero la API no obliga el rol `alumno`.

### Datos personales y acceso a rutas
- La tabla `Usuario` almacena nombre, apellido, email, nombre de usuario, rol, estado y contrasena.
- `GET /usuarios`, `GET /usuarios/:id`, `DELETE /usuarios/:id`, `GET /admin/buscar-usuario`, `GET /db-health` y `GET /tareas/:curso` no aplican actualmente `autorizarRoles`.
- `GET /tareas/:curso` tambien es publico.
- Rutas que sí usan `autorizarRoles` siguen siendo accesibles falsificando el rol en headers/body/query.
- `GET /panel-alumno` no usa el middleware y acepta el rol desde query/header/body; solo devuelve un mensaje, pero no es un control de acceso real.
- El login devuelve un error generico para credenciales invalidas, pero varios handlers responden con `error.message`, lo que puede exponer detalles internos de MySQL.

### Permisos sobre recursos
- Varias operaciones reciben identidad mediante campos elegidos por el cliente: por ejemplo, usuario al responder/canjear una invitacion, `profesorUsuario` al crear tarea, o nombre de profesor/alumno por query/header.
- Los servicios `verIntentosProfesor` y `verDetalleIntento` sí restringen la evaluacion al campo `creado_por`; sin embargo, el `profesorUsuario` se deriva de headers/body y no de identidad verificada, por lo que esa comprobacion puede ser falsificada.
- El envio de respuestas valida que el intento pertenezca al `alumno_id` resuelto, pero ese usuario procede de headers mientras no exista autenticacion. La matricula se comprueba al iniciar el intento, no se vuelve a comprobar al enviarlo.
- La regla de ultimo administrador cuenta admins activos dentro de una transaccion, pero no serializa solicitudes concurrentes; dos cambios simultaneos podrían superar la comprobacion.

### Invitaciones numericas
- El codigo tiene 8 digitos y se genera con `crypto.randomInt`.
- La base guarda el SHA-256 del codigo, no el codigo plano; el codigo se devuelve al crear la invitacion.
- El canje valida expiracion y cupo, bloquea la fila de invitacion con `FOR UPDATE`, registra un solo canje por alumno/invitacion y actualiza el contador dentro de una transaccion.
- No se observa rate limit, limite de intentos ni demora progresiva en el endpoint de canje. Por su espacio numerico finito, debe protegerse contra intentos automatizados.
- No hay endpoints de listado/revocacion de invitaciones implementados en el panel admin.

### Base de datos y arranque
- Las consultas de valores usan placeholders de `mysql2` en la mayoria de los controladores.
- El helper sin referencias `actualizarUsuario`, que construia nombres de columna desde claves de `datos`, fue eliminado en la revision estatica del 2026-10-19.
- El backend verifica/agrega columnas y tablas auxiliares al arrancar. Un `catch` general solo registra el error y permite continuar, aunque el esquema haya quedado incompleto.
- La configuracion de la base se lee de `backend/config/.env`; ese archivo no debe compartirse. El `.env.example` contiene placeholders.
- CORS permite `http://localhost:5173` y `http://localhost:5174` para desarrollo; esto es una politica de navegador, no autenticacion ni control de acceso.
- El arranque de esquema ahora tiene una sola creacion/backfill de `IntentoPregunta`; esa duplicacion se elimino durante la revision estatica.

## Riesgos prioritarios

### P0/P1 antes de exponer la API
- Sustituir roles declarados por el cliente por autenticacion real. Validar token/sesion y establecer `req.user` solo desde credenciales verificadas.
- Derivar el usuario objetivo desde la identidad autenticada; no aceptar `adminUsuario`, `alumnoUsuario` o `profesorUsuario` como prueba de identidad.
- Proteger por rol e identidad las rutas de usuarios, busqueda admin, eliminacion y tareas publicas; aplicar autorizacion de propiedad a intentos, evaluaciones y tareas.
- No permitir que el registro publico elija `admin` o `profesor`; asignar rol `alumno` en el servidor. La asignacion de cursos debe seguir las reglas de matricula/invitacion del servidor.
- Reemplazar contrasenas en texto plano por Argon2id o bcrypt. Preparar migracion compatible con cuentas existentes y verificar hashes durante login.

### P1/P2 antes de uso amplio
- Agregar rate limit por IP y por cuenta a login y canje de invitaciones, con respuestas genericas para reducir enumeracion.
- Evaluar aumentar entropia del codigo o añadir tokens aleatorios largos; mantener el codigo numerico como alias de uso facil si hace falta.
- Hacer atomica la proteccion del ultimo admin bajo concurrencia.
- Fallar el arranque si una migracion requerida no se aplica; preferir migraciones SQL versionadas y ejecutadas como paso explicito.
- Limitar el tamano del body, validar payloads con esquemas, agregar cabeceras HTTP seguras y ocultar errores SQL al cliente.
- Usar una cuenta MySQL de minimo privilegio y TLS/HTTPS en despliegues remotos. Si la autenticacion usa cookies, definir proteccion CSRF y `SameSite`.

## Recomendaciones de implementacion

1. Definir contrato de sesion (JWT de vida corta o cookie segura) y middleware de autenticacion.
2. Hacer que RBAC consuma un `req.user` verificado; retirar `x-user-role`, `body.tipo` y `query.tipo` como fuente de autoridad.
3. Añadir pruebas de integracion para acceso anonimo, rol incorrecto, IDOR, registro con rol prohibido y recursos ajenos.
4. Añadir pruebas de login para hash, cuenta inactiva y contrasena incorrecta.
5. Añadir pruebas de fuerza bruta/rate limit, expiracion, cupo agotado, canje repetido y canjes concurrentes.
6. Registrar en logs eventos de seguridad sin escribir contrasenas, tokens ni codigos completos de invitacion.

## Pruebas minimas de seguridad

- Registro publico intentando `tipo: "admin"` o `"profesor"`: debe rechazarse o crear solo alumno.
- Llamar rutas admin con `x-user-role: admin` sin sesion valida: debe responder `401`.
- Alumno que intenta leer intentos, respuestas o tareas de otro usuario: debe responder `403` o `404` sin filtrar datos.
- Profesor que intenta consultar intentos de una evaluacion ajena: debe rechazarse.
- Solicitar `/usuarios`, `/usuarios/:id`, `/admin/buscar-usuario` y `DELETE /usuarios/:id` sin permisos: debe rechazarse.
- Canjear codigos inexistentes repetidamente y concurrentemente: respetar rate limit, cupo y una sola matricula por alumno.
- Simular fallo de migracion: el backend no debe anunciarse listo con un esquema incompatible.

## Notas de alcance
- El modelo de cursos, turnos, materias, clases y matriculas aun esta en diseño. Antes de persistirlo, definir autorizacion por clase/oferta y comprobar inscripcion en servidor.
- Este documento es una lista de estado y trabajo pendiente; no implica que las recomendaciones ya esten implementadas.

## Revision comparativa 2026-10-19

### Confirmado en esta revision
- Siguen vigentes los riesgos P0/P1 ya descritos: contrasenas en texto plano, roles declarados por el cliente, registro con `tipo` controlado por el cliente y rutas sin middleware.
- Se confirmo que existe una comprobacion de propiedad de la evaluacion en las consultas docentes y del intento por `alumno_id` al responder. Estas comprobaciones no resuelven la falsificacion de identidad porque `req.user` no se establece desde credenciales verificadas.
- Se confirmo exposicion de `error.message` de errores internos en respuestas 500 y migraciones de arranque que registran errores pero dejan levantar el servidor.
- La idea de usar una base de datos online queda pospuesta hasta despues de la presentacion. No hay proveedor remoto seleccionado ni configurado.

### Limpiezas completadas
- Se eliminaron helpers sin referencias (`asignarRolProfesor` y `actualizarUsuario`), estilos de prototipo de alumno sin uso y definiciones duplicadas de `IntentoPregunta` en el arranque y `schema.sql`.
- Los datos ficticios de resumen/cursos en los dashboards siguen teniendo referencias activas; se consideran fixtures visuales pendientes de reemplazo por datos reales, no codigo muerto confirmado.

### Limites
- Es un escaneo estatico del codigo fuente y referencias del workspace; no es auditoria de infraestructura, analisis de dependencias, pentest, prueba de concurrencia ni verificacion de permisos con usuarios reales.
- No se implementaron en esta revision autenticacion, hashing, RBAC verificado, rate limits ni protecciones de red.

## Escaneo de codigo y comparacion 2026-10-19

Alcance: archivos fuente de `backend/src`, `frontend/src`, esquema SQL, paquetes y configuracion visible del proyecto. Se buscaron referencias, handlers, imports, helpers, CSS sin consumidores, datos de demostracion y patrones sensibles. No se inspeccionaron `node_modules`, artefactos compilados, secretos, ni se ejecutaron pruebas de penetracion.

| Hallazgo observado | Comparacion con esta ficha | Prioridad/estado |
| --- | --- | --- |
| `autorizarRoles` acepta `x-user-role`, `body.tipo` y `query.tipo`; muchas rutas aceptan usuario por headers/body/query. | Ya estaba registrado y sigue vigente; los headers y el nombre de usuario no son identidad autenticada. | P0 antes de datos reales/exposicion publica. |
| `POST /login` compara contrasenas en texto plano y no crea sesion/token verificado. | Ya estaba registrado y sigue vigente. | P0. |
| `GET /usuarios`, `GET /usuarios/:id`, `DELETE /usuarios/:id`, `GET /admin/buscar-usuario`, `GET /db-health` y `GET /tareas/:curso` carecen de RBAC. `GET /panel-alumno` solo compara un rol falsificable. | Actualiza la lista de rutas publicas; `/db-health` y `/panel-alumno` no estaban detallados. | P1; restringir o limitar por entorno. |
| `verIntentosProfesor`/`verDetalleIntento` comprueban `creado_por`, y la respuesta del alumno comprueba `alumno_id`; la identidad que alimenta esas consultas sigue siendo falsificable. | Corrige el texto anterior: hay filtros de propiedad SQL, pero no una garantia efectiva hasta autenticar la identidad. | P1; resolver autenticacion antes de confiar en ownership. |
| Handlers 500 devuelven `error.message`; el arranque captura errores de migracion y aun inicia Express. | Ya estaba registrado y sigue vigente. | P1/P2. |
| El canje de invitaciones numericas no tiene rate limit; no se observaron rate limits en login. | Ya estaba registrado para invitaciones; se amplia a login. | P1/P2. |
| El frontend fija `http://localhost:3000` en App, admin y alumno; CORS permite solo puertos localhost de Vite. | Hallazgo para cualquier despliegue remoto; no causa un bypass de autenticacion, pero bloquea el despliegue web y no sustituye TLS. | Pendiente antes de despliegue. |
| Filas, cursos, metricas, actividades y algunas preferencias del dashboard se alimentan de constantes de demostracion. | Son referencias activas y visibles, no codigo muerto confirmado. Deben reemplazarse por consultas reales al implementar esas capacidades. | Pendiente funcional (incluye 9.5 y partes de paneles). |
| El paquete backend define `start1` identico a `start` y `nodemon` sin script que lo invoque; `frontend/src/components/` esta vacio. | Candidatos de simplificacion confirmados por busqueda de referencias; se registran para decidir limpieza sin cambiar comandos potencialmente usados. | Bajo; no afecta ejecucion actual. |
| Se elimino `actualizarUsuario` (SQL dinamico y sin callers), `asignarRolProfesor` (sin callers), estilos alumno sin selectores y una segunda migracion/definicion de `IntentoPregunta`. | Limpiezas verificadas en referencias del workspace y build/sintaxis disponible. | Completado. |

## Idea futura: base de datos online
- Se reconsiderara despues de la presentacion. Hasta entonces, el sistema sigue usando la configuracion MySQL actual; no hay proveedor ni conexion remota que mantener.
