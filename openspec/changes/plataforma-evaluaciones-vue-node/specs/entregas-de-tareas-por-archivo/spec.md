## Purpose

Establecer la carga, organizacion y consulta de archivos de tareas para que el docente pueda revisar entregas de forma ordenada y consistente.

## ADDED Requirements

### Requirement: Carga de archivos permitidos
El sistema MUST permitir la entrega de tareas en archivos con extensiones permitidas: .cs, .java, .py, .cpp, .html, .js y .zip.

#### Scenario: Entrega con extension permitida
- **WHEN** un alumno sube un archivo con extension permitida para una tarea abierta
- **THEN** el sistema acepta y registra la entrega

#### Scenario: Entrega con extension no permitida
- **WHEN** un alumno sube un archivo con extension fuera de la lista permitida
- **THEN** el sistema rechaza la entrega e informa el motivo

### Requirement: Organizacion de entregas para revision docente
El sistema SHALL presentar al docente las entregas agrupadas por tarea y por alumno para facilitar la revision.

#### Scenario: Profesor consulta entregas de una tarea
- **WHEN** un profesor abre la vista de entregas de una tarea
- **THEN** el sistema muestra las entregas ordenadas e identificadas por alumno

### Requirement: Conservacion de metadatos de entrega
El sistema MUST guardar metadatos minimos de cada entrega: alumno, tarea, nombre de archivo, fecha y estado.

#### Scenario: Consulta de detalle de entrega
- **WHEN** un profesor accede al detalle de una entrega registrada
- **THEN** el sistema muestra los metadatos completos de esa entrega
