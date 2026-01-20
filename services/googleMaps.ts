import { DirectionsResult, Place, RouteCoordinates } from '@/types/maps';

function decodePolyline(encoded: string): RouteCoordinates[] {
    const points: RouteCoordinates[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
        let b;
        let shift = 0;
        let result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lng += dlng;

        points.push({
            latitude: lat / 1e5,
            longitude: lng / 1e5,
        });
    }

    return points;
}

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json() as Promise<T>;
}

export function createGoogleMapsClient(apiKey: string) {
    async function autocomplete(input: string): Promise<Place[]> {
        if (input.length < 3) return [];

        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&components=country:co`;
        const data = await fetchJson<any>(url);

        const status = data?.status;
        if (status !== 'OK' && status !== 'ZERO_RESULTS') {
            throw new Error(status || 'AUTOCOMPLETE_ERROR');
        }

        const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
        return predictions.map((p: any) => ({
            description: p.description,
            place_id: p.place_id,
        }));
    }

    async function placeDetails(placeId: string): Promise<RouteCoordinates | null> {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`;
        const data = await fetchJson<any>(url);

        const status = data?.status;
        if (status !== 'OK') {
            throw new Error(status || 'PLACE_DETAILS_ERROR');
        }

        const loc = data?.result?.geometry?.location;
        if (!loc) return null;

        return {
            latitude: loc.lat,
            longitude: loc.lng,
        };
    }

    async function directions(origin: RouteCoordinates, destination: RouteCoordinates): Promise<DirectionsResult> {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}&mode=driving`;
        const data = await fetchJson<any>(url);

        const status = data?.status;
        if (status !== 'OK') {
            throw new Error(status || 'DIRECTIONS_ERROR');
        }

        const route = data?.routes?.[0];
        const leg = route?.legs?.[0];
        const encodedPolyline = route?.overview_polyline?.points;

        if (!encodedPolyline || !leg?.distance?.text || !leg?.duration?.text) {
            throw new Error('DIRECTIONS_PARSE_ERROR');
        }

        return {
            polyline: decodePolyline(encodedPolyline),
            info: {
                distance: leg.distance.text,
                duration: leg.duration.text,
            },
        };
    }

    return {
        autocomplete,
        placeDetails,
        directions,
    };
}
