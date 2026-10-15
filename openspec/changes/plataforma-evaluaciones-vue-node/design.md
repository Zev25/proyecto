## Context

Ver motivacion en proposal.md (seccion Why). El proyecto inicia sin implementacion previa y requiere una base modular en JavaScript, con frontend en Vue y backend en Node.js + Express, usando MySQL como persistencia. Se acordo priorizar primero autenticacion, evaluaciones y resultados; y dejar para la fase final todo lo relacionado con IA y revision de tareas por archivos.

## Goals / Non-Goals

**Goals:**
- Definir una arquitectura web modular con separacion clara entre frontend, API y base de datos.
- Asegurar soporte de roles profesor/alumno desde el diseno inicial.
- Establecer una secuencia de entrega por fases para reducir riesgo de integracion.
- Dejar trazabilidad documental de decisiones funcionales y tecnicas.

**Non-Goals:**
- No definir implementacion de bajo nivel por archivo o clase en esta etapa.
- No cerrar proveedor final de IA ni su estrategia de costos en esta fase.
- No incluir optimizaciones avanzadas de escalado hasta validar flujo funcional base.

## Decisions

### 1) Stack principal JavaScript
- Decision: Frontend en Vue; backend en Node.js + Express; acceso a MySQL con `mysql2`; configuracion por entorno con `dotenv`.
- Rationale: Se alinea con la preferencia explicita del proyecto y simplifica curva de aprendizaje y mantenimiento.
- Alternatives considered:
  - C# + ASP.NET: descartado por preferencia de stack JavaScript.
  - Backend con framework mas opinionado: pospuesto para evitar sobrecarga inicial.

### 2) Arquitectura por capas con API REST
- Decision: separar UI (Vue), logica de negocio (Express) y persistencia (MySQL), con contratos de API claros por modulo.
- Rationale: facilita pruebas por modulo y cambios de implementacion sin afectar contrato externo.
- Alternatives considered:
  - Monolito acoplado UI+logica en servidor de plantillas: descartado por menor flexibilidad para evolucionar frontend.

### 3) Secuencia de fases con IA al final
- Decision: implementar primero autenticacion/roles, evaluaciones aleatorias y resultados; luego entregas por archivo; y finalmente IA.
- Rationale: permite validar el flujo academico principal antes de agregar complejidad de analisis automatico.
- Alternatives considered:
  - Integrar IA desde la primera iteracion: descartado por alto riesgo de retrabajo en criterios de evaluacion.

### 4) IA como asistencia y no como veredicto final
- Decision: la IA emite sugerencias y explicacion; docente conserva la decision final de calificacion.
- Rationale: mejora velocidad de revision sin perder control academico ni trazabilidad.
- Alternatives considered:
  - Calificacion totalmente automatica: descartada por riesgo de errores pedagogicos y de aceptacion.

### 5) Documentacion continua del cambio
- Decision: mantener artefactos OpenSpec actualizados y una bitacora de decisiones de conversacion durante toda la ejecucion.
- Rationale: evita perdida de contexto, acelera onboarding y deja evidencia de por que se tomaron decisiones.
- Alternatives considered:
  - Documentacion solo al final: descartada por riesgo de omisiones y contradicciones.

### 6) Importacion de bancos de preguntas desde XLSX
- Decision: recibir archivos `.xlsx` en memoria, validar encabezados y filas, y devolver el banco al editor para revision antes de guardar la evaluacion.
- Formato: columnas `Enunciado`, `Tipo`, `Opciones`, `Respuesta correcta` y `Puntos`; las opciones se separan con `|` o se indican como arreglo JSON de textos. Una celda de opciones vacia representa una pregunta abierta.
- Limites: admitir hasta 50 preguntas y archivos de hasta 2 MB; rechazar el libro completo si alguna fila no es valida.
- Rationale: el profesor puede revisar y corregir el banco importado; la persistencia ocurre solo al usar la accion explicita de guardar evaluacion.

### 7) Lista y edicion de evaluaciones del profesor
- Decision: listar solo evaluaciones creadas por el profesor autenticado, mostrando fechas de creacion y fin, curso e intentos registrados.
- Decision: permitir editar banco y metadatos solo antes del primer intento; actualizar evaluacion y preguntas en una transaccion.
- Rationale: los intentos conservan el banco exacto que recibieron y no se alteran al editar una evaluacion ya utilizada.

### 8) Limite de preguntas por intento
- Decision: no permitir que `preguntas_por_intento` supere la cantidad de preguntas validas del banco, tanto al crear como al editar una evaluacion.
- Interfaz: mostrar el tamano actual del banco en el editor, indicar el exceso y deshabilitar el guardado hasta corregirlo.
- Rationale: evitar evaluaciones guardadas que inevitablemente fallarian al iniciar un intento por falta de preguntas.

## Risks / Trade-offs

- [Riesgo] Aleatoriedad con dificultad desigual entre alumnos -> [Mitigacion] introducir etiquetado por dificultad y reglas de balanceo en fase posterior.
- [Riesgo] Inconsistencia de IA al revisar respuestas y archivos -> [Mitigacion] exigir rubricas estructuradas y revision final docente.
- [Riesgo] Subida de archivos potencialmente inseguros -> [Mitigacion] lista de extensiones permitidas, validacion de metadatos y almacenamiento aislado.
- [Riesgo] Crecimiento de alcance por nuevas solicitudes -> [Mitigacion] control de cambios via OpenSpec con propuesta, specs y tareas por fase.

## Estructura del proyecto

La implementacion real se organizara en dos grandes bloques separados del contenido documental:

- `frontend/`: aplicacion Vue para la interfaz de profesor y alumno.
- `backend/`: API Express para autenticacion, evaluaciones, resultados y servicios de archivos.
- `backend/config/`: configuracion de entorno y variables del sistema.
- `backend/uploads/`: almacenamiento de entregas de archivos.

Esta estructura permite mantener el desarrollo modular y separar claramente la experiencia de usuario de la logica del servidor.

## Migration Plan

1. Definir esquema inicial de datos (usuarios, cursos, evaluaciones, preguntas, intentos, respuestas, resultados).
2. Habilitar autenticacion y autorizacion por rol en API y frontend.
3. Implementar modulo de banco de preguntas y generacion de intentos aleatorios.
4. Incorporar consulta de resultados con trazabilidad por intento.
5. Integrar modulo de entregas por archivo con visualizacion docente.
6. Integrar evaluacion asistida por IA para examenes y revision de tareas por rubrica.
7. Ejecutar validacion integral, pruebas de regresion y estabilizacion.

## Open Questions

- Se definira si la primera version incluye una sola institucion o soporte multiinstitucion.
- Falta acordar limite de tamano por archivo y politica de retencion de entregas.
- Falta definir proveedor de IA y politica de costos por volumen de evaluaciones.

## Bitacora de decisiones de conversacion

- 2026-08-20: Se descarta C# y se confirma stack JavaScript.
- 2026-08-20: Frontend confirmado en Vue.
- 2026-08-20: Backend confirmado en Node.js + Express con `mysql2` y `dotenv`.
- 2026-08-20: IA y analisis de entregas por archivo se mueven explicitamente a la ultima fase.
- 2026-08-20: Se solicita documentacion continua, incluyendo decisiones surgidas en las charlas.
- 2026-10-15: El profesor puede configurar de 1 a 50 preguntas por intento (20 por defecto) e importar bancos XLSX con encabezados definidos.