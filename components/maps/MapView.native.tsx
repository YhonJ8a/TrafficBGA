import { styles } from "@/style/styles";
import React from "react";
import { Platform, StyleSheet } from "react-native";

export function MapViewNative(props: {
    maps: {
        AppleMaps: any;
        GoogleMaps: any;
        AppleMapsMapType: any;
        GoogleMapsMapType: any;
    } | null;
    mapRef: any;
    initialCameraPosition: any;
    googleMapType: any;
    googleProperties: any;
    polylines: any[];
    markers: any[];
    children?: React.ReactNode;
}) {
    const {
        maps,
        mapRef,
        initialCameraPosition,
        googleMapType,
        googleProperties,
        polylines,
        markers,
        children,
    } = props;
    if (!maps) return null;

    if (Platform.OS === "ios" && maps.AppleMaps) {
        return (
            <maps.AppleMaps.View
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                mapType={maps.AppleMapsMapType.standard}
                cameraPosition={initialCameraPosition}
            />
        );
    }

    if (Platform.OS === "android" && maps.GoogleMaps) {
        return (
            <maps.GoogleMaps.View
                ref={mapRef}
                style={styles.map}
                mapType={googleMapType}
                cameraPosition={initialCameraPosition}
                properties={googleProperties}
                polylines={polylines}
                markers={markers}
                onMapClick={(e: any) => {
                    console.log(JSON.stringify({ type: "onMapClick", data: e }, null, 2));
                }}
            >
                {children}
            </maps.GoogleMaps.View>
        );
    }

    return null;
}
