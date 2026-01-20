import { StyleSheet } from "react-native";

import ManagerMap from "@/components/ManagerMap";
import { View } from "@/components/Themed";

export default function TabOneScreen() {
  return (
    <View style={styles.container}>
      {/* <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
            <EditScreenInfo path="app/(tabs)/index.tsx" /> */}
      <View style={styles.mapContainer}>
        <ManagerMap />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
  mapContainer: {
    width: "100%",
    height: "100%",
  },
});
