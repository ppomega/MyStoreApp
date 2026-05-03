import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import Icon from "react-native-vector-icons/Entypo";
const TABS = ["Main", "Orders", "Inventory", "Profile"];

export default function Nav() {
  const navigation = useNavigation();
  const [activeIndex, setActiveIndex] = useState(0);
  const handlePress = (index: number, route: string) => {
    setActiveIndex(index);
    navigation.navigate(route as never);
  };

  return (

      <View
        style={{
          flexDirection: "row",
          height: 55,
          position: "absolute",
          left: 20,
          bottom:65,
          flex: 1,
          width:"90%",
          backgroundColor: "#f8f2e2",
          borderColor: "#000",
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
          let iconName = "home";
          if (tab === "Home") iconName = "home";
          else if (tab === "Orders") iconName = "shopping-cart";
          else if (tab === "Inventory") iconName = "box";
          else if (tab === "Profile") iconName = "user";

          return (
            <View key={tab} style={{ flex: 1, 
                 position: "relative",
                top: 0,
                width: "25%",
                height: "100%",
                backgroundColor: activeIndex === index ? "#000" : "transparent",
                borderRadius:activeIndex === index ? 12 : 0,
             }}>
            <TouchableOpacity
              key={tab}
              onPress={() => handlePress(index, tab)}
              style={{
                flex: 1,
               borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Icon
                name={iconName}
                size={24}
                color={ "#fcc01e" }
                style={{ position: "relative", top: 6 }}
              />
              <Text style={{ fontSize: 12,paddingTop: 6, color:activeIndex === index ? "#fff" : "#000" }}>{tab}</Text>
            </TouchableOpacity></View>
          );
        })}
      </View>
  );
}