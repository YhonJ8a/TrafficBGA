import axios from "axios";
import { AppDataSource } from "../db";
import { TrafficRouteData } from "../../entities/TrafficRouteData";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

const ROUTES = [
    {
        name: "Carrera 33",
        origin: { latitude: 7.106890960065566, longitude: -73.10941033065319 },
        destination: { latitude: 7.129969128952301, longitude: -73.11440259218216 },
    },
    {
        name: "Carrera 27",
        origin: { latitude: 7.107378032932778, longitude: -73.11398081481457 },
        destination: { latitude: 7.1267776851425255, longitude: -73.11881449073553 }
    },
    {
        name: "Carrera 21",
        origin: { latitude: 7.124013390454732, longitude: -73.1232351064682 },
        destination: { latitude: 7.108849562099627, longitude: -73.11643872410059 }
    },
    {
        name: "Carrera 17",
        origin: { latitude: 7.122894559980526, longitude: -73.12655065208673 },
        destination: { latitude: 7.104495512222966, longitude: -73.11829213052988 }
    },
    {
        name: "Carrera 15",
        origin: { latitude: 7.107877082466165, longitude: -73.11596598476171 },
        destination: { latitude: 7.122481693213422, longitude: -73.12822300940752 }
    },
    {
        name: "Centro",
        origin: { latitude: 7.121399454870997, longitude: -73.11670627444983 },
        destination: { latitude: 7.117102414477934, longitude: -73.12972739338875 }
    },
    {
        name: "Quebrada Seca",
        origin: { latitude: 7.120960969626503, longitude: -73.13138533383608 },
        destination: { latitude: 7.126984948351992, longitude: -73.11945352703333 }
    },
    {
        name: "Norte",
        origin: { latitude: 7.134169571398631, longitude: -73.13079256564379 },
        destination: { latitude: 7.141461868441934, longitude: -73.13334703445435 }
    },
    {
        name: "Provenza",
        origin: { latitude: 7.088123623058944, longitude: -73.10904387384653 },
        destination: { latitude: 7.085455916157717, longitude: -73.11798635870218 }
    },
    {
        name: "Av. Florida Blanca",
        origin: { latitude: 7.105511250172967, longitude: -73.11283115297556 },
        destination: { latitude: 7.076754985348289, longitude: -73.10818389058113 }
    },
    {
        name: "Mitis",
        origin: { latitude: 7.103057904822597, longitude: -73.12002886086702 },
        destination: { latitude: 7.099850969457273, longitude: -73.12921475619078 }
    },
    {
        name: "Real de Minas",
        origin: { latitude: 7.1071774148676194, longitude: -73.11956986784935 },
        destination: { latitude: 7.102807379397983, longitude: -73.13049115240574 }
    },
];

async function recolectarTrafico() {
    try {
        const repository = AppDataSource.getRepository(TrafficRouteData);

        for (const route of ROUTES) {
            const rutas = [
                { origin: route.origin, destination: route.destination },
                { origin: route.destination, destination: route.origin }
            ];
            for (let i = 0; i < 2; i++) {
                try {
                    const { latitude: origLat, longitude: origLng } = rutas[i].origin;
                    const { latitude: destLat, longitude: destLng } = rutas[i].destination;

                    const result = await axios.get(
                        "https://maps.googleapis.com/maps/api/distancematrix/json",
                        {
                            params: {
                                origins: `${origLat},${origLng}`,
                                destinations: `${destLat},${destLng}`,
                                departure_time: "now",
                                traffic_model: "best_guess",
                                key: API_KEY,
                            },
                        }
                    );

                    const element = result.data.rows[0].elements[0];

                    console.log(element);

                    const durationNormal = element.duration.value;
                    const durationTraffic = element.duration_in_traffic.value;
                    const distanceMeters = element.distance.value;

                    const avgSpeed = (distanceMeters / (durationTraffic > 0 ? durationTraffic : durationNormal)) * 3.6;

                    // Congestión como % diferencia
                    const congestionIndex =
                        ((durationTraffic - durationNormal) / durationNormal) * 100;

                    const entity = repository.create({
                        routeName: `${route.name} (${i === 0 ? 'ida' : 'vuelta'})`,
                        originLat: parseFloat(`${origLat}`),
                        originLng: parseFloat(`${origLng}`),
                        destLat: parseFloat(`${destLat}`),
                        destLng: parseFloat(`${destLng}`),
                        durationNormal,
                        durationTraffic,
                        avgSpeed,
                        congestionIndex,
                        departureTime: new Date().toISOString(),
                        distanceMeters,
                        distanceMetersText: element.distance.text,
                        durationTrafficText: element.duration_in_traffic.text,
                        durationNormalText: element.duration.text,
                    });

                    await repository.save(entity);

                    console.log(
                        `📍 Ruta ${route.name}: dur=${durationTraffic}s, cong=${congestionIndex.toFixed(2)}%`
                    );

                } catch (err) {
                    console.error("❌ Error en ruta:", route.name, err.message);
                }
            }
        }

        console.log("📊 Recolección completada");

        process.exit(0);

    } catch (err) {
        console.error("❌ Error general:", err);
        process.exit(1);
    }
}

AppDataSource.initialize()
    .then(async () => {
        console.log("Base de datos conectada");
        await recolectarTrafico();
    })
    .catch((err) => {
        console.error("❌ Error al conectar DB:", err);
    });