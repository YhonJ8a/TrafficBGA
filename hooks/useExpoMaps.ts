import { useMemo } from 'react';
import { Platform } from 'react-native';

type ExpoMapsModule = {
    AppleMaps: any;
    GoogleMaps: any;
};

type ExpoMapsTypes = {
    AppleMapsMapType: any;
    GoogleMapsMapType: any;
};

export function useExpoMaps(): {
    maps: (ExpoMapsModule & ExpoMapsTypes) | null;
    isSupported: boolean;
    error: unknown;
} {
    return useMemo(() => {
        if (Platform.OS === 'web') {
            return { maps: null, isSupported: false, error: null };
        }

        try {
            const expoMaps = require('expo-maps') as ExpoMapsModule;
            const appleTypes = require('expo-maps/build/apple/AppleMaps.types') as { AppleMapsMapType: any };
            const googleTypes = require('expo-maps/build/google/GoogleMaps.types') as { GoogleMapsMapType: any };

            return {
                maps: {
                    AppleMaps: expoMaps.AppleMaps,
                    GoogleMaps: expoMaps.GoogleMaps,
                    AppleMapsMapType: appleTypes.AppleMapsMapType,
                    GoogleMapsMapType: googleTypes.GoogleMapsMapType,
                },
                isSupported: true,
                error: null,
            };
        } catch (error) {
            console.warn('expo-maps not available on this platform', error);
            return { maps: null, isSupported: false, error };
        }
    }, []);
}
