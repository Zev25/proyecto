## Purpose

Definir la persistencia del catalogo de cursos, ofertas por turno, clases y matriculas, reemplazando los datos ficticios usados por las vistas de administracion y profesor.

## ADDED Requirements

### Requirement: Persistencia de cursos y ofertas
El sistema MUST almacenar los cursos academicos y sus ofertas/turnos en MySQL, incluyendo turno, horario, cupo maximo y estado activo. Una base nueva MUST iniciar sin ofertas ni matriculas de demostracion.

#### Scenario: Listado de ofertas persistidas
- **WHEN** un administrador o profesor consulta las ofertas
- **THEN** el sistema devuelve solo filas guardadas, sus clases y el conteo real de matriculas

#### Scenario: Catalogo vacio
- **WHEN** todavia no existen ofertas
- **THEN** las vistas muestran un estado vacio y permiten al administrador crear la primera oferta

### Requirement: Clases asociadas a una oferta
El sistema MUST persistir las clases incluidas en una oferta con materia, nombre/seccion, modalidad semanal o por entregas, horario opcional y codigo de curso legacy opcional.

#### Scenario: Crear oferta con clases
- **WHEN** un administrador crea una oferta con datos validos y al menos una clase
- **THEN** el sistema persiste curso, oferta y clases en una transaccion

#### Scenario: Rechazar clases invalidas
- **WHEN** una oferta no tiene clases, una clase tiene datos requeridos faltantes o el cupo/horario no es valido
- **THEN** el sistema rechaza toda la operacion sin dejar registros parciales

### Requirement: Matricula por oferta y capacidad
El sistema MUST relacionar cada alumno con una oferta mediante una matricula unica y MUST calcular el numero de inscritos desde las matriculas, no desde un valor enviado por el frontend.

#### Scenario: Matricula dentro del cupo
- **WHEN** un alumno activo se matricula en una oferta con capacidad disponible
- **THEN** el sistema registra una sola matricula para el alumno/oferta

#### Scenario: Oferta completa
- **WHEN** una matricula nueva supera el cupo maximo
- **THEN** el sistema rechaza la operacion sin crear matriculas parciales

### Requirement: Invitaciones de ofertas
El sistema MUST permitir que las nuevas invitaciones incluyan una o mas ofertas persistidas y que el canje aplique todas las matriculas atomica y unicamente si hay cupo disponible en cada oferta.

#### Scenario: Canje de invitacion con ofertas
- **WHEN** un alumno activo canjea una invitacion vigente con usos disponibles
- **THEN** el sistema agrega todas las ofertas nuevas incluidas, crea sus matriculas y actualiza compatibilidad de `UsuarioCurso` con los codigos legacy de las clases

#### Scenario: Mantener invitaciones existentes
- **WHEN** se canjea una invitacion creada antes de la migracion que solo tiene `cursos_json`
- **THEN** el sistema conserva el flujo actual basado en cursos y no falla por falta de IDs de oferta

### Requirement: Consumo del catalogo desde las vistas
Las vistas de administrador y profesor MUST consumir el catalogo desde la API y MUST dejar de leer el modulo estatico `courseOfferings.js`.

#### Scenario: Panel docente selecciona clase
- **WHEN** un profesor abre selectores de curso/clase
- **THEN** las opciones corresponden a ofertas y clases persistidas y conservan el codigo legacy requerido por tareas/evaluaciones actuales

#### Scenario: Panel administrador crea oferta
- **WHEN** el administrador guarda un curso/turno y sus clases
- **THEN** la fila aparece en el listado con horario, cupo y matriculas calculadas desde la base
