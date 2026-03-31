import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import context providers
import { CartProvider } from './src/screens/context/CartContext';
import { SettingsProvider } from './src/screens/context/SettingsContext';
import { KitchenMessageProvider } from './src/screens/context/KitchenMessageContext';

// Importing screen files
import HomeScreen from './src/screens/homeScreen';
import BrowseMealOptionsScreen from './src/screens/browseMealOptionsScreen';
import CartScreen from './src/screens/CartScreen';
import LoginScreen from './src/screens/loginScreen';
import UpcomingMealsScreen from './src/screens/upcomingMealsScreen';
import SettingsScreen from './src/screens/SettingsScreens';
import AIMealAssistantScreen from './src/screens/aiMealAssistantScreen';
import AdminDashboardScreen from './src/screens/admin/adminDashboardScreen';
import KitchenBoardScreen from './src/screens/kitchen/kitchenBoardScreen';
import KitchenDashboardScreen from './src/screens/kitchen/KitchenDashboard';

//Caregiver dashboard screen
import CaregiverDashboardScreen from './src/screens/caregiver/caregiverDashboardScreen';

const Stack = createStackNavigator();

// Adding them to the navigation stack
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SettingsProvider>
      <KitchenMessageProvider>
        <CartProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{
                headerShown: false, // Hide default header for all screens
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="BrowseMealOptions" component={BrowseMealOptionsScreen} />
              <Stack.Screen name="Cart" component={CartScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="UpcomingMeals" component={UpcomingMealsScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="AIMealAssistant" component={AIMealAssistantScreen} />
              <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
              <Stack.Screen name="CaregiverDashboard" component={CaregiverDashboardScreen} />
              <Stack.Screen name="KitchenBoard" component={KitchenBoardScreen} />
              <Stack.Screen name="KitchenDashboard" component={KitchenDashboardScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>
      </KitchenMessageProvider>
    </SettingsProvider>
    </GestureHandlerRootView>
  );
}
