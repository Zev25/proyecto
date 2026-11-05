import multer from 'multer';

const cargarExcelEvaluacion = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 4 },
  fileFilter: (_req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      return callback(new Error('Solo se admiten archivos .xlsx'));
    }
    return callback(null, true);
  }
}).single('archivo');

export { cargarExcelEvaluacion };