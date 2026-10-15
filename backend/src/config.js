import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: './config/.env' });

const servidor = express();
const router = express.Router();
const port = Number(process.env.PORT || 3000);

servidor.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
servidor.use(express.json());
servidor.use(router);

servidor.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

export { servidor, router };