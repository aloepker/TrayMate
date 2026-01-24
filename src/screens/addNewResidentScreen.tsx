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
  // 1. STATE
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

  const [errors, setErrors] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.includes(field)) {
      setErrors(prev => prev.filter(item => item !== field));
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

  const handleSubmit = async () => {
    // UPDATED VALIDATION: email is now required, residentId is NOT.
    const requiredFields = [
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
      { key: 'email', label: 'Email' },
      { key: 'emergencyContact', label: 'Emergency Contact' },
      { key: 'emergencyPhone', label: 'Emergency Phone Number' },
      { key: 'doctor', label: 'Primary Care Doctor' },
      { key: 'doctorPhone', label: "Doctor's Phone Number" },
      { key: 'foodAllergies', label: 'Food Allergies' },
    ];

    const missingFieldKeys = requiredFields
      .filter(field => !formData[field.key as keyof typeof formData]?.trim())
      .map(field => field.key);

    if (missingFieldKeys.length > 0) {
      setErrors(missingFieldKeys);
      Alert.alert("Missing Fields", "Please fill out the highlighted fields.");
      return;
    }

    const jsonToSend = JSON.stringify({
        ...formData,
        email: formData.email.toLowerCase().trim(),
        // Adding trims to important strings
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim()
    });

    try {
      const response = await fetch('https://traymate-auth.onrender.com/admin/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonToSend,
      });

      console.log("Response Status:", response.status);
      const responseText = await response.text();

      if (response.ok) {
        Alert.alert("Success", "Resident Saved.");
        navigation.goBack();
      } else {
        Alert.alert("Server Error", `Status ${response.status}: ${responseText || "Unknown Error"}`);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Network Error", error?.message || "Check your connection.");
    } 
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Text style={globalStyles.header}>Add New Resident</Text>

        <ScrollView contentContainerStyle={globalStyles.formContainer}>
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

          <View style={globalStyles.row}>
            <View style={globalStyles.inputGroup}>
              <Text style={getLabelStyle('dob')}>Date of Birth*</Text>
              <TouchableOpacity style={globalStyles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={{ marginTop: 5, color: formData.dob ? '#000' : '#C7C7CD' }}>{formData.dob || "Select Date"}</Text>
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
              <TextInput style={globalStyles.input} value={formData.gender} onChangeText={(v) => updateField('gender', v)} placeholder="Gender" />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Resident ID</Text>
              <TextInput style={globalStyles.input} value={formData.residentId} onChangeText={(v) => updateField('residentId', v)} placeholder="Optional" />
            </View>
          </View>

          <View style={globalStyles.row}>
            <View style={globalStyles.inputGroup}>
              <Text style={getLabelStyle('email')}>Email*</Text>
              <TextInput style={globalStyles.input} value={formData.email} onChangeText={(v) => updateField('email', v)} keyboardType="email-address" />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Phone</Text>
              <TextInput style={globalStyles.input} value={formData.phone} onChangeText={(v) => updateField('phone', v)} keyboardType="phone-pad" />
            </View>
          </View>

          <View style={globalStyles.row}>
            <View style={globalStyles.inputGroup}>
              <Text style={getLabelStyle('emergencyContact')}>Emergency Contact*</Text>
              <TextInput style={globalStyles.input} value={formData.emergencyContact} onChangeText={(v) => updateField('emergencyContact', v)} />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={getLabelStyle('emergencyPhone')}>Emergency Phone*</Text>
              <TextInput style={globalStyles.input} value={formData.emergencyPhone} onChangeText={(v) => updateField('emergencyPhone', v)} />
            </View>
          </View>

          <View style={globalStyles.row}>
            <View style={globalStyles.inputGroup}>
              <Text style={getLabelStyle('doctor')}>Primary Care Doctor*</Text>
              <TextInput style={globalStyles.input} value={formData.doctor} onChangeText={(v) => updateField('doctor', v)} />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={getLabelStyle('doctorPhone')}>Doctor's Phone*</Text>
              <TextInput style={globalStyles.input} value={formData.doctorPhone} onChangeText={(v) => updateField('doctorPhone', v)} />
            </View>
          </View>

          <View style={globalStyles.inputGroupFull}>
            <Text style={globalStyles.label}>Medical Conditions</Text>
            <TextInput style={[globalStyles.input, globalStyles.textArea]} value={formData.medicalConditions} onChangeText={(v) => updateField('medicalConditions', v)} multiline numberOfLines={3} />
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