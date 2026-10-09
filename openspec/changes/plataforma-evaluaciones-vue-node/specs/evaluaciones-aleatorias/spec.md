## Purpose

Establecer reglas verificables para crear examenes con bancos de preguntas y generar intentos aleatorios por alumno, reduciendo la repeticion de examenes identicos.

## ADDED Requirements

### Requirement: Banco de preguntas por evaluacion
El sistema MUST permitir al profesor registrar y mantener un banco de hasta 50 preguntas por evaluacion.

#### Scenario: Registro dentro del limite permitido
- **WHEN** un profesor agrega preguntas y el total queda en 50 o menos
- **THEN** el sistema guarda el banco de preguntas de la evaluacion

#### Scenario: Exceso del limite permitido
- **WHEN** un profesor intenta agregar una pregunta que supera 50 en el banco
- **THEN** el sistema rechaza la operacion e informa el limite maximo

### Requirement: Seleccion aleatoria de preguntas por intento
El sistema SHALL generar cada intento de examen con 20 preguntas seleccionadas de forma aleatoria desde el banco definido.

#### Scenario: Generacion de intento con banco suficiente
- **WHEN** un alumno inicia un examen cuyo banco tiene al menos 20 preguntas
- **THEN** el sistema crea un intento con 20 preguntas aleatorias

#### Scenario: Banco insuficiente para iniciar examen
- **WHEN** un alumno intenta iniciar un examen con menos de 20 preguntas en el banco
- **THEN** el sistema bloquea el inicio e informa que el examen no esta habilitado

### Requirement: Trazabilidad de seleccion por alumno
El sistema MUST persistir el conjunto exacto de preguntas seleccionadas para cada intento de alumno.

#### Scenario: Consulta posterior de intento
- **WHEN** un profesor consulta el detalle de un intento ya generado
- **THEN** el sistema muestra las 20 preguntas exactas asignadas en ese intento
