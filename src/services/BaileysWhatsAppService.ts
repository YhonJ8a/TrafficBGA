import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WAMessage,
    proto
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { GeminiService } from './GeminiService';
import { AppDataSource } from '../database/db';
import { Reportes } from '../entities/Reportes';
import { TipoReportes } from '../entities/TipoReportes';

export class BaileysWhatsAppService {
    public sock: any;
    private geminiService: GeminiService;
    private targetGroupId: string;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;

    constructor() {
        this.geminiService = new GeminiService();
        this.targetGroupId = process.env.WHATSAPP_GROUP_ID || '';
    }

    async connect() {
        try {
            console.log('🔄 Conectando a WhatsApp...');

            const { state, saveCreds } = await useMultiFileAuthState(
                process.env.WHATSAPP_SESSION_PATH || './baileys_auth'
            );

            this.sock = makeWASocket({
                auth: state,
                logger: pino({ level: 'warn' }), // Solo mostrar warnings y errores
                printQRInTerminal: false,

                // ⭐ Opciones importantes para evitar bloqueos
                browser: ['TrafficBGA', 'Chrome', '120.0.0'], // Simular navegador
                syncFullHistory: false, // No sincronizar todo el historial
                markOnlineOnConnect: false, // No marcar como online automáticamente

                // Timeouts más largos
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,

                // ⭐ NUEVO: Opciones de reconexión
                retryRequestDelayMs: 250,
                maxMsgRetryCount: 5,

                // ⭐ NUEVO: Opciones de mensaje
                getMessage: async (key) => {
                    return {
                        conversation: ''
                    }
                }
            });

            this.sock.ev.on('connection.update', async (update: any) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log('\n📱 ==========================================');
                    console.log('   ESCANEA ESTE CÓDIGO QR CON WHATSAPP');
                    console.log('==========================================\n');

                    qrcode.generate(qr, { small: true });

                    console.log('\n==========================================');
                    console.log('   1. Abre WhatsApp en tu teléfono');
                    console.log('   2. Ve a Configuración > Dispositivos vinculados');
                    console.log('   3. Toca en "Vincular un dispositivo"');
                    console.log('   4. Escanea el código QR de arriba');
                    console.log('==========================================\n');
                }

                if (connection === 'close') {
                    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    console.log('\n❌ Conexión cerrada');
                    console.log(`   Código de error: ${statusCode}`);
                    console.log(`   Motivo: ${this.getDisconnectReason(statusCode)}`);

                    // ⭐ NUEVO: Mostrar más info del error
                    if (lastDisconnect?.error) {
                        console.log(`   Detalles: ${lastDisconnect.error.message || 'Sin detalles'}`);
                    }

                    // ⭐ Manejo especial para error 405
                    if (statusCode === 405) {
                        console.log('\n⚠️  Error 405: Posibles causas:');
                        console.log('   1. WhatsApp detectó uso automatizado');
                        console.log('   2. Demasiados intentos de conexión');
                        console.log('   3. Sesión inválida\n');
                        console.log('💡 Soluciones:');
                        console.log('   1. Espera 5-10 minutos antes de reintentar');
                        console.log('   2. Elimina la carpeta baileys_auth');
                        console.log('   3. Usa un número de WhatsApp dedicado para el bot\n');

                        // No reintentar inmediatamente en error 405
                        this.reconnectAttempts = this.maxReconnectAttempts;
                        return;
                    }

                    if (statusCode === DisconnectReason.loggedOut) {
                        console.log('\n🚪 Sesión cerrada por el usuario');
                        console.log('   Elimina la carpeta baileys_auth y vuelve a ejecutar\n');
                        this.reconnectAttempts = this.maxReconnectAttempts;
                        return;
                    }

                    if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        const delay = Math.min(this.reconnectAttempts * 3000, 15000); // Más tiempo entre reintentos

                        console.log(`   Reintentando en ${delay / 1000} segundos... (${this.reconnectAttempts}/${this.maxReconnectAttempts})\n`);

                        setTimeout(() => this.connect(), delay);
                    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                        console.log('\n❌ Máximo de reintentos alcanzado');
                        console.log('   El bot de WhatsApp está deshabilitado temporalmente');
                        console.log('   El servidor seguirá funcionando normalmente\n');
                    }
                } else if (connection === 'connecting') {
                    console.log('🔄 Conectando a WhatsApp...');
                } else if (connection === 'open') {
                    console.log('✅ Conectado a WhatsApp correctamente\n');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    await this.displayGroupInfo();
                }
            });

            this.sock.ev.on('creds.update', saveCreds);
            this.sock.ev.on('messages.upsert', this.handleMessage.bind(this));

        } catch (error: any) {
            console.error('\n❌ Error crítico al iniciar WhatsApp Bot:', error.message);

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`   Reintentando en 5 segundos... (${this.reconnectAttempts}/${this.maxReconnectAttempts})\n`);
                setTimeout(() => this.connect(), 5000);
            }
        }
    }

    private getDisconnectReason(statusCode: number): string {
        const reasons: { [key: number]: string } = {
            [DisconnectReason.badSession]: 'Sesión inválida',
            [DisconnectReason.connectionClosed]: 'Conexión cerrada',
            [DisconnectReason.connectionLost]: 'Conexión perdida',
            [DisconnectReason.connectionReplaced]: 'Conexión reemplazada en otro dispositivo',
            [DisconnectReason.loggedOut]: 'Sesión cerrada manualmente',
            [DisconnectReason.restartRequired]: 'Reinicio requerido',
            [DisconnectReason.timedOut]: 'Tiempo de espera agotado',
            405: 'No autorizado - Posible bloqueo temporal',
            401: 'No autenticado',
            403: 'Prohibido',
            408: 'Timeout',
            411: 'Conflicto',
            428: 'Conexión obsoleta'
        };

        return reasons[statusCode] || `Código desconocido: ${statusCode}`;
    }

    private async displayGroupInfo() {
        try {
            const groups = await this.sock.groupFetchAllParticipating();

            console.log('\n📱 ==========================================');
            console.log('   GRUPOS DE WHATSAPP DISPONIBLES');
            console.log('==========================================\n');

            Object.values(groups).forEach((group: any, index: number) => {
                const isTarget = group.id === this.targetGroupId;
                const marker = isTarget ? '👉 [MONITOREANDO ESTE]' : `${index + 1}.`;

                console.log(`${marker} ${group.subject}`);
                console.log(`   ID: ${group.id}`);
                console.log(`   Participantes: ${group.participants.length}`);
                console.log('');
            });

            console.log('==========================================');
            console.log('💡 Copia el ID del grupo que quieres monitorear');
            console.log('   y agrégalo al .env como WHATSAPP_GROUP_ID');
            console.log('==========================================\n');

            if (!this.targetGroupId) {
                console.log('⚠️  RECORDATORIO: Agrega WHATSAPP_GROUP_ID al .env\n');
            } else {
                console.log(`✅ Monitoreando grupo: ${this.targetGroupId}\n`);
            }
        } catch (error) {
            console.error('Error obteniendo grupos:', error);
        }
    }

    private async handleMessage(m: any) {
        try {
            const message = m.messages[0];

            if (!message.message) return;

            const from = message.key.remoteJid;
            const isGroup = from.endsWith('@g.us');

            // Filtrar: solo procesar el grupo específico
            if (!isGroup || from !== this.targetGroupId) {
                return;
            }

            // Extraer texto del mensaje
            const text =
                message.message.conversation ||
                message.message.extendedTextMessage?.text ||
                message.message.imageMessage?.caption ||
                '';

            if (!text || text.trim().length < 10) {
                return; // Ignorar mensajes muy cortos
            }

            console.log('\n📩 ==========================================');
            console.log('   NUEVO MENSAJE EN GRUPO MONITOREADO');
            console.log('==========================================');
            console.log(`Mensaje: "${text.substring(0, 150)}${text.length > 150 ? '...' : ''}"`);
            console.log('');

            // Procesar con IA
            await this.processWithAI(text, message);

        } catch (error) {
            console.error('❌ Error procesando mensaje:', error);
        }
    }

    private async processWithAI(text: string, originalMessage: any) {
        try {
            console.log('🤖 Analizando con Gemini AI...');

            const extracted = await this.geminiService.extractTrafficReport(text);

            if (!extracted) {
                console.log('⚠️  No se detectó reporte válido o no hay ubicación clara');
                console.log('==========================================\n');
                return;
            }

            console.log('✅ REPORTE DETECTADO:');
            console.log(`   📌 Tipo: ${extracted.tipo}`);
            console.log(`   📍 Lugar: ${extracted.plaza}`);
            console.log(`   📝 Descripción: ${extracted.descripcion}`);
            console.log(`   🎯 Confianza: ${extracted.confianza}%`);

            if (extracted.coordenadas) {
                console.log(
                    `   🗺️  Coordenadas: ${extracted.coordenadas.latitude.toFixed(6)}, ${extracted.coordenadas.longitude.toFixed(6)}`
                );
            } else {
                console.log('   ⚠️  No se pudieron obtener coordenadas exactas');
            }

            // Guardar en base de datos
            await this.saveReport(extracted, text, originalMessage);

            console.log('💾 Reporte guardado en base de datos');
            console.log('==========================================\n');

        } catch (error) {
            console.error('❌ Error procesando con IA:', error);
            console.log('==========================================\n');
        }
    }

    private async saveReport(
        extracted: any,
        originalText: string,
        message: any
    ) {
        try {
            const reportesRepo = AppDataSource.getRepository(Reportes);
            const tiposRepo = AppDataSource.getRepository(TipoReportes);

            // Normalizar tipo
            const tipoNormalizado = this.geminiService.normalizeTipoIncidente(
                extracted.tipo
            );

            // Buscar tipo de reporte en BD
            let tipoReporte = await tiposRepo.findOne({
                where: { title: tipoNormalizado }
            });

            // Si no existe, usar uno por defecto
            if (!tipoReporte) {
                console.log(`   ℹ️  Tipo "${tipoNormalizado}" no encontrado en BD, usando "Alerta"`);
                tipoReporte = await tiposRepo.findOne({
                    where: { title: 'Alerta' }
                });
            }

            // Usar coordenadas del centro de Bucaramanga si no hay
            const defaultLat = 7.1193;
            const defaultLng = -73.1227;

            // Crear reporte
            const reporte = reportesRepo.create({
                title: `${extracted.tipo} - ${extracted.plaza}`,
                description: `${extracted.descripcion}\n\nMensaje original: "${originalText.substring(0, 200)}${originalText.length > 200 ? '...' : ''}"`,
                latitude: extracted.coordenadas?.latitude || defaultLat,
                longitude: extracted.coordenadas?.longitude || defaultLng,
                tipoReporte: tipoReporte || undefined,
                tipoReporte_id: tipoReporte?.id || null,
                usuarioReportador: 'WhatsApp Bot',
                estado: 'verificado',
                fechaReporte: new Date(),
                horaReporte: new Date(),
                visible: true
            });

            await reportesRepo.save(reporte);

            // Notificar vía Socket.IO (si está disponible)
            this.notifyNewReport(reporte);

        } catch (error) {
            console.error('❌ Error guardando reporte:', error);
            throw error;
        }
    }

    private notifyNewReport(reporte: any) {
        try {
            const socketManager = (global as any).socketManager;
            if (socketManager) {
                socketManager.notificarNuevoReporte(reporte);
                console.log('   📡 Notificación enviada vía Socket.IO');
            }
        } catch (error) {
            // Silenciar error si Socket.IO no está disponible
        }
    }

    getConnectionStatus(): boolean {
        return this.isConnected;
    }

    disconnect() {
        if (this.sock) {
            this.sock.end();
            this.isConnected = false;
            console.log('👋 Desconectado de WhatsApp');
        }
    }
}