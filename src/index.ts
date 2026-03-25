import "reflect-metadata";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import cron from 'node-cron';
import cors from 'cors';
import dotenv from "dotenv";
import { AppDataSource } from "./database/db.js";
import { SocketManager } from "./sockets/SocketManager.js";
import { ReportesService } from './services/ReportesService';
import { WhatsAppWebService } from "./services/WhatsAppWebService.js";
import { recolectarTrafico } from "./database/seeds/recolectarTrafico";

dotenv.config();

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const socketManager = new SocketManager(io);

let whatsappBot: WhatsAppWebService;

AppDataSource.initialize()
    .then(async () => {
        console.log('Conexión a MySQL establecida correctamente');

        const PORT = process.env.PORT || 3030;
        httpServer.listen(PORT, () => {
            console.log(`Server running on port http://localhost:${PORT}/api`);
        });

        if (process.env.WHATSAPP_GROUP_ID) {
            console.log('\nIniciando WhatsApp Bot...');
            whatsappBot = new WhatsAppWebService();
            (global as any).whatsappBot = whatsappBot;
            await whatsappBot.connect();
        } else {
            console.log('\nWhatsApp Bot deshabilitado (falta WHATSAPP_GROUP_ID en .env)');
        }

        const reportesService = new ReportesService();
        cron.schedule('*/5 * * * *', async () => {
            console.log('Verificando reportes expirados...');
            const expirados = await reportesService.marcarReportesExpirados();
            if (expirados && expirados.length > 0) {
                socketManager.notificarReportesExpirados(expirados);
            }
        });
        cron.schedule("30 * * * *", async () => {
            console.log('Recolectando tráfico... a las ' + new Date().toLocaleString());
            recolectarTrafico();
        }, { timezone: "America/Bogota" });
    })
    .catch((error) => {
        console.error('Error al conectar con la base de datos:', error);
    });

(global as any).socketManager = socketManager;

process.on('SIGINT', () => {
    console.log('\nCerrando aplicación...');
    if (whatsappBot) {
        whatsappBot.disconnect();
    }
    process.exit(0);
});

// (async () => {

//     AppDataSource.initialize()
//         .then(() => { console.log("Conectado a PostgreSQL con TypeORM") })
//         .catch((err) => { console.error("Error al conectar con la base de datos:", err) });
//     app.listen(PORT);
//     console.warn(`Server running on port http://localhost:${PORT}`);

// })();

export { io };

