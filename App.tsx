import React from "react";
import { Text, TextInput, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import Nav from "./Nav/Nav";
import { DashBoard } from "./DashBoard/DashBoard";
import Inventory from "./Inventory/Inventory";
import Orders from "./Orders/Orders";
import Tenants from "./Tenants/Tenants";
import Borrowers from "./Borrowers/Borrowers";
import { ThemeProvider, useAppTheme } from "./theme/ThemeContext";

const Stack = createNativeStackNavigator();

const defaultTextProps = {
  style: [{ fontFamily: "Nippo-Medium" }],
};

(Text as any).defaultProps = {
  ...((Text as any).defaultProps || {}),
  ...defaultTextProps,
};

(TextInput as any).defaultProps = {
  ...((TextInput as any).defaultProps || {}),
  style: [{ fontFamily: "Nippo-Medium" }],
};

function AppShell() {
  const { colors, fonts, name } = useAppTheme();
  const navigationTheme = {
    dark: name === "dark",
    colors: {
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
    fonts: {
      regular: { fontFamily: fonts.regular, fontWeight: "400" as const },
      medium: { fontFamily: fonts.regular, fontWeight: "400" as const },
      bold: { fontFamily: fonts.regular, fontWeight: "400" as const },
      heavy: { fontFamily: fonts.regular, fontWeight: "400" as const },
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <SafeAreaView
        edges={["top"]}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View style={{ flex: 1 }}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={DashBoard} />
            <Stack.Screen name="Orders" component={Orders} />
            <Stack.Screen name="Inventory" component={Inventory} />
            <Stack.Screen name="Tenants" component={Tenants} />
            <Stack.Screen name="Borrowers" component={Borrowers} />
          </Stack.Navigator>
          <Nav />
        </View>
      </SafeAreaView>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppShell />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
