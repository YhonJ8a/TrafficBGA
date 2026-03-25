import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { GeminiService } from './GeminiService';
import { AppDataSource } from '../database/db';
import { Reportes } from '../entities/Reportes';
import { TipoReportes } from '../entities/TipoReportes';

// Tipos
type Message = any;
type Chat = any;

export class WhatsAppWebService {
    private client: any;
    private geminiService: GeminiService;
    private targetChannelId: string;
    private targetGroupId: string;
    private isConnected: boolean = false;
    private channelCheckInterval: NodeJS.Timeout | null = null;
    private checkAttempts: number = 0;
    private maxCheckAttempts: number = 2; // Intentar 10 veces antes de espaciar más

    constructor() {
        this.geminiService = new GeminiService();
        this.targetChannelId = process.env.WHATSAPP_CHANNEL_ID || '';
        this.targetGroupId = process.env.WHATSAPP_GROUP_ID || '';

        // Configurar cliente con autenticación local
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: process.env.WHATSAPP_SESSION_PATH || './whatsapp_auth'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        this.setupEventListeners();
    }

    private setupEventListeners() {
        // QR Code para escanear
        this.client.on('qr', (qr: string) => {
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
        });

        // Cliente listo
        this.client.on('ready', async () => {
            console.log('✅ Cliente de WhatsApp listo!\n');
            this.isConnected = true;

            // Primera carga: mostrar info inmediata de grupos
            // await this.displayInitialChatsInfo();

            // Iniciar monitoreo periódico de canales
            // this.startChannelMonitoring();
        });

        // Autenticación exitosa
        this.client.on('authenticated', () => {
            console.log('✅ Autenticación exitosa');
        });

        // Error de autenticación
        this.client.on('auth_failure', (msg: string) => {
            console.error('❌ Error de autenticación:', msg);
            console.log('\n💡 Solución: Elimina la carpeta whatsapp_auth y vuelve a intentar\n');
        });

        // Desconexión
        this.client.on('disconnected', (reason: string) => {
            console.log('❌ Cliente desconectado:', reason);
            this.isConnected = false;
            this.stopChannelMonitoring();
        });

        // Nuevos mensajes
        this.client.on('message', this.handleMessage.bind(this));

        // Estado de carga
        this.client.on('loading_screen', (percent: number, message: string) => {
            console.log(`⏳ Cargando: ${percent}% - ${message}`);
        });
    }

    async connect() {
        try {
            console.log('🔄 Iniciando cliente de WhatsApp Web...\n');
            await this.client.initialize();
        } catch (error: any) {
            console.error('❌ Error al inicializar WhatsApp Web:', error.message);
            throw error;
        }
    }

    // Método mejorado para detectar si es canal
    private isChannel(chat: Chat): boolean {
        return (
            chat.id._serialized.includes('@newsletter') ||
            chat.isChannel === true ||
            chat.type === 'newsletter' ||
            (!chat.participants && chat.isGroup) ||
            chat.isNewsletter === true
        );
    }

