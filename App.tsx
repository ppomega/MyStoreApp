import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Nav from "./Nav/Nav";
import { DashBoard } from "./DashBoard/DashBoard";
import Inventory from "./Inventory/Inventory";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>

      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={DashBoard} />
        <Stack.Screen name="Orders" component={DashBoard} />
        <Stack.Screen name="Inventory" component={Inventory} />
        <Stack.Screen name="Profile" component={DashBoard} />
      </Stack.Navigator>
          <Nav/>

    </NavigationContainer>
  );
}