import { colotTheme } from "@/components/Themed";
import { useNotification } from "@/contexts/NotificationContext";
import { styles } from "@/style/styles";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { View } from "react-native";

export default function ToolsLeft() {
    const notification = useNotification();
    const handleConfirm = () => {
        notification.showConfirm(
            "Confirmar acción",
            "¿Estás seguro de que deseas eliminar este elemento?",
            () => {
                console.log("Confirmado");
                notification.showSuccess("Eliminado", "El elemento fue eliminado");
            },
            () => {
                console.log("Cancelado");
            },
        );
    };
    return (
        <View style={styles.toolsContainerRight}>
            <MaterialIcons
                name="report"
                size={70}
                color={colotTheme() ?? "white"}
                onPress={() =>
                    notification.showError(
                        "Error",
                        "Hubo un problema al procesar tu solicitud",
                    )
                }
            />
            <FontAwesome6
                name="location-crosshairs"
                size={70}
                color={colotTheme() ?? "white"}
                onPress={handleConfirm}
            />
        </View>
    );
}
