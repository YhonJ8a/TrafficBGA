import { Server, Socket } from 'socket.io';
import { ReportesService } from '../services/ReportesService';

interface ClientLocation {
    socketId: string;
    latitude: number;
    longitude: number;
    radioKm: number;
}

export class SocketManager {
    private io: Server;
    private reportesService: ReportesService;
    private clientesConectados: Map<string, ClientLocation>;

    constructor(io: Server) {
        this.io = io;
        this.reportesService = new ReportesService();
        this.clientesConectados = new Map();
        this.inicializarEventos();
    }

    private inicializarEventos() {
        this.io.on('connection', (socket: Socket) => {
            console.log(`✅ Cliente conectado: ${socket.id}`);

            // Cliente envía su ubicación
            socket.on('actualizar-ubicacion', async (data: { latitude: number; longitude: number; radioKm?: number }) => {
                console.log(`📍 Ubicación actualizada para ${socket.id}:`, data);

                const radioKm = data.radioKm || 2; // Por defecto 2km

                this.clientesConectados.set(socket.id, {
                    socketId: socket.id,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    radioKm
                });

                // Enviar reportes activos iniciales en su área
                try {
                    const reportes = await this.reportesService.obtenerReportesPorRadio(
                        data.latitude,
                        data.longitude,
                        radioKm,
                        true // Solo activos
                    );

                    socket.emit('reportes-cercanos', {
                        reportes,
                        total: reportes.length,
                        ubicacion: { latitude: data.latitude, longitude: data.longitude },
                        radioKm
                    });
                } catch (error: any) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Cliente solicita reportes cercanos manualmente
            socket.on('solicitar-reportes', async (data: { latitude: number; longitude: number; radioKm?: number }) => {
                const radioKm = data.radioKm || 2;

                try {
                    const reportes = await this.reportesService.obtenerReportesPorRadio(
                        data.latitude,
                        data.longitude,
                        radioKm,
                        true
                    );

                    socket.emit('reportes-cercanos', {
                        reportes,
                        total: reportes.length,
                        ubicacion: { latitude: data.latitude, longitude: data.longitude },
                        radioKm
                    });
                } catch (error: any) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Cliente se desconecta
            socket.on('disconnect', () => {
                console.log(`❌ Cliente desconectado: ${socket.id}`);
                this.clientesConectados.delete(socket.id);
            });
        });
    }

    // Notificar nuevo reporte a clientes cercanos
    async notificarNuevoReporte(reporte: any) {
        console.log(`📢 Notificando nuevo reporte: ${reporte.id}`);

        for (const [socketId, cliente] of this.clientesConectados) {
            const distancia = this.calcularDistancia(
                cliente.latitude,
                cliente.longitude,
                Number(reporte.latitude),
                Number(reporte.longitude)
            );

            // Si el reporte está dentro del radio del cliente
            if (distancia <= cliente.radioKm) {
                this.io.to(socketId).emit('nuevo-reporte', {
                    reporte: {
                        ...reporte,
                        distanciaKm: distancia
                    },
                    mensaje: `Nuevo reporte a ${distancia.toFixed(2)}km de tu ubicación`
                });
            }
        }
    }

    async notificarActualizacionReporte(reporte: any) {
        console.log(`🔄 Notificando actualización de reporte: ${reporte.id}`);

        for (const [socketId, cliente] of this.clientesConectados) {
            const distancia = this.calcularDistancia(
                cliente.latitude,
                cliente.longitude,
                Number(reporte.latitude),
                Number(reporte.longitude)
            );

            if (distancia <= cliente.radioKm) {
                this.io.to(socketId).emit('reporte-actualizado', {
                    reporte: {
                        ...reporte,
                        distanciaKm: distancia
                    }
                });
            }
        }
    }

    // Notificar reporte eliminado/expirado
    notificarReportesExpirados(reportesIds: string[]) {
        console.log(`Notificando reportes expirados: ${reportesIds.length}`);
        this.io.emit('reportes-expirados', { reportesIds });
    }

    // Notificar eliminación de reporte
    notificarReporteEliminado(reporteId: string) {
        console.log(`🗑️ Notificando eliminación de reporte: ${reporteId}`);
        this.io.emit('reporte-eliminado', { reporteId });
    }

    // Calcular distancia entre dos puntos
    private calcularDistancia(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) *
            Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distancia = R * c;

        return Math.round(distancia * 100) / 100;
    }

    private toRadians(grados: number): number {
        return grados * (Math.PI / 180);
    }

    // Obtener estadísticas de conexiones
    getEstadisticas() {
        return {
            clientesConectados: this.clientesConectados.size,
            clientes: Array.from(this.clientesConectados.values())
        };
    }
}