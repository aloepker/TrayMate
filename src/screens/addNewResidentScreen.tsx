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
  Platform,
  Modal,
  StyleSheet
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
  const [showGenderModal, setShowGenderModal] = useState(false); 
  const [currentDate, setCurrentDate] = useState(new Date());

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.includes(field)) {
      setErrors(prev => prev.filter(item => item !== field));
    }
  };

  const selectGender = (val: string) => {
    updateField('gender', val);
    setShowGenderModal(false);
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

  const handleSubmit = async () => {
    const requiredFields = [
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
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

    // Prepare data
    const payload = {
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim()
    };

    const jsonToSend = JSON.stringify(payload);

    // --- NEW DEBUGGING LOGS ---
    console.log("==== API DEBUG START ====");
    console.log("URL:", 'https://traymate-auth.onrender.com/admin/residents');
    console.log("PAYLOAD:", jsonToSend);
    // --------------------------

    try {
      const response = await fetch('https://traymate-auth.onrender.com/admin/residents', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: jsonToSend,
      });

      const responseText = await response.text();
      
      console.log("HTTP STATUS:", response.status);
      console.log("SERVER RESPONSE:", responseText);
      console.log("==== API DEBUG END ====");

      if (response.ok) {
        Alert.alert("Success", "Resident Saved.");
        navigation.goBack();
      } else {
        Alert.alert("Server Error", `Status ${response.status}: ${responseText || "Unknown Error"}`);
      }
    } catch (error: any) {
      console.error("FETCH ERROR:", error);
      Alert.alert("Network Error", error?.message || "Check connection.");
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
              <Text style={globalStyles.label}>M.I.</Text>
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
              <TouchableOpacity style={globalStyles.input} onPress={() => setShowGenderModal(true)}>
                <Text style={{ marginTop: 5, color: formData.gender ? '#000' : '#C7C7CD' }}>{formData.gender || "Select..."}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={globalStyles.row}>
            <View style={globalStyles.inputGroupFull}>
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
              <Text style={getLabelStyle('doctor')}>Doctor*</Text>
              <TextInput style={globalStyles.input} value={formData.doctor} onChangeText={(v) => updateField('doctor', v)} />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={getLabelStyle('doctorPhone')}>Doctor Phone*</Text>
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
          <TouchableOpacity style={globalStyles.backButton} onPress={() => navigation.goBack()}>
            <Text style={globalStyles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={globalStyles.submitButton} onPress={handleSubmit}>
            <Text style={globalStyles.submitButtonText}>Submit Resident</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showGenderModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              {['Male', 'Female', 'Other'].map((item) => (
                <TouchableOpacity key={item} style={styles.option} onPress={() => selectGender(item)}>
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowGenderModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: 'white', borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  option: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  optionText: { fontSize: 16, textAlign: 'center' },
  cancelButton: { marginTop: 10, paddingVertical: 10 },
  cancelText: { color: 'red', textAlign: 'center', fontWeight: 'bold' }
});

export default ResidentForm;