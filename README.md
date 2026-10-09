# Aula

Plataforma educativa en desarrollo con frontend Vue 3/Vite, API Node.js/Express y MySQL.

## Empezar

Sigue la [guía de puesta en marcha](pasos.md). Incluye requisitos, instalación, configuración local, preparación de MySQL y comandos para iniciar frontend y backend.

## Estructura

- `frontend/`: aplicación Vue 3, Quasar y Vite.
- `backend/`: API Express y controladores por dominio.
- `backend/db/schema.sql`: estructura de MySQL sin datos de usuarios.
- `openspec/specs/`: registro del avance, decisiones y pruebas pendientes.

## Colaboración

- No compartas `backend/config/.env`, contraseñas, códigos de invitación ni datos reales de la base.
- Conserva `pnpm-lock.yaml`; instala con `pnpm install --frozen-lockfile`.
- Para cambios de esquema, actualiza el SQL versionado y las instrucciones de puesta en marcha.
- Consulta `pasos.md` para el flujo Git y las validaciones antes de compartir cambios.
