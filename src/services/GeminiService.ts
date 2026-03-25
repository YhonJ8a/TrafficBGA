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
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });
    }

    async extractTrafficReport(message: string): Promise<ReportExtraction | null> {
        try {
            const prompt2 = `
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

            const prompt = `
Eres un asistente experto en extraer información de reportes de tráfico en Bucaramanga, Colombia.

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

LUGARES CONOCIDOS EN BUCARAMANGA (utiliza estos nombres exactos cuando sea posible):
- Viaducto García Cadena
- Autopista Floridablanca
- Autopista Bucaramanga - Floridablanca
- Carrera 27 (especifica entre qué calles si se menciona)
- Carrera 33 (especifica entre qué calles si se menciona)
- Carrera 15 (especifica entre qué calles si se menciona)
- Carrera 17 (especifica entre qué calles si se menciona)
- Carrera 21 (especifica entre qué calles si se menciona)
- Calle 36 (especifica entre qué carreras si se menciona)
- Calle 45 (especifica entre qué carreras si se menciona)
- Centro Bucaramanga
- Cabecera del Llano
- Provenza
- Norte
- Quebrada Seca
- Meseta de Bucaramanga
- Café Madrid
- Puente de Pescadero
- Real de Minas
- Estadio Alfonso López
- Parque San Pío
- Lagos del Cacique
- Terminal de Transportes Bucaramanga
- Chicamocha
- Aeropuerto Palonegro

REGLAS PARA EXTRAER LA UBICACIÓN CON PRECISIÓN:

1. FORMATO IDEAL: Siempre que sea posible, usa el formato "Nombre_Vía con Nombre_Cruce, Bucaramanga, Santander"
   Ejemplos:
   - "Carrera 27 con Calle 45, Bucaramanga, Santander"
   - "Autopista Floridablanca altura Viaducto García Cadena, Bucaramanga, Santander"

2. SI SE MENCIONA INTERSECCIÓN: Usa "Calle/Carrera X con Calle/Carrera Y"
   Ejemplo: "Calle 36 con Carrera 27, Bucaramanga, Santander"

3. SI SE MENCIONA UN PUNTO DE REFERENCIA: Incluye el nombre del lugar + la vía principal
   Ejemplo: "Autopista Floridablanca frente al Viaducto García Cadena, Bucaramanga, Santander"

4. SI SE MENCIONA "ALTURA DE": Usa "Vía principal altura Punto_Referencia"
   Ejemplo: "Carrera 27 altura Calle 45, Bucaramanga, Santander"

5. SI SE MENCIONA "CERCA DE" o "FRENTE A": Usa "Vía principal cerca de/frente a Punto_Referencia"
   Ejemplo: "Carrera 33 frente al Café Madrid, Bucaramanga, Santander"

6. SI SE MENCIONA UN BARRIO: Incluye "barrio [nombre], Bucaramanga, Santander"
   Ejemplo: "Carrera 27 barrio Cabecera, Bucaramanga, Santander"

7. SIEMPRE AGREGA ", Bucaramanga, Santander" al final de la ubicación

8. SI SOLO SE MENCIONA UNA VÍA SIN DETALLES: Usa "Nombre_Vía, Bucaramanga, Santander"
   Ejemplo: "Carrera 27, Bucaramanga, Santander"

9. NORMALIZA LOS NOMBRES:
   - "cra" → "Carrera"
   - "cl" → "Calle"
   - "av" → "Avenida"
   - "autopista flo" → "Autopista Floridablanca"
   - "viaducto" → "Viaducto García Cadena"

10. SI HAY NÚMEROS DE VÍA: Usa el formato "Carrera/Calle [número]"
    Ejemplo: Si dice "cra 27 # 45-23" → "Carrera 27 con Calle 45, Bucaramanga, Santander"

EJEMPLOS DE EXTRACCIÓN CORRECTA:

Mensaje: "Accidente en la cra 27 con calle 45"
Plaza: "Carrera 27 con Calle 45, Bucaramanga, Santander"

Mensaje: "Trancón en autopista floridablanca llegando al viaducto"
Plaza: "Autopista Floridablanca altura Viaducto García Cadena, Bucaramanga, Santander"

Mensaje: "Choque en la 33 frente al café madrid"
Plaza: "Carrera 33 frente al Café Madrid, Bucaramanga, Santander"

Mensaje: "Obra en centro cerca al parque santander"
Plaza: "Centro Bucaramanga cerca del Parque Santander, Bucaramanga, Santander"

Mensaje: "Bache en la 15 altura de cabecera"
Plaza: "Carrera 15 altura Cabecera del Llano, Bucaramanga, Santander"

Mensaje: "Incendio de vehículo autopista llegando al viaducto garcía cadena"
Plaza: "Autopista Floridablanca altura Viaducto García Cadena, Bucaramanga, Santander"

Mensaje: "Tráfico lento en toda la carrera 27"
Plaza: "Carrera 27, Bucaramanga, Santander"

INSTRUCCIONES PRINCIPALES:
1. Analiza el siguiente mensaje y determina si es un reporte de tráfico o incidente vial
2. Extrae: tipo de incidente, descripción breve, y UBÍCACIÓN COMPLETA Y PRECISA
3. Si NO es un reporte de tráfico o NO tiene ubicación clara, responde solo: NO_REPORT
4. Si SÍ es un reporte, responde ÚNICAMENTE en formato JSON válido (sin markdown, sin \`\`\`json)
5. La plaza debe ser lo más específica posible siguiendo las reglas anteriores
6. La confianza debe ser alta (80-100) si la ubicación es clara, media (60-79) si es aproximada, baja (40-59) si es vaga

MENSAJE A ANALIZAR:
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