import { AppDataSource } from "../db";
import { TipoReportes } from "../../entities/TipoReportes";

import { fileURLToPath } from "url";

export async function seedTiposReportes() {
    const tipoReportesRepository = AppDataSource.getRepository(TipoReportes);

    const tiposReportes = [
        {
            title: 'Fotomulta',
            iconName: 'Fotomulta',
            snippet: 'Hay una Fotomulta en la vía',
            size: 25,
            hideAfterZoom: 11,
            duracionMinutos: 1440, // 24 horas
        },
        {
            title: 'Tráfico',
            iconName: 'Trafico',
            snippet: 'Hay Tráfico en la vía',
            size: 30,
            hideAfterZoom: 12,
            duracionMinutos: 30,
        },
        {
            title: 'Choque',
            iconName: 'Choque',
            snippet: 'Hay un choque en la vía',
            size: 35,
            hideAfterZoom: 11,
            duracionMinutos: 120, // 2 horas
        },
        {
            title: 'Alerta',
            iconName: 'Alerta',
            snippet: 'Estar Alerta en la vía',
            size: 28,
            hideAfterZoom: 10,
            duracionMinutos: 60, // 1 hora
        },
        {
            title: 'Cierre de Vía',
            iconName: 'Cierre',
            snippet: 'Hay un cierre en la vía',
            size: 40,
            hideAfterZoom: 12,
            duracionMinutos: 720, // 12 horas
        },
        {
            title: 'Obra en Vía',
            iconName: 'Obra',
            snippet: 'Hay una Obra en la vía',
            size: 35,
            hideAfterZoom: 12,
            duracionMinutos: 10080, // 7 días
        },
        {
            title: 'Policía de Tránsito',
            iconName: 'Transito',
            snippet: 'Hay oficiales de tránsito en la vía',
            size: 30,
            hideAfterZoom: 11,
            duracionMinutos: 120, // 2 horas
        },
        // Adicionales
        {
            title: 'Bache',
            iconName: 'Bache',
            snippet: 'Hay un bache en la vía',
            size: 28,
            hideAfterZoom: 13,
            duracionMinutos: 43200, // 30 días
        },
        {
            title: 'Inundación',
            iconName: 'Inundacion',
            snippet: 'Hay inundación en la vía',
            size: 35,
            hideAfterZoom: 11,
            duracionMinutos: 360, // 6 horas
        },
        {
            title: 'Vehículo Averiado',
            iconName: 'Averia',
            snippet: 'Hay un vehículo averiado en la vía',
            size: 30,
            hideAfterZoom: 12,
            duracionMinutos: 60, // 1 hora
        },
        {
            title: 'Manifestación',
            iconName: 'Manifestacion',
            snippet: 'Hay una manifestación en la vía',
            size: 38,
            hideAfterZoom: 11,
            duracionMinutos: 240, // 4 horas
        },
        {
            title: 'Derrumbe',
            iconName: 'Derrumbe',
            snippet: 'Hay un derrumbe en la vía',
            size: 40,
            hideAfterZoom: 11,
            duracionMinutos: 1440, // 24 horas
        },
        {
            title: 'Retén Policial',
            iconName: 'Reten',
            snippet: 'Hay un retén policial en la vía',
            size: 32,
            hideAfterZoom: 11,
            duracionMinutos: 180, // 3 horas
        },
        {
            title: 'Semáforo Dañado',
            iconName: 'Semaforo',
            snippet: 'Hay un semáforo dañado',
            size: 26,
            hideAfterZoom: 12,
            duracionMinutos: 2880, // 48 horas
        },
        {
            title: 'Peligro',
            iconName: 'Peligro',
            snippet: 'Hay un peligro en la vía',
            size: 32,
            hideAfterZoom: 10,
            duracionMinutos: 60, // 1 hora
        },
        {
            title: 'Evento Especial',
            iconName: 'Evento',
            snippet: 'Hay un evento que afecta el tráfico',
            size: 35,
            hideAfterZoom: 11,
            duracionMinutos: 360, // 6 horas
        },
        {
            title: 'Baja Visibilidad',
            iconName: 'Neblina',
            snippet: 'Hay neblina o baja visibilidad',
            size: 30,
            hideAfterZoom: 11,
            duracionMinutos: 120, // 2 horas
        },
        {
            title: 'Vía Resbaladiza',
            iconName: 'Resbaladiza',
            snippet: 'La vía está resbaladiza',
            size: 28,
            hideAfterZoom: 12,
            duracionMinutos: 180, // 3 horas
        },
        {
            title: 'Congestión',
            iconName: 'Congestion',
            snippet: 'Hay congestión vehicular',
            size: 32,
            hideAfterZoom: 12,
            duracionMinutos: 45,
        },
        {
            title: 'Emergencia',
            iconName: 'Emergencia',
            snippet: 'Hay una emergencia en la vía',
            size: 36,
            hideAfterZoom: 10,
            duracionMinutos: 30,
        },
    ];

    console.log('🌱 Insertando tipos de reportes...');

    for (const tipoData of tiposReportes) {
        const tipo = tipoReportesRepository.create(tipoData);
        await tipoReportesRepository.save(tipo);
        console.log(`✅ Insertado: ${tipo.title}`);
    }

    console.log('✅ Seed completado!');
}


const nodePath = fileURLToPath(import.meta.url);
if (process.argv[1] === nodePath) {
    AppDataSource.initialize()
        .then(async () => {
            await seedTiposReportes();
            await AppDataSource.destroy();
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}