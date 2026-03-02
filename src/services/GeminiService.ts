import { GoogleGenerativeAI } from '@google/generative-ai';

interface ReportExtraction {
    tipo: string;
    descripcion: string;
    plaza: string;
    confianza: number;
    coordenadas?: {
        latitude: number;
        longitude: number;
    };
}

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    }

    async extractTrafficReport(message: string): Promise<ReportExtraction | null> {
        try {
            const prompt = `
Eres un asistente que extrae información de reportes de tráfico en Bucaramanga, Colombia.

TIPOS DE INCIDENTES VÁLIDOS (usa exactamente estos nombres):
- Accidente
- Trafico
- Choque
- Cierre
- Obra
- Transito
- Bache
- Inundacion
- Manifestacion
- Derrumbe

LUGARES CONOCIDOS EN BUCARAMANGA:
- Viaducto García Cadena
- Autopista Floridablanca
- Carrera 27, Carrera 33, Carrera 15, Carrera 17, Carrera 21
- Centro
- Cabecera
- Provenza
- Norte
- Quebrada Seca
- Meseta de Bucaramanga
- Café Madrid
- Puente de Pescadero
- Real de Minas
- Estadio Alfonso López

INSTRUCCIONES:
1. Analiza el siguiente mensaje y determina si es un reporte de tráfico
2. Extrae: tipo de incidente, descripción breve, y lugar/dirección
3. Si NO es un reporte de tráfico o NO tiene ubicación clara, responde solo: NO_REPORT
4. Si SÍ es un reporte, responde en formato JSON válido

MENSAJE:
"${message}"

RESPUESTA (solo JSON o NO_REPORT):
{
  "tipo": "tipo de incidente",
  "descripcion": "descripción breve del incidente",
  "plaza": "lugar específico o dirección",
  "confianza": 0-100
}
`;

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim();

            console.log('🤖 Respuesta de Gemini:', text);

            // Si Gemini dice que no es un reporte
            if (text.includes('NO_REPORT') || text.includes('no es un reporte')) {
                return null;
            }

            // Extraer JSON de la respuesta
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return null;
            }

            const extracted: ReportExtraction = JSON.parse(jsonMatch[0]);

            // Validar que tenga los campos requeridos
            if (!extracted.tipo || !extracted.descripcion || !extracted.plaza) {
                return null;
            }

            // Validar confianza mínima
            if (extracted.confianza < 60) {
                console.log('⚠️ Confianza muy baja:', extracted.confianza);
                return null;
            }

            // Geocodificar la ubicación
            const coords = await this.geocodeBucaramanga(extracted.plaza);
            if (coords) {
                extracted.coordenadas = coords;
            }

            return extracted;

        } catch (error) {
            console.error('❌ Error en Gemini:', error);
            return null;
        }
    }

    private async geocodeBucaramanga(
        place: string
    ): Promise<{ latitude: number; longitude: number } | null> {
        try {
            const axios = (await import('axios')).default;

            const response = await axios.get(
                'https://maps.googleapis.com/maps/api/geocode/json',
                {
                    params: {
                        address: `${place}, Bucaramanga, Santander, Colombia`,
                        key: process.env.GOOGLE_MAPS_API_KEY
                    }
                }
            );

            if (response.data.results.length > 0) {
                const location = response.data.results[0].geometry.location;

                // Validar que esté en Bucaramanga (aproximado)
                const bmgaBounds = {
                    latMin: 6.9,
                    latMax: 7.3,
                    lngMin: -73.3,
                    lngMax: -73.0
                };

                if (
                    location.lat >= bmgaBounds.latMin &&
                    location.lat <= bmgaBounds.latMax &&
                    location.lng >= bmgaBounds.lngMin &&
                    location.lng <= bmgaBounds.lngMax
                ) {
                    return {
                        latitude: location.lat,
                        longitude: location.lng
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Error en geocoding:', error);
            return null;
        }
    }

    // Normalizar tipo de incidente a los existentes en la BD
    normalizeTipoIncidente(tipo: string): string {
        const normalizations: { [key: string]: string } = {
            'accidente': 'Accidente',
            'choque': 'Choque',
            'colisión': 'Choque',
            'colision': 'Choque',
            'trafico': 'Trafico',
            'tráfico': 'Trafico',
            'trancón': 'Trafico',
            'trancon': 'Trafico',
            'congestion': 'Trafico',
            'congestión': 'Trafico',
            'cierre': 'Cierre',
            'cerrada': 'Cierre',
            'bloqueada': 'Cierre',
            'bloqueado': 'Cierre',
            'obra': 'Obra',
            'construcción': 'Obra',
            'construccion': 'Obra',
            'transito': 'Transito',
            'tránsito': 'Transito',
            'policía': 'Transito',
            'policia': 'Transito',
            'bache': 'Bache',
            'hueco': 'Bache',
            'inundación': 'Inundacion',
            'inundacion': 'Inundacion',
            'manifestación': 'Manifestacion',
            'manifestacion': 'Manifestacion',
            'protesta': 'Manifestacion',
            'derrumbe': 'Derrumbe',
            'deslizamiento': 'Derrumbe'
        };

        const tipoLower = tipo.toLowerCase();
        return normalizations[tipoLower] || 'Alerta';
    }
}