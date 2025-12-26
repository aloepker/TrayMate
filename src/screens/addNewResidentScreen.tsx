import React, { useState } from 'react';
import { 
  Alert,
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { globalStyles } from '../styles/styles';

const ResidentForm = ({ navigation }: any) => {
  // 1. STATE FOR ALL FIELDS
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '', 
    lastName: '',
    dob: '', // We store the display string here
    gender: '',
    residentId: '',
    email: '',      
    phone: '',      
    emergencyContact: '',
    emergencyPhone: '',
    doctor: '',
    doctorPhone: '',
    medicalConditions: '', 
    foodAllergies: '',
    medications: '' 
  });

  // Date Picker Specific State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper to update state
  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  // Date Selection Handler
  const onDateChange = (event: any, selectedDate?: Date) => {
    // Android requires hiding the picker immediately
    setShowDatePicker(false);
    
    if (selectedDate) {
      setCurrentDate(selectedDate);
      // Format: MM/DD/YYYY
      const formattedDate = selectedDate.toLocaleDateString();
      updateField('dob', formattedDate);
    }
  };

  const handleBackPress = () => {
    Alert.alert("Are you sure?", "Entered information will be deleted", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", onPress: () => navigation.goBack() }
    ]);
  };

  // 2. VALIDATION (Only runs when button is clicked)
  const handleSubmit = () => {
    const requiredFields = [
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
      { key: 'residentId', label: 'Resident ID' },
      { key: 'emergencyContact', label: 'Emergency Contact' },
      { key: 'emergencyPhone', label: 'Emergency Phone Number' },
      { key: 'doctor', label: 'Primary Care Doctor' },
      { key: 'doctorPhone', label: "Doctor's Phone Number" },
      { key: 'foodAllergies', label: 'Food Allergies' },
    ];

    const missingFields = requiredFields
      .filter(field => !formData[field.key as keyof typeof formData].trim())
      .map(field => field.label);

    if (missingFields.length > 0) {
      Alert.alert(
        "Missing Required Fields",
        "Please fill out the following:\n\n- " + missingFields.join('\n- ')
      );
      return;
    }

    console.log("Success! Data:", formData);
    Alert.alert("Success", "Resident Saved.");
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Text style={globalStyles.header}>Add New Resident</Text>

        <ScrollView contentContainerStyle={globalStyles.formContainer}>
          {/* Row 1: Names */}
          <View style={globalStyles.row}>
            <View style={[globalStyles.inputGroup, { flex: 2 }]}>
              <Text style={globalStyles.label}>First Name*</Text>
              <TextInput style={globalStyles.input} value={formData.firstName} onChangeText={(v) => updateField('firstName', v)} placeholder="John" />
            </View>
            <View style={[globalStyles.inputGroup, { flex: 1 }]}>
              <Text style={globalStyles.label}>Middle Name</Text>
              <TextInput style={globalStyles.input} value={formData.middleName} onChangeText={(v) => updateField('middleName', v)} placeholder="B." />
            </View>
            <View style={[globalStyles.inputGroup, { flex: 2 }]}>
              <Text style={globalStyles.label}>Last Name*</Text>
              <TextInput style={globalStyles.input} value={formData.lastName} onChangeText={(v) => updateField('lastName', v)} placeholder="Doe" />
            </View>
          </View>

          {/* Row 2: Personal Details */}
          <View style={globalStyles.row}>
            {/* DATE OF BIRTH DROPDOWN/MENU */}
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Date of Birth*</Text>
              <TouchableOpacity 
                style={globalStyles.input} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ marginTop: 5, color: formData.dob ? '#000' : '#C7C7CD' }}>
                  {formData.dob || "Select Date"}
                </Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={currentDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()} // Can't be born in the future
                />
              )}
            </View>

            <View style={globalStyles.inputGroup}>      
              <Text style={globalStyles.label}>Gender*</Text>
              <TextInput style={globalStyles.input} value={formData.gender} onChangeText={(v) => updateField('gender', v)} placeholder="Select Gender" />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Resident ID*</Text>
              <TextInput style={globalStyles.input} value={formData.residentId} onChangeText={(v) => updateField('residentId', v)} placeholder="Unique ID" />
            </View>
          </View>

          {/* Row 3: Contact Info */}
          <View style={globalStyles.row}>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Email</Text>
              <TextInput style={globalStyles.input} value={formData.email} onChangeText={(v) => updateField('email', v)} keyboardType="email-address" />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Phone</Text>
              <TextInput style={globalStyles.input} value={formData.phone} onChangeText={(v) => updateField('phone', v)} keyboardType="phone-pad" />
            </View>
          </View>

          {/* Row 4: Medical Primary */}
          <View style={globalStyles.row}>
            <View style={[globalStyles.inputGroup]}>
              <Text style={globalStyles.label}>Emergency Contact*</Text>
              <TextInput style={globalStyles.input} value={formData.emergencyContact} onChangeText={(v) => updateField('emergencyContact', v)} />
            </View>
            <View style={[globalStyles.inputGroup]}>
              <Text style={globalStyles.label}>Emergency Phone*</Text>
              <TextInput style={globalStyles.input} value={formData.emergencyPhone} onChangeText={(v) => updateField('emergencyPhone', v)} placeholder="(555) 000-0000" />
            </View>
          </View>

          <View style={globalStyles.row}>
            <View style={[globalStyles.inputGroup]}>
              <Text style={globalStyles.label}>Primary Care Doctor*</Text>
              <TextInput style={globalStyles.input} value={formData.doctor} onChangeText={(v) => updateField('doctor', v)} />
            </View>
            <View style={[globalStyles.inputGroup]}>
              <Text style={globalStyles.label}>Doctor's Phone Number*</Text>
              <TextInput style={globalStyles.input} value={formData.doctorPhone} onChangeText={(v) => updateField('doctorPhone', v)} />
            </View>
          </View>

          {/* Row 5: Medical Details */}
          <View style={globalStyles.inputGroupFull}>
            <Text style={globalStyles.label}>Medical Conditions</Text>
            <TextInput 
              style={[globalStyles.input, globalStyles.textArea]} 
              value={formData.medicalConditions} 
              onChangeText={(v) => updateField('medicalConditions', v)} 
              multiline numberOfLines={3} 
            />
          </View>

          <View style={globalStyles.row}>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Food Allergies*</Text>
              <TextInput style={globalStyles.input} value={formData.foodAllergies} onChangeText={(v) => updateField('foodAllergies', v)} />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Medications</Text>
              <TextInput style={globalStyles.input} value={formData.medications} onChangeText={(v) => updateField('medications', v)} />
            </View>
          </View>
        </ScrollView>

        <View style={globalStyles.footer}>
          <TouchableOpacity style={globalStyles.backButton} onPress={handleBackPress}>
            <Text style={globalStyles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={globalStyles.submitButton} onPress={handleSubmit}>
            <Text style={globalStyles.submitButtonText}>Submit Resident</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ResidentForm;