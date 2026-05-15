import React, { useState } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import Icon from "react-native-vector-icons/Entypo";
import ThemeIcon from "react-native-vector-icons/FontAwesome";
import { useAppTheme } from "../theme/ThemeContext";

const TABS = [
  { label: "Main", route: "Main", icon: "home" },
  { label: "Orders", route: "Orders", icon: "shopping-cart" },
  { label: "Inventory", route: "Inventory", icon: "box" },
  { label: "Tenants", route: "Tenants", icon: "users" },
  { label: "Borrowers", route: "Borrowers", icon: "wallet" },
];

export default function Nav() {
  const navigation = useNavigation();
  const [activeIndex, setActiveIndex] = useState(0);
  const { colors, name, toggleTheme } = useAppTheme();
  const handlePress = (index: number, route: string) => {
    setActiveIndex(index);
    navigation.navigate(route as never);
  };

  return (
    <>
      <TouchableOpacity
        accessibilityLabel="Toggle theme"
        accessibilityRole="button"
        onPress={toggleTheme}
        style={{
          position: "absolute",
          right: 14,
          top: 12,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 16,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
          height: 40,
          width: 40,
          zIndex: 20,
        }}
      >
        <ThemeIcon
          name={name === "dark" ? "sun-o" : "moon-o"}
          size={19}
          color={colors.accent}
        />
      </TouchableOpacity>
      <View
        style={{
          flexDirection: "row",
          height: 60,
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 58,
          flex: 1,
          width: "auto",
          backgroundColor: colors.nav,
          borderColor: colors.border,
        //   borderWidth: 0.3,
          borderRadius: 8,
          
        }}
      >
        {/* <View
          style={[
            {
              position: "absolute",
              width: width / (TABS.length+1),
              bottom: 0,
              height: "100%",
              backgroundColor: "#231512",
              borderRadius: 12,
            },
          ]}
        /> */}

        {TABS.map((tab, index) => {
          const isActive = activeIndex === index;
          const activeTextColor = name === "dark" ? "#110702" : "#fff";

          return (
            <View key={tab.route} style={{ flex: 1, 
                 position: "relative",
                top: 0,
                width: `${100 / TABS.length}%`,
                height: "100%",
                backgroundColor: isActive ? colors.navActive : "transparent",
                borderRadius:isActive ? 6 : 0,
             }}>
            <TouchableOpacity
              key={tab.route}
              onPress={() => handlePress(index, tab.route)}
              style={{
                flex: 1,
               borderRadius: 6,
                alignItems: "center",
              }}
            >
              <Icon
                name={tab.icon}
                size={24}
                color={isActive && name === "dark" ? "#110702" : "#f1e5ac"}
                style={{ position: "relative", top: 6 }}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  fontFamily: "Nippo-Medium",
                  fontSize: 13,
                  paddingTop: 5,
                  color: isActive ? activeTextColor : colors.text,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity></View>
          );
        })}
      </View>
    </>
  );
}
