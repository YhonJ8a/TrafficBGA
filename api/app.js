import express from "express";
import serverless from "serverless-http";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Servidor backend en Vercel funcionando 🚀" });
});

app.get("/saludo", (req, res) => {
    res.json({ message: "Hola desde Express en Vercel" });
});

export const handler = serverless(app);
