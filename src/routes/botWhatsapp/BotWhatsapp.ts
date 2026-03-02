import { Router } from 'express';

const router = Router();

router.get('/status', (req, res) => {
    const socketManager = (global as any).socketManager;
    const whatsappBot = (global as any).whatsappBot;

    res.success({
        whatsapp: {
            connected: whatsappBot?.getConnectionStatus() || false,
            groupId: process.env.WHATSAPP_GROUP_ID || 'not configured'
        },
        socketIO: {
            connected: socketManager?.io?.engine?.clientsCount || 0
        }
    });
});

export default router;
