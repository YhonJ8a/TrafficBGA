import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function AlertModal({
    alert,
    onClose,
}: {
    alert: any;
    onClose: () => void;
}) {
    if (!alert.visible) return null;

    const isConfirm = alert.type === "confirm";

    return (
        <Modal transparent animationType="fade">
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>{alert.title}</Text>
                    <Text style={styles.message}>{alert.message}</Text>
                    <View style={styles.actions}>
                        {isConfirm && (
                            <TouchableOpacity onPress={onClose}>
                                <Text style={styles.cancel}>Cancelar</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                alert.onConfirm?.();
                                onClose();
                            }}
                        >
                            <Text style={styles.confirm}>Aceptar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        width: "85%",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        color: "#444",
    },
    actions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 20,
        gap: 20,
    },
    cancel: {
        color: "#888",
        fontSize: 16,
    },
    confirm: {
        color: "#007AFF",
        fontSize: 16,
        fontWeight: "600",
    },
});
