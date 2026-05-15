// import FontAwesomeFreeSolid from "@react-native-vector-icons/fontawesome-free-solid";
// import Icon from '@react-native-vector-icons/entypo';
import React from "react";
import { View, StyleSheet } from "react-native";
// @ts-ignore
import Icon from 'react-native-vector-icons/Entypo';
import { useAppTheme } from "../theme/ThemeContext";

export function DashBoard() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* <FontAwesomeFreeSolid name="home" size={64} color="#f1e5ac" style={{ marginBottom: 20 }} /> */}
        {/* <Icon name="house" color="#f1e5ac" size={20} /> */}
<Icon name="home" size={40} color="#f1e5ac" />
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
    fontFamily: "Nippo-Medium",
    fontWeight: "400",
    marginBottom: 10,
    color: "#231512",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Nippo-Medium",
    textAlign: "center",
    color: "#333",
    marginBottom: 30,
  },
  card: {
    width: "100%",
    backgroundColor: "#f1e5ac",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Nippo-Medium",
    fontWeight: "400",
  },
});
