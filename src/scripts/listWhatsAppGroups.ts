// import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
// import { DisconnectReason, Boom } from 'baileys';
// import pino from 'pino';
// import QRCode from 'qrcode';

// async function listGroups() {
//     const { state, saveCreds } = await useMultiFileAuthState('./baileys_auth');

//     const sock = makeWASocket({
//         auth: state,
//         logger: pino({ level: 'silent' })
//     });

//     sock.ev.on('connection.update', async (update: any) => {

//         const { connection, lastDisconnect, qr } = update

//         if (qr) {
//             console.log('\n📱 Escanea este QR:\n');
//             console.log(await QRCode.toString(qr, { type: 'terminal' }))
//             // qrcode.generate(qr, { small: true });
//             console.log('');
//         }

//         if (connection === 'open') {
//             console.log('\n✅ Conectado a WhatsApp\n');

//             try {
//                 const groups = await sock.groupFetchAllParticipating();

//                 console.log('📱 GRUPOS DISPONIBLES:\n');

//                 Object.values(groups).forEach((group: any, index: number) => {
//                     console.log(`${index + 1}. ${group.subject}`);
//                     console.log(`   ID: ${group.id}`);
//                     console.log(`   Participantes: ${group.participants.length}`);
//                     console.log('');
//                 });

//                 console.log('\n💡 Copia el ID y agrégalo al .env\n');
//                 sock.end();
//                 process.exit(0);

//             } catch (error) {
//                 console.error('❌ Error:', error);
//                 process.exit(1);
//             }
//         } else if (connection === 'close' && (lastDisconnect?.error as Boom)?.output?.statusCode === DisconnectReason.restartRequired) {
//             console.log('✅ Reiniciando sesión...\n');
//             sock.end();
//             process.exit(0);
//         } else if (connection == "connecting" || !!qr) {
//             const code = await sock.requestPairingCode('3203823364');
//             console.log(code);
//         }
//     });

//     sock.ev.on('creds.update', saveCreds);
// }

// listGroups();