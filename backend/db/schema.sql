-- Esquema de desarrollo de Aula.
-- Solo estructura: no incluye usuarios, contrasenas, cursos cargados ni otros datos.
-- Compatible con MySQL 8.0+ y ejecutable antes de iniciar el backend.

CREATE TABLE IF NOT EXISTS Usuario (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  curso VARCHAR(100) DEFAULT NULL,
  estado ENUM('activo', 'inactivo', 'bloqueado') NOT NULL DEFAULT 'activo',
  email VARCHAR(191) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_usuario (usuario),
  UNIQUE KEY uq_usuario_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS UsuarioCurso (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  curso VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_curso (usuario_id, curso),
  KEY idx_usuariocurso_curso (curso),
  CONSTRAINT fk_usuariocurso_usuario
    FOREIGN KEY (usuario_id) REFERENCES Usuario (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Curso (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_curso_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS OfertaCurso (
  id INT NOT NULL AUTO_INCREMENT,
  curso_id INT NOT NULL,
  turno VARCHAR(30) NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  cupo_maximo INT NOT NULL,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_oferta_curso_turno (curso_id, turno),
  KEY idx_oferta_curso_activa (activa),
  CONSTRAINT fk_oferta_curso FOREIGN KEY (curso_id) REFERENCES Curso(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Clase (
  id INT NOT NULL AUTO_INCREMENT,
  oferta_id INT NOT NULL,
  materia VARCHAR(100) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  modalidad ENUM('semanal', 'entregas') NOT NULL DEFAULT 'semanal',
  horario VARCHAR(150) DEFAULT NULL,
  codigo_legacy VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clase_oferta_nombre (oferta_id, nombre),
  KEY idx_clase_codigo_legacy (codigo_legacy),
  CONSTRAINT fk_clase_oferta FOREIGN KEY (oferta_id) REFERENCES OfertaCurso(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS MatriculaOferta (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  oferta_id INT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_matricula_usuario_oferta (usuario_id, oferta_id),
  KEY idx_matricula_oferta (oferta_id),
  CONSTRAINT fk_matricula_usuario FOREIGN KEY (usuario_id) REFERENCES Usuario(id) ON DELETE CASCADE,
  CONSTRAINT fk_matricula_oferta FOREIGN KEY (oferta_id) REFERENCES OfertaCurso(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Tarea (
  id INT NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT DEFAULT NULL,
  curso VARCHAR(100) NOT NULL,
  profesor_usuario VARCHAR(100) NOT NULL,
  fecha_vencimiento DATE DEFAULT NULL,
  creada_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Evaluacion (
  id INT NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(150) NOT NULL,
  curso VARCHAR(100) DEFAULT NULL,
  creado_por VARCHAR(80) NOT NULL,
  max_preguntas INT NOT NULL DEFAULT 50,
  preguntas_por_intento INT NOT NULL DEFAULT 20,
  fecha_fin DATE DEFAULT NULL,
  categoria ENUM('evaluacion', 'examen_final') NOT NULL DEFAULT 'evaluacion',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Pregunta (
  id INT NOT NULL AUTO_INCREMENT,
  evaluacion_id INT NOT NULL,
  enunciado TEXT NOT NULL,
  opciones TEXT DEFAULT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'multiple-choice',
  respuesta_correcta TEXT NOT NULL,
  puntos DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (id),
  KEY idx_pregunta_evaluacion (evaluacion_id),
  CONSTRAINT fk_pregunta_evaluacion
    FOREIGN KEY (evaluacion_id) REFERENCES Evaluacion (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Intento (
  id INT NOT NULL AUTO_INCREMENT,
  evaluacion_id INT NOT NULL,
  alumno_id INT DEFAULT NULL,
  alumno_usuario VARCHAR(80) NOT NULL,
  nota_total DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_intento_evaluacion (evaluacion_id),
  KEY idx_intento_alumno_id (alumno_id),
  CONSTRAINT fk_intento_evaluacion
    FOREIGN KEY (evaluacion_id) REFERENCES Evaluacion (id) ON DELETE CASCADE,
  CONSTRAINT fk_intento_alumno_id
    FOREIGN KEY (alumno_id) REFERENCES Usuario (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS IntentoPregunta (
  intento_id INT NOT NULL,
  pregunta_id INT NOT NULL,
  orden SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (intento_id, pregunta_id),
  UNIQUE KEY uq_intento_pregunta_orden (intento_id, orden),
  CONSTRAINT fk_intentopregunta_intento
    FOREIGN KEY (intento_id) REFERENCES Intento (id) ON DELETE CASCADE,
  CONSTRAINT fk_intentopregunta_pregunta
    FOREIGN KEY (pregunta_id) REFERENCES Pregunta (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Respuesta (
  id INT NOT NULL AUTO_INCREMENT,
  intento_id INT NOT NULL,
  pregunta_id INT NOT NULL,
  respuesta_alumno TEXT NOT NULL,
  es_correcta TINYINT(1) NOT NULL DEFAULT 0,
  puntos_obtenidos DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_respuesta_intento (intento_id),
  KEY idx_respuesta_pregunta (pregunta_id),
  CONSTRAINT fk_respuesta_intento
    FOREIGN KEY (intento_id) REFERENCES Intento (id) ON DELETE CASCADE,
  CONSTRAINT fk_respuesta_pregunta
    FOREIGN KEY (pregunta_id) REFERENCES Pregunta (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS InvitacionCurso (
  id INT NOT NULL AUTO_INCREMENT,
  codigo_hash CHAR(64) NOT NULL,
  codigo_ultimos4 VARCHAR(4) NOT NULL,
  cursos_json TEXT NOT NULL,
  oferta_ids_json TEXT DEFAULT NULL,
  creado_por VARCHAR(100) DEFAULT NULL,
  expira_en DATETIME NOT NULL,
  cupo_maximo INT NOT NULL DEFAULT 1,
  usos_actuales INT NOT NULL DEFAULT 0,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invitacion_codigo_hash (codigo_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS InvitacionCursoCanje (
  id INT NOT NULL AUTO_INCREMENT,
  invitacion_id INT NOT NULL,
  alumno_usuario VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invitacion_alumno (invitacion_id, alumno_usuario),
  KEY idx_canje_alumno (alumno_usuario),
  CONSTRAINT fk_canje_invitacion
    FOREIGN KEY (invitacion_id) REFERENCES InvitacionCurso (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
