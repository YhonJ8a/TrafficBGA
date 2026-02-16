import "reflect-metadata";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import cron from 'node-cron';
import dotenv from "dotenv";
import { AppDataSource } from "./database/db.js";
import { SocketManager } from "./sockets/SocketManager.js";
import { ReportesService } from './services/ReportesService';

dotenv.config();

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const socketManager = new SocketManager(io);

AppDataSource.initialize()
    .then(() => {
        console.log('Conexión a MySQL establecida correctamente');

        const PORT = process.env.PORT || 3030;
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server running on port http://localhost:${PORT}/api`);
        });

        const reportesService = new ReportesService();
        cron.schedule('*/1 * * * *', async () => {
            console.log('🔍 Verificando reportes expirados...');
            const expirados = await reportesService.marcarReportesExpirados();

            if (expirados && expirados.length > 0) {
                socketManager.notificarReportesExpirados(expirados);
            }
        });
    })
    .catch((error) => {
        console.error('❌ Error al conectar con la base de datos:', error);
    });

(global as any).socketManager = socketManager;

// (async () => {

//     AppDataSource.initialize()
//         .then(() => { console.log("Conectado a PostgreSQL con TypeORM") })
//         .catch((err) => { console.error("Error al conectar con la base de datos:", err) });
//     app.listen(PORT);
//     console.warn(`Server running on port http://localhost:${PORT}`);

// })();

export { io };

