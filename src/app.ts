import express from 'express';
import userRoutes from "./routes/routes.ts";
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler.ts';
import { responseFormatter } from './middlewares/responseFormatter.ts';

const app = express()

app.use(cors({
    origin: `http://localhost:${process.env.PORT}/api`,
    credentials: true
}));

app.use(express.json())

app.use(responseFormatter);

app.use('/api', userRoutes);

app.use(errorHandler);

export default app