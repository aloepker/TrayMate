import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import the CartProvider
import { CartProvider } from './src/screens/context/CartContext';

// Importing screen files
import HomeScreen from './src/screens/homeScreen';
import AddResidentScreen from './src/screens/addNewResidentScreen';
import BrowseMealOptionsScreen from './src/screens/browseMealOptionsScreen';
import CartScreen from './src/screens/CartScreen';
import LoginScreen from './src/screens/loginScreen';
import AddMealOptionsScreen from './src/screens/addMealOptionsScreen';
import EditResidentListScreen from './src/screens/editResidentListScreen';
import ResidentInfoEditScreen from './src/screens/residentInfoEditScreen';
import UpcomingMealsScreen from './src/screens/upcomingMealsScreen';
import SettingsScreen from './src/screens/SettingsScreens';
import AIMealAssistantScreen from './src/screens/aiMealAssistantScreen';

const Stack = createStackNavigator();

// Adding them to the navigation stack
export default function App() {
  return (
    <CartProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Home"
          screenOptions={{
            headerShown: false, // Hide default header for all screens
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="AddResident" component={AddResidentScreen} />
          <Stack.Screen name="BrowseMealOptions" component={BrowseMealOptionsScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="AddMealOptions" component={AddMealOptionsScreen} />
          <Stack.Screen name="EditResidentList" component={EditResidentListScreen} />
          <Stack.Screen name="ResidentInfoEdit" component={ResidentInfoEditScreen} />
          <Stack.Screen name="UpcomingMeals" component={UpcomingMealsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="AIMealAssistant" component={AIMealAssistantScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}