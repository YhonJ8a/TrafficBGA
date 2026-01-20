import { NotificationConfig } from "@/contexts/NotificationContext";
import React from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { CONFIG } from "../assets/Configuration";
import { styles } from "../style/stylesNofications";
interface NotificationComponentProps {
    notification: NotificationConfig;
    onClose: () => void;
}

export const NotificationComponent: React.FC<NotificationComponentProps> = ({
    notification,
    onClose,
}) => {
    const slideAnim = React.useRef(new Animated.Value(-100)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const handleConfirm = () => {
        notification.onConfirm?.();
        handleClose();
    };

    const handleCancel = () => {
        notification.onCancel?.();
        handleClose();
    };

    const getIcon = () => {
        const notificationType = notification.type as
            | keyof typeof CONFIG.NOTIFICATION_PARAMS
            | undefined;
        return CONFIG.NOTIFICATION_PARAMS[notificationType ?? "info"].icon;
    };

    const getColors = () => {
        const notificationType = notification.type as
            | keyof typeof CONFIG.NOTIFICATION_PARAMS
            | undefined;
        return CONFIG.NOTIFICATION_PARAMS[notificationType ?? "info"];
    };

    const colors = getColors();

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <View style={[styles.notification, { backgroundColor: colors.bg }]}>
                <View style={styles.content}>
                    <View
                        style={[
                            styles.iconContainer,
                            { backgroundColor: colors.iconColor },
                        ]}
                    >
                        <Text style={[styles.icon, { color: colors.bg }]}>{getIcon()}</Text>
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            {notification.title}
                        </Text>
                        <Text style={[styles.message, { color: colors.text }]}>
                            {notification.message}
                        </Text>
                    </View>

                    {notification.type !== "confirm" && (
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {notification.type === "confirm" && (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel} >
                            <Text style={styles.cancelButtonText}>
                                {notification.cancelText || "Cancelar"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleConfirm} >
                            <Text style={styles.confirmButtonText}>
                                {notification.confirmText || "Confirmar"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Animated.View>
    );
};
