## Purpose

Definir el comportamiento de asistencia por IA para acelerar la revision docente sin reemplazar la decision final de calificacion.

## ADDED Requirements

### Requirement: Sugerencia IA para respuestas de examen
El sistema MUST generar para cada respuesta evaluable una sugerencia de clasificacion (correcta, parcialmente correcta o incorrecta) con una explicacion breve.

#### Scenario: Correccion sugerida de respuesta textual
- **WHEN** una respuesta de examen es enviada al motor de evaluacion IA
- **THEN** el sistema devuelve una clasificacion sugerida y una explicacion breve

### Requirement: Evaluacion IA de tareas por rubrica
El sistema SHALL analizar archivos de tarea entregados contra una rubrica definida por el profesor y emitir cumplimiento por criterio.

#### Scenario: Revision por criterios de rubrica
- **WHEN** un profesor solicita evaluacion IA de una entrega con rubrica configurada
- **THEN** el sistema devuelve resultado por criterio con estado de cumple, parcial o no cumple

### Requirement: Control docente sobre calificacion final
El sistema MUST permitir que el profesor acepte o modifique las sugerencias IA antes de publicar la calificacion final.

#### Scenario: Ajuste docente de sugerencia IA
- **WHEN** un profesor revisa una sugerencia de calificacion generada por IA
- **THEN** el sistema permite editar la decision y registra la calificacion final aprobada por docente

### Requirement: Trazabilidad de evaluacion asistida
El sistema MUST registrar la sugerencia IA, la decision final docente y su marca temporal para auditoria academica.

#### Scenario: Auditoria de una calificacion asistida
- **WHEN** un profesor consulta el historial de evaluacion de una respuesta o entrega
- **THEN** el sistema muestra sugerencia IA, decision final y fecha de cada accion
