# Puesta en marcha

Guia para preparar una copia nueva del proyecto y trabajar en equipo.

## Obtener el proyecto

Clona el repositorio remoto que comparta el equipo y entra a la carpeta creada:

```bash
git clone URL_DEL_REPOSITORIO
cd NOMBRE_DEL_REPOSITORIO
```

No se deben compartir ni subir archivos `.env`, contrasenas, dumps con datos reales ni la carpeta `node_modules`.

## Requisitos

- Git.
- Node.js `20.19+` o `22.12+`.
- pnpm `10`.
- MySQL 8.0 o superior en ejecucion y acceso para crear una base de datos.

Comprueba las herramientas desde la raiz del repositorio:

```bash
node --version
pnpm --version
```

## Instalar dependencias

Ejecuta desde la raiz del repositorio. Los lockfiles se incluyen para instalar las versiones fijadas:

```bash
cd backend
pnpm install --frozen-lockfile
cp config/.env.example config/.env
cd ../frontend
pnpm install --frozen-lockfile
cd ..
```

No borres ni regeneres `pnpm-lock.yaml` durante una instalacion normal: `--frozen-lockfile` instala las versiones acordadas por el equipo y falla si el manifiesto no coincide con el lockfile.

Edita `backend/config/.env` con los datos de tu MySQL. Ese archivo es local y no se debe subir al repositorio.

## Preparar MySQL

Crea la base de datos que declaraste como `DB_NAME` en el archivo `.env` (el ejemplo usa `evaluaciones`):

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS evaluaciones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

El repositorio incluye el esquema SQL sin datos en [backend/db/schema.sql](backend/db/schema.sql). Importalo antes de iniciar la API:

```bash
mysql -u root -p evaluaciones < backend/db/schema.sql
```

Si usas otro nombre de base o usuario MySQL, reemplaza `evaluaciones` y `root`; el nombre debe coincidir con `DB_NAME` en `backend/config/.env`.

El script crea las tablas vacias y no contiene usuarios ni datos de produccion. Esta pensado para una base nueva. El backend tambien verifica/crea algunas columnas y tablas auxiliares al iniciar.

La estructura se comparte con el equipo mediante este archivo versionado en Git. Si se necesita regenerarlo desde una base de desarrollo, exporta solo la estructura (nunca uses un dump completo con datos):

```bash
mysqldump --no-data --default-character-set=utf8mb4 -u USUARIO_MYSQL -p evaluaciones > backend/db/schema.sql
```

Revisa el SQL antes de subirlo y confirma que no contenga `INSERT`, datos personales, contrasenas ni secretos.

## Iniciar la aplicacion

Abre dos terminales desde la raiz del repositorio.

Terminal 1, API:

```bash
cd backend
pnpm dev
```

Terminal 2, interfaz:

```bash
cd frontend
pnpm dev
```

Abre `http://localhost:5173`. La API escucha en `http://localhost:3000` por defecto. Para comprobar la compilacion de produccion del frontend:

```bash
cd frontend
pnpm build
```

## Flujo de trabajo Git

1. Sincroniza la rama principal antes de empezar (`git pull`).
2. Trabaja en una rama propia por tarea y evita editar directamente la rama principal.
3. Comparte codigo, documentacion, `package.json` y lockfiles; nunca agregues `.env`, contrasenas ni datos reales de MySQL.
4. Antes de abrir una solicitud de revision, ejecuta `pnpm build` en `frontend` y `node --check` en los archivos backend modificados.
5. Si cambias el esquema, actualiza `backend/db/schema.sql` y esta guia en el mismo cambio. No reemplaces el esquema compartido con un dump de una base local.

El archivo `.gitignore` excluye dependencias, compilados, secretos locales, logs y archivos subidos; conserva los ejemplos `.env.example`, lockfiles y documentacion.

## Parcial del proyecto — 22 de octubre de 2026

El parcial consiste en presentar partes del proyecto. Antes de la fecha:

- [ ] Decidir qué partes del proyecto se van a mostrar.
- [ ] Empezar a pulir esas partes una vez definida la selección.