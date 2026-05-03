import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/Entypo";
import { DashBoard } from "../DashBoard/DashBoard";

const { width } = Dimensions.get("window");
const TAB_WIDTH = width / 4;

const TABS = ["Home", "Orders", "Cart", "Profile"];

export default function Nav() {
  const navigation = useNavigation();
  const [activeIndex, setActiveIndex] = useState(0);

  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(activeIndex * TAB_WIDTH, {
      duration: 250,
    });
  }, [activeIndex]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePress = (index: number, route: string) => {
    setActiveIndex(index);
    navigation.navigate(route as never);
  };

  return (
    <View style={{ flex: 1 }}>


      {/* 🔹 Bottom Nav */}
      <View
        style={{
          flexDirection: "row",
          height: 65,
          backgroundColor: "#fff",
          elevation: 10,
        }}
      >
        {/* Sliding Indicator */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: TAB_WIDTH,
              height: "100%",
              backgroundColor: "#e6f0ff",
              borderRadius: 12,
            },
            animatedStyle,
          ]}
        />

        {TABS.map((tab, index) => {
          let iconName = "home";
          if (tab === "Home") iconName = "home";
          else if (tab === "Orders") iconName = "list";
          else if (tab === "Items") iconName = "shopping-cart";
          else if (tab === "Profile") iconName = "user";

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => handlePress(index, tab)}
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon
                name={iconName}
                size={24}
                color={activeIndex === index ? "#fcc01e" : "gray"}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}