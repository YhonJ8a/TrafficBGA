import express from 'express';
import userRoutes from "./routes/routes.js";
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


export default app
