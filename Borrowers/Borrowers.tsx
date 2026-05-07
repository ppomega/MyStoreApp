import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/Entypo";
import { useAppTheme } from "../theme/ThemeContext";

export default function Borrowers() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Icon name="wallet" size={34} color={colors.accent} />
      <Text style={[styles.title, { color: colors.text }]}>Borrowers</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        No borrowers yet.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontFamily: "JetBrains",
    fontSize: 22,
    marginTop: 12,
  },
  emptyText: {
    fontFamily: "JetBrains",
    fontSize: 13,
    marginTop: 8,
  },
});
