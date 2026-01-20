import { styles } from "@/style/styles";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import {
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export function Search(props: {
    originInput: string;
    onChangeOrigin: (text: string) => void;
    originError: string;
    originSuggestions: any[];
    selectOrigin: (place: any) => void;
}) {
    const {
        originInput,
        onChangeOrigin,
        originError,
        originSuggestions,
        selectOrigin,
    } = props;
    return (
        <>
            <View style={{ ...styles.containerContent, flex: 1 }}>
                <View style={styles.inputContainerSearch}>
                    <MaterialCommunityIcons
                        name="map-search"
                        size={30}
                        color="#000000"
                        style={styles.icon}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Cual es tu destino?"
                        value={originInput}
                        onChangeText={onChangeOrigin}
                        placeholderTextColor="#000000"
                        inlineImageLeft="search_icon"
                        cursorColor="#000"
                    />
                    {originInput && (
                        <MaterialIcons
                            name="clear"
                            size={24}
                            color="#ffffff"
                            onPress={() => onChangeOrigin("")}
                            style={styles.inconClear}
                        />
                    )}
                </View>
                {!!originError && <Text style={styles.errorText}>{originError}</Text>}
            </View>
            {originSuggestions.length > 0 && (
                <ScrollView style={styles.suggestionsContainer}>
                    {originSuggestions.map((place) => (
                        <TouchableOpacity
                            key={place.place_id}
                            style={styles.suggestionItem}
                            onPress={() => selectOrigin(place)}
                        >
                            <Text style={styles.suggestionText}>{place.description}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </>
    );
}
