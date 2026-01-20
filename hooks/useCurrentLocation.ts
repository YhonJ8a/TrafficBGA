import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

type Coordinates = {
    latitude: number;
    longitude: number;
    // accuracy?: number | null;
};

export function useCurrentLocation(options?: {
    enabled?: boolean;
    watch?: boolean;
    watchOptions?: Location.LocationOptions;
    requestPermissionsOnMount?: boolean;
}) {
    const enabled = options?.enabled ?? true;
    const watch = options?.watch ?? false;
    const requestPermissionsOnMount = options?.requestPermissionsOnMount ?? true;

    const [permissionStatus, setPermissionStatus] =
        useState<Location.PermissionStatus | null>(null);
    const [coords, setCoords] = useState<Coordinates | null>(null);
    const [loadingLocation, setloadingLocation] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

    const requestPermission = useCallback(async () => {
        setError(null);
        const { status } = await Location.requestForegroundPermissionsAsync();
        setPermissionStatus(status);
        return status;
    }, []);

    const getCurrentLocation = useCallback(
        async (locationOptions?: Location.LocationOptions) => {
            if (!enabled) return null;

            setloadingLocation(true);
            setError(null);
            try {
                let status = permissionStatus;

                if (!status) {
                    const current = await Location.getForegroundPermissionsAsync();
                    status = current.status;
                    setPermissionStatus(current.status);
                }

                if (status !== "granted") {
                    status = await requestPermission();
                }

                if (status !== "granted") {
                    setError("Permiso de ubicación denegado.");
                    return null;
                }

                const pos = await Location.getCurrentPositionAsync(
                    locationOptions ?? {
                        accuracy: Location.Accuracy.Balanced,
                    },
                );

                const next: Coordinates = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                };
                // accuracy: pos.coords.accuracy,

                setCoords(next);
                return next;
            } catch (e: any) {
                setError(e?.message || "Error obteniendo ubicación.");
                return null;
            } finally {
                setloadingLocation(false);
            }
        },
        [enabled, permissionStatus, requestPermission],
    );

    const startWatching = useCallback(
        async (watchOptions?: Location.LocationOptions) => {
            if (!enabled) return;

            setError(null);

            // stop previous subscription if any
            subscriptionRef.current?.remove();
            subscriptionRef.current = null;

            let status = permissionStatus;

            if (!status) {
                const current = await Location.getForegroundPermissionsAsync();
                status = current.status;
                setPermissionStatus(current.status);
            }

            if (status !== "granted") {
                status = await requestPermission();
            }

            if (status !== "granted") {
                setError("Permiso de ubicación denegado.");
                return;
            }

            subscriptionRef.current = await Location.watchPositionAsync(
                watchOptions ??
                options?.watchOptions ?? {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 2000,
                    distanceInterval: 5,
                },
                (pos) => {
                    setCoords({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        // accuracy: pos.coords.accuracy,
                    });
                },
            );
        },
        [enabled, options?.watchOptions, permissionStatus, requestPermission],
    );

    const stopWatching = useCallback(() => {
        subscriptionRef.current?.remove();
        subscriptionRef.current = null;
    }, []);

    useEffect(() => {
        if (!enabled) return;

        if (!requestPermissionsOnMount) return;

        // fire and forget; UI can show errors via state
        requestPermission();
    }, [enabled, requestPermission, requestPermissionsOnMount]);

    useEffect(() => {
        if (!enabled) return;

        if (!watch) return;

        startWatching();
        return () => {
            stopWatching();
        };
    }, [enabled, startWatching, stopWatching, watch]);

    return {
        coords,
        permissionStatus,
        loadingLocation,
        error,
        requestPermission,
        getCurrentLocation,
        startWatching,
        stopWatching,
    };
}
