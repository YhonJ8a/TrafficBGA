import "reflect-metadata";
import express from 'express';
import userRoutes from "./routes/routes.ts";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "./database/db.js";

AppDataSource.initialize()
  .then(() => { console.log("Conectado a PostgreSQL con TypeORM") })
  .catch((err) => { console.error("Error al conectar con la base de datos:", err) });

const app = express()

app.get("/", (req, res) => {
  res.json({ message: "Servidor backend en Vercel funcionando 🚀" });
});

app.get("/node", (req, res) => {
  res.json({ message: `Servidor backend en Vercel funcionando 🚀 ${process.env.NODE_ENV}` });
});

app.use('/api', userRoutes);

app.get('/db-status', async (req, res) => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.query('SELECT 1');
      res.json({ status: 'connected' });
    } else {
      res.status(500).json({ status: 'not connected' });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ status: 'error', error: error.message });
    } else {
      res.status(500).json({ status: 'error', error: 'Unknown error occurred' });
    }
  }
});

export default app
