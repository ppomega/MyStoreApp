import React, { useState } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

// Mixed icon sources
import EntypoIcon from "react-native-vector-icons/Entypo";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import IoniconIcon from "react-native-vector-icons/Ionicons";
import FeatherIcon from "react-native-vector-icons/Feather";
import ThemeIcon from "react-native-vector-icons/FontAwesome";

import { useAppTheme } from "../theme/ThemeContext";

// Each tab declares which icon library to use
type IconFamily = "Entypo" | "FontAwesome" | "MaterialIcons" | "Ionicons" | "Feather"|"Lucide";

interface Tab {
  label: string;
  route: string;
  icon: string;
  iconFamily: IconFamily;
}

const TABS: Tab[] = [
  { label: "Main",      route: "Main",      icon: "home",              iconFamily: "Entypo"        },
  { label: "Orders",    route: "Orders",    icon: "shopping-cart",     iconFamily: "FontAwesome"   },
  { label: "Inventory", route: "Inventory", icon: "archive",         iconFamily: "Entypo" },
  { label: "Tenants",   route: "Tenants",   icon: "people-circle",     iconFamily: "Ionicons"      },
  { label: "Borrowers", route: "Borrowers", icon: "credit-card-alt",       iconFamily: "FontAwesome"       },
];

interface TabIconProps {
  family: IconFamily;
  name: string;
  size: number;
  color: string;
}

/** Renders the correct icon component based on the icon family string */
function TabIcon({ family, name, size, color }: TabIconProps) {
  switch (family) {
    case "Entypo":
      return <EntypoIcon name={name} size={size} color={color} />;
    case "FontAwesome":
      return <FontAwesomeIcon name={name} size={size} color={color} />;
    case "MaterialIcons":
      return <MaterialIcon name={name} size={size} color={color} />;
    case "Ionicons":
      return <IoniconIcon name={name} size={size} color={color} />;
    case "Feather":
      return <FeatherIcon name={name} size={size} color={color} />;
    default:
      return <EntypoIcon name={name} size={size} color={color} />;
  }
}

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
      {/* Theme toggle button */}
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

      {/* Bottom navigation bar */}
      <View
        style={{
          flexDirection: "row",
          height: 60,
          position: "absolute",
          bottom: 58,
          flex: 1,
          width: "100%",
          backgroundColor: colors.nav,
          // borderColor: colors.border,
          // borderRadius: 8,
          // borderWidth: 1,
        }}
      >
        {TABS.map((tab, index) => {
          const isActive = activeIndex === index;
          const activeTextColor = name != "dark" ? "#f1e5ac" : "#231512";
          const inactiveIconColor =
name === "dark" ? "#f1e5ac" : "#231512";
          return (
            <View
              key={tab.route}
              style={{
                flex: 1,
                position: "relative",
                top: 0,
                width: `${100 / TABS.length}%`,
                height: "100%",
                backgroundColor: isActive ? colors.navActive : "transparent",
                borderRadius: isActive ? 6 : 0,
              }}
            >
              <TouchableOpacity
                onPress={() => handlePress(index, tab.route)}
                style={{
                  flex: 1,
                  borderRadius: 6,
                  alignItems: "center",
                }}
              >
                {/* Icon rendered from its own library */}
                <View style={{ position: "relative", top: 6 }}>
                  <TabIcon
                    family={tab.iconFamily}
                    name={tab.icon}
                    size={24}
                    color={isActive ? activeTextColor : inactiveIconColor}
                  />
                </View>

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{
                    fontFamily: "Nippo-Medium",
                    fontSize: 12,
                    paddingTop: 5,
                    color: isActive ? activeTextColor : colors.text,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </>
  );
}