import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import your screen files
import HomeScreen from './src/screens/homeScreen';
import AddResidentScreen from './src/screens/addNewResidentScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AddResident" component={AddResidentScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}