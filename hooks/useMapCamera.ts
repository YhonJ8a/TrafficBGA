import { useCallback, useRef } from "react";

export function useMapCamera() {
    const mapRef = useRef<any>(null);
    const isAnimatingRef = useRef(false);

    const setCameraPosition = useCallback(
        async (params: {
            coordinates: { latitude: number; longitude: number };
            zoom?: number;
            animate?: boolean;
        }) => {
            if (!mapRef.current) return;
            if (isAnimatingRef.current) return;

            isAnimatingRef.current = true;
            try {
                await mapRef.current.setCameraPosition({
                    coordinates: params.coordinates,
                    zoom: params.zoom ?? 14,
                    animate: params.animate ?? true,
                });
            } catch (error: any) {
                if (error?.message?.includes("Animation cancelled")) return;
                console.error("Error setting camera position:", error);
            } finally {
                isAnimatingRef.current = false;
            }
        },
        [],
    );

    return {
        mapRef,
        setCameraPosition,
    };
}
