import React from 'react';
import 'react-native-gesture-handler';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// 1. Import your new Clock Provider
import { ClockProvider } from './src/context/ClockContext';

// Import existing context providers
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
import OrderHistoryScreen from './src/screens/OrderHistoryScreen';
import DietaryAuditScreen from './src/screens/DietaryAuditScreen';
import MyOverridesScreen from './src/screens/MyOverridesScreen';
import AIMealAssistantScreen from './src/screens/aiMealAssistantScreen';
import AdminDashboardScreen from './src/screens/admin/adminDashboardScreen';
import PendingOverridesScreen from './src/screens/admin/PendingOverridesScreen';
import KitchenDashboardScreen from './src/screens/kitchen/KitchenDashboard';

//Caregiver dashboard screen
import CaregiverDashboardScreen from './src/screens/caregiver/caregiverDashboardScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ClockProvider is at the top so it runs globally */}
      <ClockProvider>
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
                  <Stack.Screen name="PendingOverrides" component={PendingOverridesScreen} />
                  <Stack.Screen name="CaregiverDashboard" component={CaregiverDashboardScreen} />
                  <Stack.Screen name="KitchenDashboard" component={KitchenDashboardScreen} />
                  <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
                  <Stack.Screen name="DietaryAudit" component={DietaryAuditScreen} />
                  <Stack.Screen name="MyOverrides" component={MyOverridesScreen} />
                </Stack.Navigator>
              </NavigationContainer>
            </CartProvider>
          </KitchenMessageProvider>
        </SettingsProvider>
      </ClockProvider>
    </GestureHandlerRootView>
  );
}
