export interface Place {
    description: string;
    place_id: string;
}

export interface RouteCoordinates {
    latitude: number;
    longitude: number;
}

export interface RouteInfo {
    distance: string;
    duration: string;
}

export interface DirectionsResult {
    polyline: RouteCoordinates[];
    info: RouteInfo;
}
