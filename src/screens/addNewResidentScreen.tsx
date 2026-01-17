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
    dob: '', 
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

  // 2. ERROR STATE (Stores keys of missing fields)
  const [errors, setErrors] = useState<string[]>([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper to update state and clear specific error on interaction
  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    
    // If this field currently has an error, remove it from the error list
    if (errors.includes(field)) {
      setErrors(errors.filter(item => item !== field));
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setCurrentDate(selectedDate);
      const formattedDate = selectedDate.toLocaleDateString();
      updateField('dob', formattedDate);
    }
  };

  // 3. STYLE HELPER
  const getLabelStyle = (fieldName: string) => {
    return [
      globalStyles.label, 
      errors.includes(fieldName) && { color: 'red' } 
    ];
  };

  const handleBackPress = () => {
    Alert.alert("Are you sure?", "Entered information will be deleted", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", onPress: () => navigation.goBack() }
    ]);
  };

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

    // Identify which keys are missing
    const missingFieldKeys = requiredFields
      .filter(field => !formData[field.key as keyof typeof formData].trim())
      .map(field => field.key);

    if (missingFieldKeys.length > 0) {
      setErrors(missingFieldKeys); // Update UI to show red text
      Alert.alert(
        "Missing Required Fields",
        "Please fill out the fields highlighted in red."
      );
      return;
    }

    // Success / JSON creation
    const { 
        firstName, middleName, lastName, dob, gender, 
        residentId, email, phone, emergencyContact, 
        emergencyPhone, doctor, doctorPhone, 
        medicalConditions, foodAllergies, medications 
    } = formData;

    const newResidentData = {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        dob: dob,
        gender: gender.trim(),
        residentId: residentId.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        emergencyContact: emergencyContact.trim(),
        emergencyPhone: emergencyPhone.trim(),
        doctor: doctor.trim(),
        doctorPhone: doctorPhone.trim(),
        medicalConditions: medicalConditions.trim(),
        foodAllergies: foodAllergies.trim(),
        medications: medications.trim()
    };

    const jsonToSend = JSON.stringify(newResidentData);
// API Call would go here 
/*
    try {
      const response = await fetch('YOUR_BACKEND_URL_HERE', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': 'Bearer YOUR_TOKEN_IF_NEEDED',
        },
        body: jsonToSend,
      });

      if (response.ok) {
        Alert.alert("Success", "Resident Saved.");
        navigation.goBack();
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.message || "Failed to save to cloud.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Network Error", "Please check your internet connection and try again.");
    } */
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
              <Text style={getLabelStyle('firstName')}>First Name*</Text>
              <TextInput style={globalStyles.input} value={formData.firstName} onChangeText={(v) => updateField('firstName', v)} placeholder="John" />
            </View>
            <View style={[globalStyles.inputGroup, { flex: 1 }]}>
              <Text style={globalStyles.label}>Middle Name</Text>
              <TextInput style={globalStyles.input} value={formData.middleName} onChangeText={(v) => updateField('middleName', v)} placeholder="B." />
            </View>
            <View style={[globalStyles.inputGroup, { flex: 2 }]}>
              <Text style={getLabelStyle('lastName')}>Last Name*</Text>
              <TextInput style={globalStyles.input} value={formData.lastName} onChangeText={(v) => updateField('lastName', v)} placeholder="Doe" />
            </View>
          </View>

          {/* Row 2: Personal Details */}
          <View style={globalStyles.row}>
            <View style={globalStyles.inputGroup}>
              <Text style={getLabelStyle('dob')}>Date of Birth*</Text>
              <TouchableOpacity style={globalStyles.input} onPress={() => setShowDatePicker(true)}>
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
                  maximumDate={new Date()}
                />
              )}
            </View>

            <View style={globalStyles.inputGroup}>      
              <Text style={getLabelStyle('gender')}>Gender*</Text>
              <TextInput style={globalStyles.input} value={formData.gender} onChangeText={(v) => updateField('gender', v)} placeholder="Select Gender" />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={getLabelStyle('residentId')}>Resident ID*</Text>
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
              <Text style={getLabelStyle('emergencyContact')}>Emergency Contact*</Text>
              <TextInput style={globalStyles.input} value={formData.emergencyContact} onChangeText={(v) => updateField('emergencyContact', v)} />
            </View>
            <View style={[globalStyles.inputGroup]}>
              <Text style={getLabelStyle('emergencyPhone')}>Emergency Phone*</Text>
              <TextInput style={globalStyles.input} value={formData.emergencyPhone} onChangeText={(v) => updateField('emergencyPhone', v)} placeholder="(555) 000-0000" />
            </View>
          </View>

          <View style={globalStyles.row}>
            <View style={[globalStyles.inputGroup]}>
              <Text style={getLabelStyle('doctor')}>Primary Care Doctor*</Text>
              <TextInput style={globalStyles.input} value={formData.doctor} onChangeText={(v) => updateField('doctor', v)} />
            </View>
            <View style={[globalStyles.inputGroup]}>
              <Text style={getLabelStyle('doctorPhone')}>Doctor's Phone Number*</Text>
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
              <Text style={getLabelStyle('foodAllergies')}>Food Allergies*</Text>
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