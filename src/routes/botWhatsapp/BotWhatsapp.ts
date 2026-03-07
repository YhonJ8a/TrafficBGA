import { Router } from 'express';

const router = Router();

router.get('/status', (req, res) => {
    const whatsappBot = (global as any).whatsappBot;

    res.success({
        whatsapp: {
            connected: whatsappBot?.getConnectionStatus() || false,
            channelId: process.env.WHATSAPP_CHANNEL_ID || 'not configured',
            groupId: process.env.WHATSAPP_GROUP_ID || 'not configured',
            service: 'whatsapp-web.js'
        }
    });
});

// ⭐ NUEVO: Forzar verificación de canales
router.post('/check-channels', async (req, res) => {
    try {
        const whatsappBot = (global as any).whatsappBot;

        if (!whatsappBot || !whatsappBot.getConnectionStatus()) {
            return res.error('Bot de WhatsApp no conectado', 503);
        }

        await whatsappBot.forceChannelCheck();

        res.success({
            message: 'Verificación de canales iniciada',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        res.error(error.message, 500);
    }
});

// Listar canales
router.get('/channels', async (req, res) => {
    try {
        const whatsappBot = (global as any).whatsappBot;

        if (!whatsappBot || !whatsappBot.getConnectionStatus()) {
            return res.error('Bot de WhatsApp no conectado', 503);
        }

        const channels = await whatsappBot.getChannels();

        res.success({
            channels: channels.map((c: any) => ({
                id: c.id._serialized,
                name: c.name,
                isMonitored: c.id._serialized === process.env.WHATSAPP_CHANNEL_ID
            })),
            total: channels.length
        });

    } catch (error: any) {
        res.error(error.message, 500);
    }
});

// Listar grupos
router.get('/groups', async (req, res) => {
    try {
        const whatsappBot = (global as any).whatsappBot;

        if (!whatsappBot || !whatsappBot.getConnectionStatus()) {
            return res.error('Bot de WhatsApp no conectado', 503);
        }

        const groups = await whatsappBot.getGroups();

        res.success({
            groups: groups.map((g: any) => ({
                id: g.id._serialized,
                name: g.name,
                isMonitored: g.id._serialized === process.env.WHATSAPP_GROUP_ID
            })),
            total: groups.length
        });

    } catch (error: any) {
        res.error(error.message, 500);
    }
});

router.get('/prueba', async (req, res) => {
    try {
        const whatsappBot = (global as any).whatsappBot;

        if (!whatsappBot) {
            return res.error('Bot de WhatsApp no inicializado', 503);
        }

        if (!whatsappBot.getConnectionStatus()) {
            return res.error('Bot de WhatsApp no conectado', 503);
        }

        console.log('\n🧪 Iniciando prueba desde API...\n');

        const result = await whatsappBot.testChannelLastMessage();

        if (result.success) {
            res.success({
                message: 'Prueba completada',
                ...result
            });
        } else {
            res.error(result.error, 400);
        }

    } catch (error: any) {
        console.error('Error en /prueba:', error);
        res.error(error.message, 500);
    }
});

router.get('/mensajes', async (req, res) => {
    try {
        const whatsappBot = (global as any).whatsappBot;

        if (!whatsappBot || !whatsappBot.getConnectionStatus()) {
            return res.error('Bot de WhatsApp no conectado', 503);
        }

        const limit = parseInt(req.query.limit as string) || 10;

        if (limit < 1 || limit > 50) {
            return res.error('El límite debe estar entre 1 y 50', 400);
        }

        const result = await whatsappBot.getChannelMessages(limit);

        if (result.success) {
            res.success(result);
        } else {
            res.error(result.error, 400);
        }

    } catch (error: any) {
        res.error(error.message, 500);
    }
});

export default router;