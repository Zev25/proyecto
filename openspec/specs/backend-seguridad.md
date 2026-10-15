# Seguridad del backend

Fecha de revision: 2026-10-13

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
- `GET /usuarios`, `GET /usuarios/:id`, `DELETE /usuarios/:id` y `GET /admin/buscar-usuario` no aplican actualmente `autorizarRoles`.
- `GET /tareas/:curso` tambien es publico.
- Rutas que sí usan `autorizarRoles` siguen siendo accesibles falsificando el rol en headers/body/query.
- El login devuelve un error generico para credenciales invalidas, pero algunos handlers responden con `error.message`, lo que puede exponer detalles internos de MySQL.

### Permisos sobre recursos
- Varias operaciones reciben identidad mediante campos elegidos por el cliente: por ejemplo, usuario al responder una evaluacion, `profesorUsuario` al crear tarea, o nombre de profesor/alumno por query/header.
- El handler de intentos de profesor comprueba rol, pero no que la evaluacion/intento pertenezca al profesor autenticado.
- El handler de respuesta de evaluacion no verifica que el alumno autenticado este matriculado en el curso de la evaluacion.
- La regla de ultimo administrador cuenta admins activos dentro de una transaccion, pero no serializa solicitudes concurrentes; dos cambios simultaneos podrían superar la comprobacion.

### Invitaciones numericas
- El codigo tiene 8 digitos y se genera con `crypto.randomInt`.
- La base guarda el SHA-256 del codigo, no el codigo plano; el codigo se devuelve al crear la invitacion.
- El canje valida expiracion y cupo, bloquea la fila de invitacion con `FOR UPDATE`, registra un solo canje por alumno/invitacion y actualiza el contador dentro de una transaccion.
- No se observa rate limit, limite de intentos ni demora progresiva en el endpoint de canje. Por su espacio numerico finito, debe protegerse contra intentos automatizados.
- No hay endpoints de listado/revocacion de invitaciones implementados en el panel admin.

### Base de datos y arranque
- Las consultas de valores usan placeholders de `mysql2` en la mayoria de los controladores.
- `actualizarUsuario` construye dinamicamente nombres de columna desde las claves de `datos`; no aparece conectado a una ruta actual y no debe exponerse sin una lista permitida de columnas.
- El backend verifica/agrega columnas y tablas auxiliares al arrancar. Un `catch` general solo registra el error y permite continuar, aunque el esquema haya quedado incompleto.
- La configuracion de la base se lee de `backend/config/.env`; ese archivo no debe compartirse. El `.env.example` contiene placeholders.
- CORS esta configurado para `http://localhost:5173`, lo cual es una politica de navegador para desarrollo, no autenticacion ni control de acceso.

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
