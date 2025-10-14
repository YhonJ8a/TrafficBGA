import express from 'express';
import userRoutes from "./routes/routes.js";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "./database/db.js";

AppDataSource.initialize()
  .then(() => { console.log("Conectado a PostgreSQL con TypeORM") })
  .catch((err) => { console.error("Error al conectar con la base de datos:", err) });

const app = express()

app.use('/api', userRoutes);

export default app
