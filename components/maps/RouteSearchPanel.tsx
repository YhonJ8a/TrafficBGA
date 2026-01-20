import { styles } from '@/style/styles';
import { Place, RouteInfo } from '@/types/maps';
import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export function RouteSearchPanel(props: {
    originInput: string;
    destinationInput: string;
    originSuggestions: Place[];
    destinationSuggestions: Place[];
    originError: string | null;
    destinationError: string | null;
    routeError: string | null;
    routeInfo: RouteInfo | null;
    loading: boolean;
    canCalculate: boolean;
    onChangeOrigin: (text: string) => void;
    onChangeDestination: (text: string) => void;
    onSelectOrigin: (place: Place) => void;
    onSelectDestination: (place: Place) => void;
    onCalculateRoute: () => void;
    onClear: () => void;
    onClose: () => void;
}) {
    return (
        <View style={styles.routeSearchContainerCP}>
            <View style={styles.searchHeader}>
                <Text style={styles.searchTitle}>Buscar Ruta</Text>
                <TouchableOpacity onPress={props.onClose}>
                    <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Origen:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Escribe el lugar de origen"
                    value={props.originInput}
                    onChangeText={props.onChangeOrigin}
                />
                {!!props.originError && <Text style={styles.errorText}>{props.originError}</Text>}
                {props.originSuggestions.length > 0 && (
                    <ScrollView style={styles.suggestionsContainer}>
                        {props.originSuggestions.map((place) => (
                            <TouchableOpacity
                                key={place.place_id}
                                style={styles.suggestionItem}
                                onPress={() => props.onSelectOrigin(place)}
                            >
                                <Text style={styles.suggestionText}>{place.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Destino:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Escribe el lugar de destino"
                    value={props.destinationInput}
                    onChangeText={props.onChangeDestination}
                />
                {!!props.destinationError && <Text style={styles.errorText}>{props.destinationError}</Text>}
                {props.destinationSuggestions.length > 0 && (
                    <ScrollView style={styles.suggestionsContainer}>
                        {props.destinationSuggestions.map((place) => (
                            <TouchableOpacity
                                key={place.place_id}
                                style={styles.suggestionItem}
                                onPress={() => props.onSelectDestination(place)}
                            >
                                <Text style={styles.suggestionText}>{place.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.routeButton, styles.calculateButton]}
                    onPress={props.onCalculateRoute}
                    disabled={!props.canCalculate}
                >
                    {props.loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Calcular Ruta</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.routeButton, styles.clearButton]}
                    onPress={props.onClear}
                >
                    <Text style={styles.buttonText}>Limpiar</Text>
                </TouchableOpacity>
            </View>

            {!!props.routeError && <Text style={styles.errorText}>{props.routeError}</Text>}

            {props.routeInfo && (
                <View style={styles.routeInfo}>
                    <Text style={styles.routeInfoText}>📍 Distancia: {props.routeInfo.distance}</Text>
                    <Text style={styles.routeInfoText}>⏱️ Duración: {props.routeInfo.duration}</Text>
                </View>
            )}
        </View>
    );
}
