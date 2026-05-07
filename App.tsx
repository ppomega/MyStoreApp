import React from "react";
import { Text, TextInput } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Nav from "./Nav/Nav";
import { DashBoard } from "./DashBoard/DashBoard";
import Inventory from "./Inventory/Inventory";
import Orders from "./Orders/Orders";
import Tenants from "./Tenants/Tenants";
import Borrowers from "./Borrowers/Borrowers";
import { ThemeProvider, useAppTheme } from "./theme/ThemeContext";

const Stack = createNativeStackNavigator();

const defaultTextProps = {
  style: [{ fontFamily: "JetBrains" }],
};

(Text as any).defaultProps = {
  ...((Text as any).defaultProps || {}),
  ...defaultTextProps,
};

(TextInput as any).defaultProps = {
  ...((TextInput as any).defaultProps || {}),
  style: [{ fontFamily: "JetBrains" }],
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

      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={DashBoard} />
        <Stack.Screen name="Orders" component={Orders} />
        <Stack.Screen name="Inventory" component={Inventory} />
        <Stack.Screen name="Tenants" component={Tenants} />
        <Stack.Screen name="Borrowers" component={Borrowers} />
      </Stack.Navigator>
          <Nav/>

    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
