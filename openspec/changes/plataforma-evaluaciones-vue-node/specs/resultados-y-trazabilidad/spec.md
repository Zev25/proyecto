## Purpose

Definir el registro y consulta de respuestas e intentos para que alumnos y docentes dispongan de resultados confiables y auditables por evaluacion.

## ADDED Requirements

### Requirement: Registro de respuestas por intento
El sistema MUST guardar las respuestas del alumno asociadas a un intento unico y a su evaluacion correspondiente.

#### Scenario: Envio de respuestas completado
- **WHEN** un alumno envia su examen dentro del intento activo
- **THEN** el sistema registra las respuestas vinculadas al intento y al alumno

### Requirement: Consulta de resultados por alumno
El sistema SHALL permitir que cada alumno vea unicamente sus propios resultados publicados.

#### Scenario: Alumno consulta su historial
- **WHEN** un alumno autenticado accede a resultados
- **THEN** el sistema muestra solo sus calificaciones y detalles autorizados

#### Scenario: Alumno intenta ver resultados de otro usuario
- **WHEN** un alumno solicita un resultado que no le pertenece
- **THEN** el sistema deniega el acceso

### Requirement: Consulta docente por evaluacion
El sistema MUST permitir al profesor consultar resultados agregados y por intento para las evaluaciones bajo su gestion.

#### Scenario: Profesor revisa resultados de su evaluacion
- **WHEN** un profesor abre la vista de resultados de una evaluacion propia
- **THEN** el sistema presenta listado de intentos y resultados asociados

### Requirement: Promedio de evaluaciones visible al alumno
El sistema MUST mostrar al alumno el promedio de sus intentos completados por categoria, calculado sobre una escala de 10 y sin incluir intentos sin enviar.

#### Scenario: Alumno consulta un promedio con varios intentos
- **WHEN** el alumno tiene intentos completados de evaluaciones regulares o examenes finales
- **THEN** el sistema normaliza cada intento segun el puntaje maximo de las preguntas seleccionadas, incluye cada intento por separado y muestra el promedio de cada categoria sobre 10

#### Scenario: Alumno aun no completa intentos de una categoria
- **WHEN** el alumno consulta una categoria sin intentos completados
- **THEN** el sistema muestra un estado sin calificaciones y no presenta un promedio ficticio
