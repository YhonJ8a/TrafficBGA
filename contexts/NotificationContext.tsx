import React, { createContext, useCallback, useContext, useState } from "react";
import { NotificationComponent } from "./NotificationComponent";
export type NotificationType =
    | "success"
    | "error"
    | "warning"
    | "info"
    | "confirm";

export interface NotificationConfig {
    type: NotificationType;
    title: string;
    message: string;
    duration?: number;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

interface NotificationContextType {
    showNotification: (config: NotificationConfig) => void;
    showSuccess: (title: string, message: string, duration?: number) => void;
    showError: (title: string, message: string, duration?: number) => void;
    showWarning: (title: string, message: string, duration?: number) => void;
    showInfo: (title: string, message: string, duration?: number) => void;
    showConfirm: (
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel?: () => void,
    ) => void;
    hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
    undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [notification, setNotification] = useState<NotificationConfig | null>(
        null,
    );

    const showNotification = useCallback((config: NotificationConfig) => {
        setNotification(config);

        if (config.type !== "confirm" && config.duration !== 0) {
            setTimeout(() => {
                setNotification(null);
            }, config.duration || 3000);
        }
    }, []);

    const hideNotification = useCallback(() => {
        setNotification(null);
    }, []);

    const showSuccess = useCallback(
        (title: string, message: string, duration?: number) => {
            showNotification({ type: "success", title, message, duration });
        },
        [showNotification],
    );

    const showError = useCallback(
        (title: string, message: string, duration?: number) => {
            showNotification({ type: "error", title, message, duration });
        },
        [showNotification],
    );

    const showWarning = useCallback(
        (title: string, message: string, duration?: number) => {
            showNotification({ type: "warning", title, message, duration });
        },
        [showNotification],
    );

    const showInfo = useCallback(
        (title: string, message: string, duration?: number) => {
            showNotification({ type: "info", title, message, duration });
        },
        [showNotification],
    );

    const showConfirm = useCallback(
        (
            title: string,
            message: string,
            onConfirm: () => void,
            onCancel?: () => void,
        ) => {
            showNotification({
                type: "confirm",
                title,
                message,
                onConfirm,
                onCancel,
                duration: 0,
            });
        },
        [showNotification],
    );

    return (
        <NotificationContext.Provider
            value={{
                showNotification,
                showSuccess,
                showError,
                showWarning,
                showInfo,
                showConfirm,
                hideNotification,
            }}
        >
            {children}
            {notification && (
                <NotificationComponent
                    notification={notification}
                    onClose={hideNotification}
                />
            )}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotification must be used within NotificationProvider");
    }
    return context;
};
