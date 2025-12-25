import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
//this is the call for the global styling file
import { globalStyles } from '../styles/styles';

// The 'navigation' prop is automatically passed by the Stack Navigator in App.tsx
const EditResidentList = ({ navigation }: any) => {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Back</Text>
      
      <TouchableOpacity 
        style={globalStyles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={globalStyles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};


export default EditResidentList;