import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 50,
        left: 20,
        right: 20,
        zIndex: 9999,
    },
    notification: {
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    content: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    icon: {
        fontSize: 20,
        fontWeight: "bold",
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        opacity: 0.9,
    },
    closeButton: {
        padding: 4,
    },
    closeText: {
        fontSize: 20,
        fontWeight: "bold",
    },
    buttonContainer: {
        flexDirection: "row",
        marginTop: 16,
        gap: 10,
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    confirmButton: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
    },
    cancelButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 14,
    },
    confirmButtonText: {
        color: "#1F2937",
        fontWeight: "600",
        fontSize: 14,
    },
});
