## Purpose

Definir el flujo de invitaciones para que administracion habilite la matricula de alumnos a cursos con codigos limitados y verificables.

## ADDED Requirements

### Requirement: Creacion de invitaciones por administracion
El sistema MUST permitir al administrador crear una invitacion para uno o mas cursos con fecha de expiracion y cupo de usos configurables.

#### Scenario: Invitacion creada
- **WHEN** el administrador selecciona cursos y define expiracion y cupo validos
- **THEN** el sistema genera un codigo para compartir y conserva unicamente su hash para validarlo

### Requirement: Canje de invitacion por alumno
El sistema MUST permitir que un alumno activo canjee un codigo vigente y agregar los cursos incluidos sin eliminar los que ya tiene.

#### Scenario: Canje exitoso
- **WHEN** un alumno activo canjea una invitacion valida con usos disponibles
- **THEN** el sistema agrega los cursos nuevos de forma atomica y confirma la matricula

#### Scenario: Codigo no disponible
- **WHEN** el codigo es invalido, vencio, alcanzo su cupo, ya fue canjeado por el alumno o todos sus cursos ya estan asignados
- **THEN** el sistema rechaza el canje, conserva la matricula y muestra un mensaje comprensible

### Requirement: Interfaz de invitaciones por rol
El sistema MUST ofrecer al administrador una interfaz para crear invitaciones y al alumno una interfaz para canjearlas.

#### Scenario: Administrador crea y comparte un codigo
- **WHEN** el administrador envia una invitacion valida desde su panel
- **THEN** el panel muestra el codigo y permite copiarlo

#### Scenario: Alumno confirma la matricula
- **WHEN** el alumno canjea un codigo desde la seccion Cursos
- **THEN** la interfaz informa los cursos agregados y actualiza la matricula visible en la sesion