import { useCallback, useMemo, useRef, useState } from 'react';

import { createGoogleMapsClient } from '@/services/googleMaps';
import { Place, RouteCoordinates, RouteInfo } from '@/types/maps';

function mapGoogleStatusToMessage(status: string): string {
    switch (status) {
        case 'REQUEST_DENIED':
            return 'API Key inválida o API no habilitada (Places/Directions).';
        case 'OVER_QUERY_LIMIT':
            return 'Límite de cuota alcanzado. Intenta más tarde.';
        case 'ZERO_RESULTS':
            return 'No se encontraron resultados.';
        case 'INVALID_REQUEST':
            return 'Solicitud inválida. Verifica los datos.';
        case 'NOT_FOUND':
            return 'No se encontró el lugar.';
        default:
            return 'Ocurrió un error consultando Google Maps.';
    }
}

export function useRouteSearch(apiKey: string) {
    const client = useMemo(() => {
        if (!apiKey) return null;
        return createGoogleMapsClient(apiKey);
    }, [apiKey]);

    const [originInput, setOriginInput] = useState('');
    const [destinationInput, setDestinationInput] = useState('');

    const [originSuggestions, setOriginSuggestions] = useState<Place[]>([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState<Place[]>([]);

    const [selectedOrigin, setSelectedOrigin] = useState<RouteCoordinates | null>(null);
    const [selectedDestination, setSelectedDestination] = useState<RouteCoordinates | null>(null);

    const [routePolyline, setRoutePolyline] = useState<RouteCoordinates[]>([]);
    const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

    const [loading, setLoading] = useState(false);

    const [originError, setOriginError] = useState<string | null>(null);
    const [destinationError, setDestinationError] = useState<string | null>(null);
    const [routeError, setRouteError] = useState<string | null>(null);

    const originRequestIdRef = useRef(0);
    const destinationRequestIdRef = useRef(0);

    const clearRoute = useCallback(() => {
        setRoutePolyline([]);
        setOriginInput('');
        setDestinationInput('');
        setOriginSuggestions([]);
        setDestinationSuggestions([]);
        setSelectedOrigin(null);
        setSelectedDestination(null);
        setRouteInfo(null);

        setOriginError(null);
        setDestinationError(null);
        setRouteError(null);
    }, []);

    const onChangeOrigin = useCallback(
        async (text: string) => {
            setOriginInput(text);
            setOriginError(null);
            setRouteError(null);

            if (!client) {
                setOriginSuggestions([]);
                if (text.length >= 3) setOriginError('API Key no configurada.');
                return;
            }

            if (text.length < 3) {
                setOriginSuggestions([]);
                return;
            }

            const requestId = ++originRequestIdRef.current;
            try {
                const places = await client.autocomplete(text);
                if (originRequestIdRef.current !== requestId) return;
                setOriginSuggestions(places);
            } catch (error: any) {
                if (originRequestIdRef.current !== requestId) return;
                const message = mapGoogleStatusToMessage(error?.message || 'AUTOCOMPLETE_ERROR');
                setOriginError(message);
                setOriginSuggestions([]);
            }
        },
        [client]
    );

    const onChangeDestination = useCallback(
        async (text: string) => {
            setDestinationInput(text);
            setDestinationError(null);
            setRouteError(null);

            if (!client) {
                setDestinationSuggestions([]);
                if (text.length >= 3) setDestinationError('API Key no configurada.');
                return;
            }

            if (text.length < 3) {
                setDestinationSuggestions([]);
                return;
            }

            const requestId = ++destinationRequestIdRef.current;
            try {
                const places = await client.autocomplete(text);
                if (destinationRequestIdRef.current !== requestId) return;
                setDestinationSuggestions(places);
            } catch (error: any) {
                if (destinationRequestIdRef.current !== requestId) return;
                const message = mapGoogleStatusToMessage(error?.message || 'AUTOCOMPLETE_ERROR');
                setDestinationError(message);
                setDestinationSuggestions([]);
            }
        },
        [client]
    );

    const selectOrigin = useCallback(
        async (place: Place) => {
            setOriginInput(place.description);
            setOriginSuggestions([]);
            setOriginError(null);
            setRouteError(null);

            if (!client) {
                setOriginError('API Key no configurada.');
                return;
            }

            try {
                const coords = await client.placeDetails(place.place_id);
                setSelectedOrigin(coords);
            } catch (error: any) {
                setOriginError(mapGoogleStatusToMessage(error?.message || 'PLACE_DETAILS_ERROR'));
            }
        },
        [client]
    );

    const selectDestination = useCallback(
        async (place: Place) => {
            setDestinationInput(place.description);
            setDestinationSuggestions([]);
            setDestinationError(null);
            setRouteError(null);

            if (!client) {
                setDestinationError('API Key no configurada.');
                return;
            }

            try {
                const coords = await client.placeDetails(place.place_id);
                setSelectedDestination(coords);
            } catch (error: any) {
                setDestinationError(mapGoogleStatusToMessage(error?.message || 'PLACE_DETAILS_ERROR'));
            }
        },
        [client]
    );

    const calculateRoute = useCallback(async () => {
        setRouteError(null);

        if (!selectedOrigin || !selectedDestination) {
            setRouteError('Selecciona origen y destino.');
            return;
        }

        if (!client) {
            setRouteError('API Key no configurada.');
            return;
        }

        setLoading(true);
        try {
            const result = await client.directions(selectedOrigin, selectedDestination);
            setRoutePolyline(result.polyline);
            setRouteInfo(result.info);
        } catch (error: any) {
            setRouteError(mapGoogleStatusToMessage(error?.message || 'DIRECTIONS_ERROR'));
        } finally {
            setLoading(false);
        }
    }, [client, selectedDestination, selectedOrigin]);

    const canCalculate = !!selectedOrigin && !!selectedDestination && !loading;

    return {
        originInput,
        destinationInput,
        originSuggestions,
        destinationSuggestions,
        selectedOrigin,
        selectedDestination,
        routePolyline,
        routeInfo,
        loading,
        canCalculate,
        originError,
        destinationError,
        routeError,
        onChangeOrigin,
        onChangeDestination,
        selectOrigin,
        selectDestination,
        calculateRoute,
        clearRoute,
    };
}
