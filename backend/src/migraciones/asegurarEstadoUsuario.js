import { conexion } from '../db.js';

const asegurarEstadoUsuario = async () => {
  try {
    const [columnasEstado] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Usuario'
         AND COLUMN_NAME = 'estado'`
    );

    if (Number(columnasEstado?.[0]?.total || 0) === 0) {
      await conexion.query(
        "ALTER TABLE Usuario ADD COLUMN estado ENUM('activo','inactivo','bloqueado') NOT NULL DEFAULT 'activo'"
      );
    }

    const [[maxPreguntasColumn]] = await conexion.query(
      `SELECT COLUMN_DEFAULT AS valor
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Evaluacion'
         AND COLUMN_NAME = 'max_preguntas'
       LIMIT 1`
    );

    if (Number(maxPreguntasColumn?.valor || 0) !== 50) {
      await conexion.query('ALTER TABLE Evaluacion ALTER COLUMN max_preguntas SET DEFAULT 50');
    }

    const [columnaPreguntasIntento] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Evaluacion'
         AND COLUMN_NAME = 'preguntas_por_intento'`
    );

    if (Number(columnaPreguntasIntento?.[0]?.total || 0) === 0) {
      await conexion.query(
        'ALTER TABLE Evaluacion ADD COLUMN preguntas_por_intento INT NOT NULL DEFAULT 20 AFTER max_preguntas'
      );
    }

    const [columnaFechaFinEvaluacion] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Evaluacion'
         AND COLUMN_NAME = 'fecha_fin'`
    );

    if (Number(columnaFechaFinEvaluacion?.[0]?.total || 0) === 0) {
      await conexion.query('ALTER TABLE Evaluacion ADD COLUMN fecha_fin DATE DEFAULT NULL AFTER preguntas_por_intento');
    }

    const [columnaCategoriaEvaluacion] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Evaluacion'
         AND COLUMN_NAME = 'categoria'`
    );

    if (Number(columnaCategoriaEvaluacion?.[0]?.total || 0) === 0) {
      await conexion.query("ALTER TABLE Evaluacion ADD COLUMN categoria ENUM('evaluacion', 'examen_final') NOT NULL DEFAULT 'evaluacion' AFTER fecha_fin");
    }

    const [columnaEvaluacionPublicada] = await conexion.query(
      `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Evaluacion' AND COLUMN_NAME = 'publicada'`
    );
    if (Number(columnaEvaluacionPublicada?.[0]?.total || 0) === 0) {
      await conexion.query('ALTER TABLE Evaluacion ADD COLUMN publicada TINYINT(1) NOT NULL DEFAULT 0');
      await conexion.query('UPDATE Evaluacion SET publicada = 1');
    }

    const [columnaTareaPublicada] = await conexion.query(
      `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Tarea' AND COLUMN_NAME = 'publicada'`
    );
    if (Number(columnaTareaPublicada?.[0]?.total || 0) === 0) {
      await conexion.query('ALTER TABLE Tarea ADD COLUMN publicada TINYINT(1) NOT NULL DEFAULT 0');
      await conexion.query('UPDATE Tarea SET publicada = 1');
    }

    const [columnasEmail] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Usuario'
         AND COLUMN_NAME = 'email'`
    );

    if (Number(columnasEmail?.[0]?.total || 0) === 0) {
      await conexion.query('ALTER TABLE Usuario ADD COLUMN email VARCHAR(191) NULL');
    }

    const [indiceEmail] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Usuario'
         AND INDEX_NAME = 'uq_usuario_email'`
    );

    if (Number(indiceEmail?.[0]?.total || 0) === 0) {
      await conexion.query('CREATE UNIQUE INDEX uq_usuario_email ON Usuario (email)');
    }

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS UsuarioCurso (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        curso VARCHAR(100) NOT NULL,
        UNIQUE KEY uq_usuario_curso (usuario_id, curso),
        INDEX idx_usuariocurso_curso (curso),
        CONSTRAINT fk_usuariocurso_usuario FOREIGN KEY (usuario_id) REFERENCES Usuario(id) ON DELETE CASCADE
      )`
    );

    await conexion.query(
      `INSERT IGNORE INTO UsuarioCurso (usuario_id, curso)
       SELECT id, curso
       FROM Usuario
       WHERE tipo = 'alumno' AND curso IS NOT NULL AND TRIM(curso) <> ''`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS Curso (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_curso_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS OfertaCurso (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        curso_id INT NOT NULL,
        turno VARCHAR(30) NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        cupo_maximo INT NOT NULL,
        activa TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_oferta_curso_turno (curso_id, turno),
        KEY idx_oferta_curso_activa (activa),
        CONSTRAINT fk_oferta_curso FOREIGN KEY (curso_id) REFERENCES Curso(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS Clase (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        oferta_id INT NOT NULL,
        materia VARCHAR(100) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        modalidad ENUM('semanal', 'entregas') NOT NULL DEFAULT 'semanal',
        horario VARCHAR(150) DEFAULT NULL,
        codigo_legacy VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_clase_oferta_nombre (oferta_id, nombre),
        KEY idx_clase_codigo_legacy (codigo_legacy),
        CONSTRAINT fk_clase_oferta FOREIGN KEY (oferta_id) REFERENCES OfertaCurso(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS ClaseProfesor (
        clase_id INT NOT NULL PRIMARY KEY,
        profesor_id INT NOT NULL,
        assigned_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_claseprofesor_profesor (profesor_id),
        CONSTRAINT fk_claseprofesor_clase FOREIGN KEY (clase_id) REFERENCES Clase(id) ON DELETE CASCADE,
        CONSTRAINT fk_claseprofesor_profesor FOREIGN KEY (profesor_id) REFERENCES Usuario(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS MatriculaOferta (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        oferta_id INT NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_matricula_usuario_oferta (usuario_id, oferta_id),
        KEY idx_matricula_oferta (oferta_id),
        CONSTRAINT fk_matricula_usuario FOREIGN KEY (usuario_id) REFERENCES Usuario(id) ON DELETE CASCADE,
        CONSTRAINT fk_matricula_oferta FOREIGN KEY (oferta_id) REFERENCES OfertaCurso(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    const [columnasAlumnoIntento] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Intento'
         AND COLUMN_NAME = 'alumno_id'`
    );

    if (Number(columnasAlumnoIntento?.[0]?.total || 0) === 0) {
      await conexion.query('ALTER TABLE Intento ADD COLUMN alumno_id INT NULL AFTER evaluacion_id');
    }

    await conexion.query(
      `UPDATE Intento i
       JOIN Usuario u ON u.usuario = i.alumno_usuario AND u.tipo = 'alumno'
       SET i.alumno_id = u.id
       WHERE i.alumno_id IS NULL`
    );

    const [fkIntentoAlumno] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Intento'
         AND CONSTRAINT_NAME = 'fk_intento_alumno_id'`
    );

    if (Number(fkIntentoAlumno?.[0]?.total || 0) === 0) {
      await conexion.query(
        `ALTER TABLE Intento
         ADD CONSTRAINT fk_intento_alumno_id
         FOREIGN KEY (alumno_id) REFERENCES Usuario(id) ON DELETE SET NULL`
      );
    }

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS IntentoPregunta (
        intento_id INT NOT NULL,
        pregunta_id INT NOT NULL,
        orden SMALLINT UNSIGNED NOT NULL,
        PRIMARY KEY (intento_id, pregunta_id),
        UNIQUE KEY uq_intento_pregunta_orden (intento_id, orden),
        CONSTRAINT fk_intentopregunta_intento FOREIGN KEY (intento_id) REFERENCES Intento(id) ON DELETE CASCADE,
        CONSTRAINT fk_intentopregunta_pregunta FOREIGN KEY (pregunta_id) REFERENCES Pregunta(id) ON DELETE CASCADE
      )`
    );

    await conexion.query(
      `INSERT IGNORE INTO IntentoPregunta (intento_id, pregunta_id, orden)
       SELECT r.intento_id, r.pregunta_id,
              ROW_NUMBER() OVER (PARTITION BY r.intento_id ORDER BY r.id)
       FROM Respuesta r
       JOIN Intento i ON i.id = r.intento_id
       JOIN Pregunta p ON p.id = r.pregunta_id AND p.evaluacion_id = i.evaluacion_id`
    );

    const [columnaEstadoIntento] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Intento'
         AND COLUMN_NAME = 'estado'`
    );
    if (Number(columnaEstadoIntento?.[0]?.total || 0) === 0) {
      await conexion.query(
        "ALTER TABLE Intento ADD COLUMN estado ENUM('en_progreso', 'completado', 'cancelado') NOT NULL DEFAULT 'cancelado' AFTER nota_total"
      );
      await conexion.query(
        `UPDATE Intento i
         LEFT JOIN (
           SELECT intento_id, COUNT(*) AS total
           FROM IntentoPregunta
           GROUP BY intento_id
         ) ip ON ip.intento_id = i.id
         LEFT JOIN (
           SELECT intento_id, COUNT(*) AS total
           FROM Respuesta
           GROUP BY intento_id
         ) r ON r.intento_id = i.id
         SET i.estado = CASE
           WHEN COALESCE(ip.total, 0) > 0 AND r.total = ip.total THEN 'completado'
           ELSE 'cancelado'
         END`
      );
    }

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS InvitacionCurso (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo_hash CHAR(64) NOT NULL,
        codigo_ultimos4 VARCHAR(4) NOT NULL,
        cursos_json TEXT NOT NULL,
        creado_por VARCHAR(100) NULL,
        expira_en DATETIME NOT NULL,
        cupo_maximo INT NOT NULL DEFAULT 1,
        usos_actuales INT NOT NULL DEFAULT 0,
        activa TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_invitacion_codigo_hash (codigo_hash)
      )`
    );

    const [columnaOfertasInvitacion] = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'InvitacionCurso'
         AND COLUMN_NAME = 'oferta_ids_json'`
    );
    if (Number(columnaOfertasInvitacion?.[0]?.total || 0) === 0) {
      await conexion.query('ALTER TABLE InvitacionCurso ADD COLUMN oferta_ids_json TEXT NULL AFTER cursos_json');
    }

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS InvitacionCursoCanje (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invitacion_id INT NOT NULL,
        alumno_usuario VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_invitacion_alumno (invitacion_id, alumno_usuario),
        INDEX idx_canje_alumno (alumno_usuario),
        CONSTRAINT fk_canje_invitacion FOREIGN KEY (invitacion_id) REFERENCES InvitacionCurso(id) ON DELETE CASCADE
      )`
    );
  } catch (error) {
    console.error('No se pudo asegurar columna estado en Usuario:', error.message);
  }
};

export { asegurarEstadoUsuario };
