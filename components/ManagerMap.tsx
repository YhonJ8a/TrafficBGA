import { CONFIG } from "@/assets/Configuration";
import {
    locationList,
    markersGoogle,
    polylineCoordinates,
} from "@/assets/LocationList";
import { MapViewNative } from "@/components/maps/MapView.native";
import { RouteSearchPanel } from "@/components/maps/RouteSearchPanel";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useExpoMaps } from "@/hooks/useExpoMaps";
import { useMapCamera } from "@/hooks/useMapCamera";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { styles } from "@/style/styles";
import AntDesign from "@expo/vector-icons/AntDesign";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Platform, View } from "react-native";
import { Search } from "./Search";
import ToolsLeft from "./maps/ToolsLeft";
import ToolsRight from "./maps/ToolsRight";

const GOOGLE_MAPS_APIKEY =
    Platform.select({
        android: Constants.expoConfig?.android?.config?.googleMaps?.apiKey,
        ios: Constants.expoConfig?.ios?.config?.googleMapsApiKey,
        default: "",
    }) || "AIzaSyD40p_TtzHjgOmDH_AqmSi0q4uTfYwVoT0";

export default function ManagerMap() {
    const [locationIndex, setLocationIndex] = useState(0);
    const [location, setLocation] = useState(locationList[0]);
    const [showRouteSearch, setShowRouteSearch] = useState(false);

    const { maps } = useExpoMaps();
    const { mapRef, setCameraPosition } = useMapCamera();

    const {
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
    } = useRouteSearch(GOOGLE_MAPS_APIKEY);

    const initialCameraPosition = React.useMemo(() => {
        const [latitude, longitude] = locationList[0].stores[0].point;
        return {
            coordinates: { latitude, longitude },
            zoom: CONFIG.SF_ZOOM,
        };
    }, []);

    const { coords, error, loadingLocation, getCurrentLocation } =
        useCurrentLocation();

    React.useEffect(() => {
        if (!GOOGLE_MAPS_APIKEY) {
            console.warn("Google Maps API Key no encontrada en app.json");
        } else {
            console.log("Google Maps API Key cargada correctamente");
        }
        getCurrentLocation();
    }, []);

    React.useEffect(() => {
        if (!selectedOrigin) return;
        setCameraPosition({
            coordinates: selectedOrigin,
            zoom: 17,
        });
    }, [selectedOrigin, setCameraPosition]);

    React.useEffect(() => {
        if (!coords) return;
        setCameraPosition({
            coordinates: coords,
        });
    }, [coords, setCameraPosition]);

    React.useEffect(() => {
        if (!routePolyline.length) return;
        const coordinates = routePolyline[Math.floor(routePolyline.length / 2)];
        setCameraPosition({ coordinates });
        console.log("Marcadores: ", allMarkers);
    }, [routePolyline, setCameraPosition]);

    const allPolylines = [
        {
            color: "#5C0DB6",
            width: CONFIG.LINE_WIDTH,
            coordinates: polylineCoordinates,
        },
        ...(routePolyline.length > 0
            ? [
                {
                    color: "#008CFF",
                    width: 10,
                    coordinates: routePolyline,
                },
            ]
            : []),
    ];

    const allMarkers = [
        ...markersGoogle,
        ...(selectedOrigin
            ? [{ coordinate: selectedOrigin, title: "Origen", draggable: true }]
            : []),
        ...(selectedDestination
            ? [{ coordinate: selectedDestination, title: "Destino", draggable: true }]
            : []),
        ...(coords
            ? [
                {
                    coordinates: {
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                    },
                    title: "49th Parallel Café & Lucky's Doughnuts - Main Street",
                    snippet: "49th Parallel Café & Lucky's Doughnuts - Main Street",
                    draggable: true,
                },
            ]
            : []),
    ];

    const renderRouteSearch = () => (
        <View style={styles.routeSearchContainer}>
            <RouteSearchPanel
                originInput={originInput}
                destinationInput={destinationInput}
                originSuggestions={originSuggestions}
                destinationSuggestions={destinationSuggestions}
                originError={originError}
                destinationError={destinationError}
                routeError={routeError}
                routeInfo={routeInfo}
                loading={loading}
                canCalculate={canCalculate}
                onChangeOrigin={onChangeOrigin}
                onChangeDestination={onChangeDestination}
                onSelectOrigin={selectOrigin}
                onSelectDestination={selectDestination}
                onCalculateRoute={calculateRoute}
                onClear={clearRoute}
                onClose={() => setShowRouteSearch(false)}
            />
        </View>
    );

    const renderSearch = () => {
        return (
            <>
                <View style={styles.headerContainer}>
                    <Search
                        originInput={originInput}
                        onChangeOrigin={onChangeOrigin}
                        originError={originError || ""}
                        originSuggestions={originSuggestions}
                        selectOrigin={selectOrigin}
                    />
                    <AntDesign
                        name="menu"
                        size={25}
                        color="#ffffff"
                        style={{ ...styles.containerContent, padding: 15 }}
                    />
                </View>
            </>
        );
    };

    const renderTools = () => {
        return (
            <>
                <ToolsLeft />
                <ToolsRight />
            </>
        );
    };

    return (
        <View style={styles.container}>
            <MapViewNative
                maps={maps}
                mapRef={mapRef}
                initialCameraPosition={initialCameraPosition}
                googleMapType={maps?.GoogleMapsMapType?.standard}
                googleProperties={{
                    ...CONFIG.PROPERTIES,
                    mapType: maps?.GoogleMapsMapType?.[CONFIG.MAP_TYPE[2]],
                }}
                polylines={allPolylines}
                markers={allMarkers}
            ></MapViewNative>
            <LinearGradient
                colors={["rgba(0, 0, 0, 0.86)", "transparent"]}
                style={styles.background}
            />
            {showRouteSearch && renderRouteSearch()}
            {renderSearch()}
            {renderTools()}
        </View>
    );
}
