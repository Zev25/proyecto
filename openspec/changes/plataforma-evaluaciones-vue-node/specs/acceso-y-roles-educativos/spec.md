## Purpose

Definir un acceso seguro y diferenciado para profesor y alumno, asegurando que cada rol vea y ejecute solo las funciones autorizadas en la plataforma educativa.

## ADDED Requirements

### Requirement: Autenticacion diferenciada por rol
El sistema MUST autenticar usuarios con credenciales validas y MUST asociar cada sesion a un rol explicito de profesor o alumno.

#### Scenario: Inicio de sesion exitoso para profesor
- **WHEN** un usuario profesor ingresa credenciales validas
- **THEN** el sistema inicia sesion y habilita acceso a funciones docentes

#### Scenario: Inicio de sesion exitoso para alumno
- **WHEN** un usuario alumno ingresa credenciales validas
- **THEN** el sistema inicia sesion y habilita acceso a funciones de alumno

### Requirement: Autorizacion por permisos de rol
El sistema SHALL restringir el acceso a vistas y operaciones segun el rol autenticado del usuario.

#### Scenario: Alumno intenta acceder a gestion docente
- **WHEN** un alumno autenticado solicita una ruta de administracion docente
- **THEN** el sistema deniega el acceso y registra el intento no autorizado

#### Scenario: Profesor accede a gestion de evaluaciones
- **WHEN** un profesor autenticado accede al modulo de evaluaciones
- **THEN** el sistema permite el acceso a operaciones de creacion y revision
