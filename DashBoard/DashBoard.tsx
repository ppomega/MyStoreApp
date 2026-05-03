// import FontAwesomeFreeSolid from "@react-native-vector-icons/fontawesome-free-solid";
// import Icon from '@react-native-vector-icons/entypo';
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
// @ts-ignore
import Icon from 'react-native-vector-icons/Entypo';
export function DashBoard() {
  return (
    <View style={styles.container}>
        {/* <FontAwesomeFreeSolid name="home" size={64} color="#fcc01e" style={{ marginBottom: 20 }} /> */}
        {/* <Icon name="house" color="#fcc01e" size={20} /> */}
<Icon name="home" size={40} color="#fcc01e" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffdf5",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#333",
    marginBottom: 30,
  },
  card: {
    width: "100%",
    backgroundColor: "#fcc01e",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
});
