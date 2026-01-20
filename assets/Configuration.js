export const CONFIG = {
    SF_ZOOM: 11,
    ANIMATION: true,
    LINE_WIDTH: 20,
    PROPERTIES: {
        isBuildingEnabled: true,
        isIndoorEnabled: true,
        selectionEnabled: true,
        isMyLocationEnabled: false,
        isTrafficEnabled: true,
        minZoomPreference: 1,
        maxZoomPreference: 20,
    },
    MAP_TYPE: ["SATELLITE", "HYBRID", "ROADMAP", "TERRAIN"],
    NOTIFICATION_PARAMS: {
        success: {
            bg: "#10B981",
            iconColor: "#ECFDF5",
            text: "#FFFFFF",
            icon: "✓",
        },
        warning: {
            bg: "#F59E0B",
            iconColor: "#FEF3C7",
            text: "#FFFFFF",
            icon: "⚠",
        },
        confirm: {
            bg: "#6366F1",
            iconColor: "#E0E7FF",
            text: "#FFFFFF",
            icon: "?",
        },
        error: { bg: "#EF4444", iconColor: "#FEE2E2", text: "#FFFFFF", icon: "✕" },
        info: { bg: "#3B82F6", iconColor: "#DBEAFE", text: "#FFFFFF", icon: "ℹ" },
    },
};
