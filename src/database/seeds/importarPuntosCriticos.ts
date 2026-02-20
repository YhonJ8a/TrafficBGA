import axios from 'axios';
import { AppDataSource } from "../db";
import { PuntosCriticos } from "../../entities/PuntosCriticos";

interface DatosGovCo {
    id_mt?: string;
    entidad?: string;
    gizscore?: string; // Score/puntaje de peligrosidad
    fallecidos?: string;
    gipvalue?: string;
    tramo?: string;
    nombre?: string; // Nombre del sector
    latitud?: string;
    longitud?: string;
    pr?: string;
    municipio?: string;
    departamento?: string;
    divipola?: string;
    heridos?: string; // Por si existe
}

export async function importarPuntosCriticos() {
    console.log('🌐 Conectando a datos.gov.co...');

    try {
        // Obtener datos de la API - ordenar por gizscore (puntaje) en lugar de numero_de_siniestros
        const response = await axios.get<DatosGovCo[]>(
            'https://www.datos.gov.co/resource/rs3u-8r4q.json'
        );

        console.log(`📊 Datos obtenidos: ${response.data.length} registros`);

        // Mostrar un ejemplo de los datos para verificar
        if (response.data.length > 0) {
            console.log('\n📋 Ejemplo de registro:');
            console.log(JSON.stringify(response.data[0], null, 2));
            console.log('\n');
        }

        const puntosCriticosRepository = AppDataSource.getRepository(PuntosCriticos);

        console.log('🗑️ Limpiando tabla...');
        // await puntosCriticosRepository.clear();

        let insertados = 0;
        let errores = 0;

        for (const dato of response.data) {
            try {
                if (!dato.latitud || !dato.longitud) {
                    errores++;
                    continue;
                }

                const latitude = parseFloat(dato.latitud);
                const longitude = parseFloat(dato.longitud);

                if (isNaN(latitude) || isNaN(longitude)) {
                    errores++;
                    continue;
                }

                const fallecidos = parseInt(dato.fallecidos || '0');
                const heridos = parseInt(dato.heridos || '0');
                const gizscore = parseFloat(dato.gizscore || '0');
                const gipvalue = parseFloat(dato.gipvalue || '0');

                const numeroAccidentes = fallecidos + heridos > 0
                    ? Math.ceil((fallecidos * 3 + heridos) / 2)
                    : Math.ceil(gizscore / 10) || 1;

                const nivelPeligrosidad = calcularNivelPeligrosidadPorScore(gizscore, fallecidos, heridos);

                const title = dato.nombre
                    ? `${dato.nombre} - ${dato.municipio || ''}`
                    : `Punto Crítico - ${dato.municipio || ''}`;

                let description = `Sector crítico de siniestralidad vial`;
                if (dato.municipio && dato.departamento) {
                    description += ` en ${dato.municipio}, ${dato.departamento}`;
                }
                if (fallecidos > 0 || heridos > 0) {
                    description += `. Fallecidos: ${fallecidos}, Heridos: ${heridos}`;
                }
                if (dato.tramo) {
                    description += `. Tramo: ${dato.tramo}`;
                }

                const puntoCritico = puntosCriticosRepository.create({
                    title,
                    description,
                    latitude,
                    longitude,
                    departamento: dato.departamento || '',
                    municipio: dato.municipio || '',
                    clase: dato.entidad || 'Sector Crítico',
                    codigo: dato.id_mt || dato.divipola || '',
                    numeroAccidentes,
                    muertos: fallecidos,
                    heridos,
                    ano: new Date().getFullYear().toString(),
                    direccion: dato.tramo || dato.nombre || '',
                    zona: '',
                    nivelPeligrosidad,
                    size: calcularTamanoMarcador(nivelPeligrosidad),
                    iconName: 'PuntoCritico',
                    hideAfterZoom: 9,
                    activo: true,
                    visible: true,
                    fechaUltimaActualizacionDatos: new Date(),
                    fuenteDatos: 'https://datos.gov.co/resource/rs3u-8r4q.json'
                });

                console.log(puntoCritico);

                await puntosCriticosRepository.save(puntoCritico);
                insertados++;

                if (insertados % 100 === 0) {
                    console.log(`✅ Insertados: ${insertados}...`);
                }

            } catch (error) {
                errores++;
                console.error(`❌ Error procesando registro:`, error);
            }
        }

        console.log('\n📊 Resumen de importación:');
        console.log(`✅ Registros insertados: ${insertados}`);
        console.log(`❌ Errores: ${errores}`);
        console.log(`📈 Total procesados: ${response.data.length}`);

        return { insertados, errores, total: response.data.length };

    } catch (error: any) {
        console.error('❌ Error al importar datos:', error.message);
        if (error.response?.data) {
            console.error('Detalles del error:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

function calcularNivelPeligrosidadPorScore(
    gizscore: number,
    fallecidos: number,
    heridos: number
): "bajo" | "medio" | "alto" | "muy_alto" {

    // Combinar score con víctimas para una métrica más precisa
    const scoreTotal = gizscore + (fallecidos * 20) + (heridos * 5);

    if (scoreTotal >= 100 || fallecidos >= 5) return "muy_alto";
    if (scoreTotal >= 50 || fallecidos >= 3) return "alto";
    if (scoreTotal >= 20 || fallecidos >= 1) return "medio";
    return "bajo";
}

// Calcular tamaño del marcador según peligrosidad
function calcularTamanoMarcador(nivel: string): number {
    switch (nivel) {
        case "muy_alto": return 45;
        case "alto": return 38;
        case "medio": return 32;
        case "bajo": return 28;
        default: return 30;
    }
}

AppDataSource.initialize()
    .then(async () => {
        console.log("Base de datos conectada");
        await importarPuntosCriticos();
    })
    .catch((err) => {
        console.error("❌ Error al conectar DB:", err);
    });