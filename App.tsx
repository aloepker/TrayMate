import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importing screen files
import HomeScreen from './src/screens/homeScreen';
import AddResidentScreen from './src/screens/addNewResidentScreen';
import BrowseMealOptionsScreen from './src/screens/browseMealOptionsScreen';
import LoginScreen from './src/screens/loginScreen';
import AddMealOptionsScreen from './src/screens/kitchenAddMealOptionsScreen';
import EditResidentListScreen from './src/screens/editResidentListScreen';
import ResidentInfoEditScreen from './src/screens/residentInfoEditScreen';
import UpcomingMealsScreen from './src/screens/upcomingMealsScreen';



const Stack = createStackNavigator();
// Adding them to the navigation stack
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AddResident" component={AddResidentScreen} />
        <Stack.Screen name="BrowseMealOptions" component={BrowseMealOptionsScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AddMealOptions" component={AddMealOptionsScreen} />
        <Stack.Screen name="EditResidentList" component={EditResidentListScreen} />
        <Stack.Screen name="ResidentInfoEdit" component={ResidentInfoEditScreen} />
        <Stack.Screen name="UpcomingMeals" component={UpcomingMealsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}