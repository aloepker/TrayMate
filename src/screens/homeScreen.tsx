import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
//this is the call for the global styling file
import { globalStyles } from '../styles/styles';

const HomeScreen = ({ navigation }: any) => {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Home Screen / Test switchboard</Text>
      
      {/* First Row: 3 Buttons */}
      <View style={[globalStyles.buttonRow, { marginBottom: 12 }]}>
        <TouchableOpacity style={globalStyles.homeButtons} onPress={() => navigation.navigate('AddResident')}>
          <Text style={globalStyles.buttonText}>Add Resident</Text>
        </TouchableOpacity>

        <TouchableOpacity style={globalStyles.homeButtons} onPress={() => navigation.navigate('BrowseMealOptions')}>
          <Text style={globalStyles.buttonText}>Browse Meals</Text>
        </TouchableOpacity>

        <TouchableOpacity style={globalStyles.homeButtons} onPress={() => navigation.navigate('Login')}>
          <Text style={globalStyles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>

      {/* Second Row: 4 Buttons */}
      <View style={globalStyles.buttonRow}>
        <TouchableOpacity style={globalStyles.homeButtons} onPress={() => navigation.navigate('AddMealOptions')}>
          <Text style={globalStyles.buttonText}>Add Meals</Text>
        </TouchableOpacity>

        <TouchableOpacity style={globalStyles.homeButtons} onPress={() => navigation.navigate('EditResidentList')}>
          <Text style={globalStyles.buttonText}>Edit List</Text>
        </TouchableOpacity>

        <TouchableOpacity style={globalStyles.homeButtons} onPress={() => navigation.navigate('ResidentInfoEdit')}>
          <Text style={globalStyles.buttonText}>Edit Info</Text>
        </TouchableOpacity>

        <TouchableOpacity style={globalStyles.homeButtons} onPress={() => navigation.navigate('UpcomingMeals')}>
          <Text style={globalStyles.buttonText}>Upcoming</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


export default HomeScreen;