    // ⭐ MEJORADO: Obtener canales desde múltiples fuentes del Store
    private async getChannelsFromStore(): Promise<any[]> {
        try {
            if (!this.client.pupPage) {
                return [];
            }

            const channels = await this.client.pupPage.evaluate(() => {
                try {
                    const win = window as any;
                    const results: any[] = [];

                    // Método 1: Store.Newsletter
                    if (win.Store?.Newsletter) {
                        try {
                            if (typeof win.Store.Newsletter.getAll === 'function') {
                                const newsletters = win.Store.Newsletter.getAll();
                                if (newsletters && newsletters.length > 0) {
                                    newsletters.forEach((n: any) => {
                                        results.push({
                                            id: n.id?._serialized || n.id,
                                            name: n.name || n.subject || 'Sin nombre',
                                            description: n.description || '',
                                            source: 'Newsletter.getAll'
                                        });
                                    });
                                }
                            }
                        } catch (e) {
                            console.log('Newsletter.getAll falló');
                        }

                        try {
                            if (typeof win.Store.Newsletter.getSubscribed === 'function') {
                                const subscribed = win.Store.Newsletter.getSubscribed();
                                if (subscribed && subscribed.length > 0) {
                                    subscribed.forEach((n: any) => {
                                        const id = n.id?._serialized || n.id;
                                        if (!results.find(r => r.id === id)) {
                                            results.push({
                                                id,
                                                name: n.name || n.subject || 'Sin nombre',
                                                description: n.description || '',
                                                source: 'Newsletter.getSubscribed'
                                            });
                                        }
                                    });
                                }
                            }
                        } catch (e) {
                            console.log('Newsletter.getSubscribed falló');
                        }
                    }

                    // Método 2: Store.Chat
                    if (win.Store?.Chat) {
                        try {
                            const chats = win.Store.Chat.getModelsArray();
                            chats.forEach((c: any) => {
                                if (
                                    c.id?._serialized?.includes('@newsletter') ||
                                    c.isNewsletter === true ||
                                    c.type === 'newsletter'
                                ) {
                                    const id = c.id?._serialized || c.id;
                                    if (!results.find(r => r.id === id)) {
                                        results.push({
                                            id,
                                            name: c.name || c.contact?.name || c.formattedTitle || 'Sin nombre',
                                            description: c.description || '',
                                            source: 'Chat.filter'
                                        });
                                    }
                                }
                            });
                        } catch (e) {
                            console.log('Chat.filter falló');
                        }
                    }

                    // Método 3: Buscar en todas las propiedades de Store
                    if (win.Store) {
                        try {
                            Object.keys(win.Store).forEach((key) => {
                                const obj = win.Store[key];
                                if (obj && typeof obj === 'object') {
                                    if (typeof obj.getModelsArray === 'function') {
                                        try {
                                            const models = obj.getModelsArray();
                                            if (Array.isArray(models)) {
                                                models.forEach((m: any) => {
                                                    if (
                                                        m.id?._serialized?.includes('@newsletter') ||
                                                        m.isNewsletter === true
                                                    ) {
                                                        const id = m.id?._serialized || m.id;
                                                        if (!results.find(r => r.id === id)) {
                                                            results.push({
                                                                id,
                                                                name: m.name || m.subject || 'Sin nombre',
                                                                description: m.description || '',
                                                                source: `Store.${key}`
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        } catch (e) {
                                            // Ignorar errores de modelos específicos
                                        }
                                    }
                                }
                            });
                        } catch (e) {
                            console.log('Búsqueda en Store falló');
                        }
                    }

                    return results;
                } catch (err) {
                    return [];
                }
            });

            return channels || [];
        } catch (error) {
            return [];
        }
    }

    // ⭐ NUEVO: Mostrar info inicial
    private async displayInitialChatsInfo() {
        try {
            console.log('🔍 Cargando información inicial...\n');

            const chats = await this.client.getChats();
            const groups = chats.filter((chat: Chat) => chat.isGroup && !this.isChannel(chat));

            console.log('📱 ==========================================');
            console.log('   GRUPOS DE WHATSAPP');
            console.log('==========================================\n');

            if (groups.length > 0) {
                groups.forEach((group: Chat, index: number) => {
                    const isTarget = group.id._serialized === this.targetGroupId;
                    const marker = isTarget ? '👉 [MONITOREANDO]' : `${index + 1}.`;

                    console.log(`${marker} ${group.name}`);
                    console.log(`   ID: ${group.id._serialized}`);
                    console.log('');
                });

                if (this.targetGroupId) {
                    const targetGroup = groups.find((g: Chat) => g.id._serialized === this.targetGroupId);
                    if (targetGroup) {
                        console.log(`✅ Monitoreando GRUPO: "${targetGroup.name}"`);
                    } else {
                        console.log(`⚠️  El grupo configurado no se encontró`);
                    }
                }
            } else {
                console.log('⚠️  No se encontraron grupos');
            }

            console.log('\n==========================================');
            console.log('⏳ Los canales se sincronizarán gradualmente...');
            console.log('   Verificación automática cada 1 min (primeros 10 intentos)');
            console.log('   Luego cada 2 minutos');
            console.log('==========================================\n');

            if (this.targetChannelId) {
                console.log(`🎯 Esperando sincronización del canal: ${this.targetChannelId}\n`);
            }

        } catch (error) {
            console.error('Error en carga inicial:', error);
        }
    }

    // ⭐ MEJORADO: Iniciar monitoreo con intervalo adaptativo
    private startChannelMonitoring() {
        console.log('🔄 Iniciando monitoreo adaptativo de canales...\n');

        // Primera verificación después de 1 minuto
        setTimeout(() => {
            this.checkChannels();
        }, 60000);

        // Verificación adaptativa
        this.channelCheckInterval = setInterval(() => {
            this.checkChannels();
        }, 1 * 60 * 1000);
    }

    private stopChannelMonitoring() {
        if (this.channelCheckInterval) {
            clearInterval(this.channelCheckInterval);
            this.channelCheckInterval = null;
            console.log('⏸️  Monitoreo de canales detenido');
        }
    }

    private async checkChannels() {
        try {
            this.checkAttempts++;
            const timestamp = new Date().toLocaleTimeString('es-CO');
            console.log(`\n🔍 [${timestamp}] Consultando canales (intento #${this.checkAttempts})...`);

            // Método 1: getChats
            const chats = await this.client.getChats();
            const totalChats = chats.length;
            const channelsFromChats = chats.filter((chat: Chat) =>
                this.isChannel(chat) ||
                chat.isChannel ||
                chat.id._serialized.includes("@newsletter")
            );

            console.log(`   📊 Total de chats: ${totalChats}`);
            console.log(`   Método 1 (getChats): ${channelsFromChats.length} canales`);

            // Método 2: Store
            const channelsFromStore = await this.getChannelsFromStore();
            console.log(`   Método 2 (Store): ${channelsFromStore.length} canales`);

            // Combinar
            const allChannelsMap = new Map();

            channelsFromChats.forEach((channel: Chat) => {
                allChannelsMap.set(channel.id._serialized, {
                    id: channel.id._serialized,
                    name: channel.name,
                    source: 'getChats',
                    chat: channel
                });
            });

            channelsFromStore.forEach((channel: any) => {
                if (!allChannelsMap.has(channel.id)) {
                    allChannelsMap.set(channel.id, channel);
                }
            });

            const allChannels = Array.from(allChannelsMap.values());

            if (allChannels.length > 0) {
                console.log('\n📢 ==========================================');
                console.log('   ✅ CANALES ENCONTRADOS');
                console.log('==========================================\n');

                allChannels.forEach((channel: any, index: number) => {
                    const isTarget = channel.id === this.targetChannelId;
                    const marker = isTarget ? '👉 [MONITOREANDO]' : `${index + 1}.`;

                    console.log(`${marker} ${channel.name}`);
                    console.log(`   ID: ${channel.id}`);
                    console.log(`   Fuente: ${channel.source}`);
                    if (channel.description) {
                        console.log(`   Descripción: ${channel.description.substring(0, 50)}...`);
                    }
                    console.log('');
                });

                console.log('==========================================');
                console.log(`📊 Total: ${allChannels.length} canal(es)`);
                console.log('==========================================\n');

                if (this.targetChannelId) {
                    const targetChannel = allChannels.find((c: any) => c.id === this.targetChannelId);
                    if (targetChannel) {
                        console.log(`✅ ¡Canal objetivo encontrado!`);
                        console.log(`   Nombre: "${targetChannel.name}"`);
                        console.log(`   Fuente: ${targetChannel.source}`);
                        console.log(`   Monitoreo activo ✓\n`);
                    } else {
                        console.log(`⚠️  Canal configurado no encontrado en la lista`);
                        console.log(`   ID buscado: ${this.targetChannelId}\n`);
                    }
                } else {
                    console.log('💡 Tip: Agrega WHATSAPP_CHANNEL_ID al .env para monitorear\n');
                }

            } else {
                console.log(`⚠️  Aún no se encontraron canales (${this.checkAttempts}/${this.maxCheckAttempts} intentos rápidos)`);

                if (this.checkAttempts < this.maxCheckAttempts) {
                    console.log(`   ⏳ Siguiente verificación en 1 minuto...`);
                } else {
                    console.log(`   ⏳ Siguiente verificación en 2 minutos...`);
                    console.log(`   💡 Los canales pueden tardar 10-15 minutos en sincronizar`);
                }

                console.log(`   📱 Asegúrate de estar suscrito a canales en WhatsApp\n`);
            }

        } catch (error) {
            console.error('❌ Error consultando canales:', error);
        }
    }

    async forceChannelCheck() {
        console.log('\n🔄 Verificación manual forzada...');
        await this.checkChannels();
    }

    private async handleMessage(message: Message) {
        try {
            // Intentar obtener el chat con manejo de errores
            let chat: Chat;

            try {
                chat = await message.getChat();
            } catch (chatError: any) {
                // Si falla getChat, intentar obtener info básica del mensaje
                console.log(`⚠️  No se pudo cargar el chat completo: ${chatError.message}`);

                // Verificar si es del canal/grupo objetivo usando solo el ID del mensaje
                const messageFromId = message.from || message.id?.remote;

                if (!messageFromId) {
                    return; // No se puede identificar el origen
                }

                const isTargetChannel = this.targetChannelId && messageFromId === this.targetChannelId;
                const isTargetGroup = this.targetGroupId && messageFromId === this.targetGroupId;

                if (!isTargetChannel && !isTargetGroup) {
                    return; // No es del chat objetivo
                }

                // Procesar el mensaje sin info del chat
                const text = message.body?.trim() || '';

                if (!text || text.length < 10) {
                    return;
                }

                console.log('\n📩 ==========================================');
                console.log('   NUEVO MENSAJE (info del chat limitada)');
                console.log('==========================================');
                console.log(`From: ${messageFromId}`);
                console.log(`Mensaje: "${text.substring(0, 150)}${text.length > 150 ? '...' : ''}"`);
                console.log('');

                // Determinar si es canal por el ID
                const isChannel = messageFromId.includes('@newsletter');

                // Procesar con IA usando info limitada
                await this.processWithAILimited(text, message, isChannel, messageFromId);

                return;
            }

            // Flujo normal si getChat() funcionó
            const chatId = chat.id._serialized;

            const isTargetChannel = this.targetChannelId && chatId === this.targetChannelId;
            const isTargetGroup = this.targetGroupId && chatId === this.targetGroupId;

            if (!isTargetChannel && !isTargetGroup) {
                return;
            }

            const isChannel = this.isChannel(chat);
            const text = message.body?.trim() || '';

            if (!text || text.length < 10) {
                return;
            }

            if (!isChannel && message.fromMe) {
                return;
            }

            console.log('\n📩 ==========================================');
            console.log(`   NUEVO MENSAJE EN ${isChannel ? 'CANAL' : 'GRUPO'}`);
            console.log('==========================================');
            console.log(`Chat: ${chat.name || 'Sin nombre'}`);

            if (!isChannel && message.author) {
                console.log(`De: ${message.author}`);
            }

            console.log(`Mensaje: "${text.substring(0, 150)}${text.length > 150 ? '...' : ''}"`);
            console.log('');

            await this.processWithAI(text, message, isChannel, chat);

        } catch (error: any) {
            console.error('❌ Error procesando mensaje:', error.message);

            // Intentar procesar el mensaje básico si hay texto
            try {
                const text = message.body?.trim() || '';
                if (text && text.length >= 10) {
                    console.log('   ℹ️  Intentando procesar mensaje de forma básica...');

                    const messageFromId = message.from || message.id?.remote;
                    const isChannel = messageFromId?.includes('@newsletter') || false;

                    await this.processWithAILimited(text, message, isChannel, messageFromId || 'desconocido');
                }
            } catch (fallbackError) {
                console.error('   ❌ Procesamiento básico también falló');
            }
        }
    }


    private async processWithAILimited(
        text: string,
        message: Message,
        isChannel: boolean,
        chatId: string
    ) {
        try {
            console.log('🤖 Analizando con Gemini AI (modo limitado)...');

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

            // Guardar con info limitada
            await this.saveReportLimited(extracted, text, isChannel, chatId);

            console.log('💾 Reporte guardado en base de datos');
            console.log('==========================================\n');

        } catch (error) {
            console.error('❌ Error procesando con IA (modo limitado):', error);
            console.log('==========================================\n');
        }
    }

    private async saveReportLimited(
        extracted: any,
        originalText: string,
        isChannel: boolean,
        chatId: string
    ) {
        try {
            const reportesRepo = AppDataSource.getRepository(Reportes);
            const tiposRepo = AppDataSource.getRepository(TipoReportes);

            const tipoNormalizado = this.geminiService.normalizeTipoIncidente(extracted.tipo);
            let tipoReporte = await tiposRepo.findOne({ where: { title: tipoNormalizado } });

            if (!tipoReporte) {
                tipoReporte = await tiposRepo.findOne({ where: { title: 'Alerta' } });
            }

            const defaultLat = 7.1193;
            const defaultLng = -73.1227;

            const autor = isChannel ? `Canal: ${chatId}` : `Grupo: ${chatId}`;

            // const reporte = reportesRepo.create({
            //     title: `${extracted.tipo} - ${extracted.plaza}`,
            //     description: `${extracted.descripcion}\n\nFuente: ${isChannel ? 'Canal' : 'Grupo'} WhatsApp\nID: ${chatId}\nMensaje: "${originalText.substring(0, 200)}${originalText.length > 200 ? '...' : ''}"`,
            //     latitude: extracted.coordenadas?.latitude || defaultLat,
            //     longitude: extracted.coordenadas?.longitude || defaultLng,
            //     tipoReporte: tipoReporte || undefined,
            //     tipoReporte_id: tipoReporte?.id || null,
            //     usuarioReportador: autor,
            //     estado: 'verificado',
            //     fechaReporte: new Date(),
            //     horaReporte: new Date(),
            //     visible: true
            // });


            const newReporte = new Reportes();
            newReporte.title = `${extracted.tipo} - ${extracted.plaza}`;
            newReporte.description = extracted.descripcion;
            newReporte.latitude = extracted.coordenadas?.latitude || defaultLat;
            newReporte.longitude = extracted.coordenadas?.longitude || defaultLng;
            newReporte.tipoReporte = tipoReporte!;
            newReporte.tipoReporte_id = tipoReporte?.id;
            newReporte.fechaReporte = new Date();
            newReporte.horaReporte = new Date();

            console.log('New report: ', newReporte);

            await reportesRepo.save(newReporte);
            this.notifyNewReport(newReporte);

        } catch (error) {
            console.error('❌ Error guardando reporte (modo limitado):', error);
            throw error;
        }
    }

    private async processWithAI(
        text: string,
        message: Message,
        isChannel: boolean,
        chat?: Chat
    ) {
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

            await this.saveReport(extracted, text, message, isChannel, chat);

            console.log('💾 Reporte guardado en base de datos');
            console.log('==========================================\n');

            if (!isChannel && process.env.WHATSAPP_SEND_CONFIRMATIONS === 'true') {
                try {
                    await message.reply(`✅ Reporte registrado: ${extracted.tipo} en ${extracted.plaza}`);
                } catch (e) {
                    console.log('   ℹ️  No se pudo responder');
                }
            }

        } catch (error) {
            console.error('❌ Error procesando con IA:', error);
            console.log('==========================================\n');
        }
    }

    private async saveReport(
        extracted: any,
        originalText: string,
        message: Message,
        isChannel: boolean,
        chat?: Chat
    ) {
        try {
            const reportesRepo = AppDataSource.getRepository(Reportes);
            const tiposRepo = AppDataSource.getRepository(TipoReportes);

            const tipoNormalizado = this.geminiService.normalizeTipoIncidente(extracted.tipo);
            let tipoReporte = await tiposRepo.findOne({ where: { title: tipoNormalizado } });

            if (!tipoReporte) {
                tipoReporte = await tiposRepo.findOne({ where: { title: 'Alerta' } });
            }

            const defaultLat = 7.1193;
            const defaultLng = -73.1227;

            let autor = 'Desconocido';
            let chatName = 'Desconocido';

            if (chat) {
                chatName = chat.name || 'Sin nombre';

                if (isChannel) {
                    autor = `Canal: ${chatName}`;
                } else {
                    try {
                        const contact = await message.getContact();
                        autor = contact.pushname || contact.number || 'Desconocido';
                    } catch (e) {
                        autor = `Grupo: ${chatName}`;
                    }
                }
            } else {
                // Fallback si no hay chat
                const messageFromId = message.from || message.id?.remote || 'desconocido';
                autor = isChannel ? `Canal: ${messageFromId}` : `Grupo: ${messageFromId}`;
                chatName = messageFromId;
            }

            const reporte = reportesRepo.create({
                title: `${extracted.tipo} - ${extracted.plaza}`,
                description: `${extracted.descripcion}\n\nFuente: ${isChannel ? 'Canal' : 'Grupo'} WhatsApp\nReportado por: ${autor}\nMensaje: "${originalText.substring(0, 200)}${originalText.length > 200 ? '...' : ''}"`,
                latitude: extracted.coordenadas?.latitude || defaultLat,
                longitude: extracted.coordenadas?.longitude || defaultLng,
                tipoReporte: tipoReporte || undefined,
                tipoReporte_id: tipoReporte?.id || null,
                usuarioReportador: autor,
                estado: 'verificado',
                fechaReporte: new Date(),
                horaReporte: new Date(),
                visible: true
            });

            await reportesRepo.save(reporte);
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
                console.log('   📡 Notificación Socket.IO enviada');
            }
        } catch (error) { }
    }

    getConnectionStatus(): boolean {
        return this.isConnected;
    }

    async disconnect() {
        try {
            this.stopChannelMonitoring();
            await this.client.destroy();
            this.isConnected = false;
            console.log('👋 Desconectado');
        } catch (error) {
            console.error('Error desconectando:', error);
        }
    }

    async getChats() {
        return await this.client.getChats();
    }

    async getChannels() {
        const chats = await this.client.getChats();
        const channelsFromChats = chats.filter((chat: Chat) => this.isChannel(chat));
        const channelsFromStore = await this.getChannelsFromStore();

        const allChannelsMap = new Map();
        channelsFromChats.forEach((c: Chat) => allChannelsMap.set(c.id._serialized, c));
        channelsFromStore.forEach((c: any) => allChannelsMap.set(c.id, c));

        return Array.from(allChannelsMap.values());
    }

    async getGroups() {
        const chats = await this.client.getChats();
        return chats.filter((chat: Chat) => chat.isGroup && !this.isChannel(chat));
    }

    // ⭐ MEJORADO: Método de prueba - Obtener último mensaje del canal
    async testChannelLastMessage(): Promise<any> {
        try {
            if (!this.targetChannelId) {
                return {
                    success: false,
                    error: 'No hay canal configurado (WHATSAPP_CHANNEL_ID vacío)',
                    tip: 'Agrega WHATSAPP_CHANNEL_ID al .env'
                };
            }

            console.log('\n🧪 ==========================================');
            console.log('   PRUEBA: Obtener último mensaje del canal');
            console.log('==========================================');
            console.log(`Canal objetivo: ${this.targetChannelId}\n`);

            // Método 1: Intentar desde los chats ya cargados
            console.log('📋 Método 1: Buscando en chats cargados...');

            const chats = await this.client.getChats();
            let chat = chats.find((c: Chat) => c.id._serialized === this.targetChannelId);

            if (chat) {
                console.log(`✅ Canal encontrado en chats: ${chat.name || 'Sin nombre'}`);
            } else {
                console.log('⚠️  Canal no encontrado en chats cargados');

                // Método 2: Acceder directamente vía Puppeteer
                console.log('\n📋 Método 2: Accediendo vía Puppeteer...');

                try {
                    const channelData = await this.getChannelDataDirect(this.targetChannelId);

                    if (!channelData) {
                        return {
                            success: false,
                            error: 'No se pudo obtener datos del canal',
                            channelId: this.targetChannelId,
                            tip: 'El canal puede no estar sincronizado aún. Espera unos minutos y vuelve a intentar.'
                        };
                    }

                    console.log(`✅ Datos del canal obtenidos: ${channelData.name}`);

                    // Usar datos directos para procesar
                    return await this.processChannelMessagesDirect(channelData);

                } catch (error: any) {
                    console.log(`❌ Error en método directo: ${error.message}`);
                    return {
                        success: false,
                        error: 'No se pudo acceder al canal',
                        details: error.message,
                        channelId: this.targetChannelId
                    };
                }
            }

            // Si tenemos el chat, obtener mensajes
            let messages: Message[];

            try {
                console.log('\n📥 Obteniendo últimos mensajes...');
                messages = await chat.fetchMessages({ limit: 10 });
                console.log(`   Total de mensajes obtenidos: ${messages.length}`);
            } catch (error: any) {
                console.log(`❌ Error obteniendo mensajes: ${error.message}`);

                // Fallback: Intentar obtener mensajes directamente
                try {
                    const channelData = await this.getChannelDataDirect(this.targetChannelId);
                    if (channelData) {
                        return await this.processChannelMessagesDirect(channelData);
                    }
                } catch (fallbackError) {
                    console.log('❌ Fallback también falló');
                }

                return {
                    success: false,
                    error: 'No se pudieron obtener mensajes del canal',
                    details: error.message,
                    channelId: this.targetChannelId,
                    chatName: chat.name
                };
            }

            if (messages.length === 0) {
                console.log('\n⚠️  No hay mensajes en el canal');
                return {
                    success: false,
                    error: 'El canal no tiene mensajes',
                    channelId: this.targetChannelId,
                    chatName: chat.name
                };
            }

            // Procesar el último mensaje
            return await this.processLastMessage(messages[0], chat);

        } catch (error: any) {
            console.error('❌ Error en prueba:', error);
            return {
                success: false,
                error: 'Error general en la prueba',
                details: error.message
            };
        }
    }

    // ⭐ NUEVO: Obtener datos del canal directamente desde Puppeteer
    private async getChannelDataDirect(channelId: string): Promise<any> {
        try {
            if (!this.client.pupPage) {
                return null;
            }

            const channelData = await this.client.pupPage.evaluate((id: string) => {
                const win = window as any;

                try {
                    // Buscar el canal en diferentes ubicaciones
                    if (win.Store?.Chat) {
                        const chats = win.Store.Chat.getModelsArray();
                        const channel = chats.find((c: any) => c.id?._serialized === id);

                        if (channel) {
                            // Obtener mensajes del canal
                            const msgs = channel.msgs?._models || [];

                            return {
                                id: channel.id?._serialized,
                                name: channel.name || channel.contact?.name || 'Sin nombre',
                                messages: msgs.slice(0, 10).map((msg: any) => ({
                                    body: msg.body || '',
                                    timestamp: msg.t || Date.now() / 1000,
                                    type: msg.type || 'chat',
                                    hasMedia: msg.hasMedia || false
                                }))
                            };
                        }
                    }

                    return null;
                } catch (err) {
                    console.error('Error en evaluate:', err);
                    return null;
                }
            }, channelId);

            return channelData;
        } catch (error) {
            console.error('Error obteniendo datos directos:', error);
            return null;
        }
    }

    // ⭐ NUEVO: Procesar mensajes obtenidos directamente
    private async processChannelMessagesDirect(channelData: any): Promise<any> {
        try {
            if (!channelData.messages || channelData.messages.length === 0) {
                return {
                    success: false,
                    error: 'El canal no tiene mensajes',
                    channelId: channelData.id,
                    chatName: channelData.name
                };
            }

            const lastMessage = channelData.messages[0];
            const messageText = lastMessage.body?.trim() || '';

            console.log('\n📨 ==========================================');
            console.log('   ÚLTIMO MENSAJE DEL CANAL (método directo)');
            console.log('==========================================');
            console.log(`Canal: ${channelData.name}`);
            console.log(`Fecha: ${new Date(lastMessage.timestamp * 1000).toLocaleString('es-CO')}`);
            console.log(`Texto: "${messageText.substring(0, 200)}${messageText.length > 200 ? '...' : ''}"`);
            console.log(`Longitud: ${messageText.length} caracteres`);
            console.log('');

            if (!messageText || messageText.length < 10) {
                console.log('⚠️  Mensaje muy corto para procesar');
                return {
                    success: true,
                    channelId: channelData.id,
                    chatName: channelData.name,
                    lastMessage: {
                        text: messageText,
                        length: messageText.length,
                        timestamp: lastMessage.timestamp,
                        date: new Date(lastMessage.timestamp * 1000).toISOString()
                    },
                    canProcess: false,
                    reason: 'Mensaje muy corto'
                };
            }

            // Procesar con IA
            console.log('🤖 Procesando con Gemini AI...\n');

            let extracted;
            try {
                extracted = await this.geminiService.extractTrafficReport(messageText);
            } catch (error: any) {
                console.log(`❌ Error en Gemini AI: ${error.message}`);
                return {
                    success: false,
                    error: 'Error procesando con IA',
                    details: error.message,
                    channelId: channelData.id,
                    chatName: channelData.name
                };
            }

            if (!extracted) {
                console.log('⚠️  No se detectó reporte de tráfico válido');
                console.log('==========================================\n');

                return {
                    success: true,
                    channelId: channelData.id,
                    chatName: channelData.name,
                    lastMessage: {
                        text: messageText,
                        length: messageText.length,
                        timestamp: lastMessage.timestamp,
                        date: new Date(lastMessage.timestamp * 1000).toISOString()
                    },
                    canProcess: true,
                    aiResult: {
                        detected: false,
                        reason: 'No se detectó ubicación o tipo de incidente válido'
                    }
                };
            }

            // Reporte detectado
            console.log('✅ REPORTE DETECTADO:');
            console.log(`   📌 Tipo: ${extracted.tipo}`);
            console.log(`   📍 Lugar: ${extracted.plaza}`);
            console.log(`   📝 Descripción: ${extracted.descripcion}`);
            console.log(`   🎯 Confianza: ${extracted.confianza}%`);

            if (extracted.coordenadas) {
                console.log(`   🗺️  Coordenadas: ${extracted.coordenadas.latitude}, ${extracted.coordenadas.longitude}`);
            }

            console.log('\n💾 Guardando reporte de prueba...');

            // Guardar el reporte (modo limitado porque no tenemos objeto Message completo)
            let savedReport;
            try {
                await this.saveReportLimited(extracted, messageText, true, channelData.id);
                console.log('✅ Reporte guardado exitosamente');
                savedReport = true;
            } catch (error: any) {
                console.log(`❌ Error guardando reporte: ${error.message}`);
                savedReport = false;
            }

            console.log('==========================================\n');

            return {
                success: true,
                channelId: channelData.id,
                chatName: channelData.name,
                lastMessage: {
                    text: messageText,
                    length: messageText.length,
                    timestamp: lastMessage.timestamp,
                    date: new Date(lastMessage.timestamp * 1000).toISOString()
                },
                canProcess: true,
                aiResult: {
                    detected: true,
                    tipo: extracted.tipo,
                    plaza: extracted.plaza,
                    descripcion: extracted.descripcion,
                    confianza: extracted.confianza,
                    coordenadas: extracted.coordenadas || null
                },
                saved: savedReport
            };

        } catch (error: any) {
            console.error('Error procesando mensajes directos:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ⭐ NUEVO: Procesar último mensaje (cuando tenemos objeto Message completo)
    private async processLastMessage(lastMessage: Message, chat: Chat): Promise<any> {
        const messageText = lastMessage.body?.trim() || '';

        console.log('\n📨 ==========================================');
        console.log('   ÚLTIMO MENSAJE DEL CANAL');
        console.log('==========================================');
        console.log(`Canal: ${chat.name || 'Sin nombre'}`);
        console.log(`Fecha: ${lastMessage.timestamp ? new Date(lastMessage.timestamp * 1000).toLocaleString('es-CO') : 'Desconocida'}`);
        console.log(`Texto: "${messageText.substring(0, 200)}${messageText.length > 200 ? '...' : ''}"`);
        console.log(`Longitud: ${messageText.length} caracteres`);
        console.log('');

        if (!messageText || messageText.length < 10) {
            console.log('⚠️  Mensaje muy corto para procesar (mínimo 10 caracteres)');
            return {
                success: true,
                channelId: this.targetChannelId,
                chatName: chat.name,
                lastMessage: {
                    text: messageText,
                    length: messageText.length,
                    timestamp: lastMessage.timestamp,
                    date: lastMessage.timestamp ? new Date(lastMessage.timestamp * 1000).toISOString() : null
                },
                canProcess: false,
                reason: 'Mensaje muy corto'
            };
        }

        console.log('🤖 Procesando con Gemini AI...\n');

        let extracted;
        try {
            extracted = await this.geminiService.extractTrafficReport(messageText);
        } catch (error: any) {
            console.log(`❌ Error en Gemini AI: ${error.message}`);
            return {
                success: false,
                error: 'Error procesando con IA',
                details: error.message,
                channelId: this.targetChannelId,
                chatName: chat.name
            };
        }

        if (!extracted) {
            console.log('⚠️  No se detectó reporte de tráfico válido');
            console.log('==========================================\n');

            return {
                success: true,
                channelId: this.targetChannelId,
                chatName: chat.name,
                lastMessage: {
                    text: messageText,
                    length: messageText.length,
                    timestamp: lastMessage.timestamp,
                    date: lastMessage.timestamp ? new Date(lastMessage.timestamp * 1000).toISOString() : null
                },
                canProcess: true,
                aiResult: {
                    detected: false,
                    reason: 'No se detectó ubicación o tipo de incidente válido'
                }
            };
        }

        console.log('✅ REPORTE DETECTADO:');
        console.log(`   📌 Tipo: ${extracted.tipo}`);
        console.log(`   📍 Lugar: ${extracted.plaza}`);
        console.log(`   📝 Descripción: ${extracted.descripcion}`);
        console.log(`   🎯 Confianza: ${extracted.confianza}%`);

        if (extracted.coordenadas) {
            console.log(`   🗺️  Coordenadas: ${extracted.coordenadas.latitude}, ${extracted.coordenadas.longitude}`);
        }

        console.log('\n💾 Guardando reporte de prueba...');

        let savedReport;
        try {
            await this.saveReport(extracted, messageText, lastMessage, true, chat);
            console.log('✅ Reporte guardado exitosamente');
            savedReport = true;
        } catch (error: any) {
            console.log(`❌ Error guardando reporte: ${error.message}`);
            savedReport = false;
        }

        console.log('==========================================\n');

        return {
            success: true,
            channelId: this.targetChannelId,
            chatName: chat.name,
            lastMessage: {
                text: messageText,
                length: messageText.length,
                timestamp: lastMessage.timestamp,
                date: lastMessage.timestamp ? new Date(lastMessage.timestamp * 1000).toISOString() : null
            },
            canProcess: true,
            aiResult: {
                detected: true,
                tipo: extracted.tipo,
                plaza: extracted.plaza,
                descripcion: extracted.descripcion,
                confianza: extracted.confianza,
                coordenadas: extracted.coordenadas || null
            },
            saved: savedReport
        };
    }

    // ⭐ NUEVO: Obtener últimos N mensajes del canal (sin procesarlos)
    async getChannelMessages(limit: number = 10): Promise<any> {
        try {
            if (!this.targetChannelId) {
                return {
                    success: false,
                    error: 'No hay canal configurado'
                };
            }

            const chat = await this.client.getChatById(this.targetChannelId);
            const messages = await chat.fetchMessages({ limit });

            return {
                success: true,
                channelId: this.targetChannelId,
                chatName: chat.name,
                total: messages.length,
                messages: messages.map((msg: Message) => ({
                    text: msg.body?.substring(0, 200) || '',
                    timestamp: msg.timestamp,
                    date: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : null,
                    hasMedia: msg.hasMedia,
                    type: msg.type
                }))
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}