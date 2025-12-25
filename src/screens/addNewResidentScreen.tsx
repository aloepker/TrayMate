import React from 'react';
import { 
  Button,
  Alert,
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
//this is the call for the global styling file
import { globalStyles } from '../styles/styles';

const ResidentForm = ({ navigation }: any) => {

const handlePress = () => {
    Alert.alert(
      "Are you sure?",
      "Entered information will be deleted",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel"
        },
        { 
          text: "Yes", 
          onPress: () => {
            console.log("Yes Pressed");
            navigation.goBack(); // This is the navigation call
          } 
        }
      ]
    );
  };


  return (
    <SafeAreaView style={globalStyles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Text style={globalStyles.header}>Add New Resident</Text>

        <ScrollView contentContainerStyle={globalStyles.formContainer}>
          {/* Row 1: Names */}
          <View style={globalStyles.row}>
            <View style={[globalStyles.inputGroup, { flex: 2 }]}>
              <Text style={globalStyles.label}>First Name*</Text>
              <TextInput style={globalStyles.input} placeholder="John" />
            </View>
            <View style={[globalStyles.inputGroup, { flex: 1 }]}>
              <Text style={globalStyles.label}>Middle Name</Text>
              <TextInput style={globalStyles.input} placeholder="B." />
            </View>
            <View style={[globalStyles.inputGroup, { flex: 2 }]}>
              <Text style={globalStyles.label}>Last Name*</Text>
              <TextInput style={globalStyles.input} placeholder="Doe" />
            </View>
          </View>

          {/* Row 2: Personal Details */}
          <View style={globalStyles.row}>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Date of Birth*</Text>
              <TextInput style={globalStyles.input} placeholder="MM/DD/YYYY" />
            </View>
            <View style={globalStyles.inputGroup}>      
              <Text style={globalStyles.label}>Gender*</Text>
              <TextInput style={globalStyles.input} placeholder="Select Gender" />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Resident ID*</Text>
              <TextInput style={globalStyles.input} placeholder="Unique ID" />
            </View>
          </View>

          {/* Row 3: Contact Info */}
          <View style={globalStyles.row}>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Email</Text>
              <TextInput style={globalStyles.input} keyboardType="email-address" />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Phone</Text>
              <TextInput style={globalStyles.input} keyboardType="phone-pad" />
            </View>
          </View>

          {/* Row 4: Medical Primary */}
          <View style={globalStyles.row}>
            <View style={[globalStyles.inputGroup]}>
              <Text style={globalStyles.label}>Emergency Contact*</Text>
              <TextInput style={globalStyles.input}/>
            </View>
            <View style={[globalStyles.inputGroup]}>
              <Text style={globalStyles.label}>Emergency Contact's Phone Number*</Text>
              <TextInput style={globalStyles.input} placeholder="(555) 000-0000" />
            </View>
            <View style={[globalStyles.inputGroup]}>
              <Text style={globalStyles.label}>Primary Care Doctor*</Text>
              <TextInput style={globalStyles.input}/>
            </View>
            <View style={[globalStyles.inputGroup]}>
              <Text style={globalStyles.label}>Doctor's Phone Number *</Text>
              <TextInput style={globalStyles.input}/>
            </View>
          </View>

          {/* Row 5: Medical Details (Large Text) */}
          <View style={globalStyles.inputGroupFull}>
            <Text style={globalStyles.label}>Medical Conditions</Text>
            <TextInput style={[globalStyles.input, globalStyles.textArea]} multiline numberOfLines={3} />
          </View>

          <View style={globalStyles.row}>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Food Allergies*</Text>
              <TextInput style={globalStyles.input} />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Medications</Text>
              <TextInput style={globalStyles.input} />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={globalStyles.footer}>
          <TouchableOpacity style={globalStyles.backButton} onPress={handlePress}>
            <Text style={globalStyles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={globalStyles.submitButton}>
            <Text style={globalStyles.submitButtonText}>Submit Resident</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );


};


export default ResidentForm;