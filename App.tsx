import * as React from 'react';
import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import { DashBoard } from './DashBoard/DashBoard';
import Nav from './Nav/Nav';
import { View } from 'react-native';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: DashBoard
    },
    Profile: {
      screen:DashBoard,
    },
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return  <View style={{ flex: 1 }}>
          <DashBoard />
          <Nav />
        </View> ;
}