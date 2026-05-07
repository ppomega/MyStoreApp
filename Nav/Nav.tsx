import React, { useState } from "react";
import { Switch, View, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import Icon from "react-native-vector-icons/Entypo";
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
      <View
        style={{
          position: "absolute",
          right: 14,
          bottom: 124,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 999,
          borderWidth: 1,
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: 10,
          paddingRight: 4,
          paddingVertical: 3,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 10,
            fontWeight: "400",
            fontFamily: "JetBrains",
            marginRight: 6,
          }}
        >
          {name === "dark" ? "Dark" : "Light"}
        </Text>
        <Switch
          value={name === "dark"}
          onValueChange={toggleTheme}
          trackColor={{ false: "#d7d2c5", true: "#5f4700" }}
          thumbColor={colors.accent}
        />
      </View>
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
          borderRadius: 12,
          
        }}
      >
        {/* <View
          style={[
            {
              position: "absolute",
              width: width / (TABS.length+1),
              bottom: 0,
              height: "100%",
              backgroundColor: "#000",
              borderRadius: 12,
            },
          ]}
        /> */}

        {TABS.map((tab, index) => {
          const isActive = activeIndex === index;
          const activeTextColor = name === "dark" ? "#000" : "#fff";

          return (
            <View key={tab.route} style={{ flex: 1, 
                 position: "relative",
                top: 0,
                width: `${100 / TABS.length}%`,
                height: "100%",
                backgroundColor: isActive ? colors.navActive : "transparent",
                borderRadius:isActive ? 12 : 0,
             }}>
            <TouchableOpacity
              key={tab.route}
              onPress={() => handlePress(index, tab.route)}
              style={{
                flex: 1,
               borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Icon
                name={tab.icon}
                size={24}
                color={isActive && name === "dark" ? "#000" : "#fcc01e"}
                style={{ position: "relative", top: 6 }}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  fontFamily: "JetBrains",
                  fontSize: 9,
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
