import React from 'react';
import { 
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

const ResidentForm = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Text style={styles.header}>Add New Resident</Text>

        <ScrollView contentContainerStyle={styles.formContainer}>
          {/* Row 1: Names */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>First Name*</Text>
              <TextInput style={styles.input} placeholder="John" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Middle Name</Text>
              <TextInput style={styles.input} placeholder="B." />
            </View>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Last Name*</Text>
              <TextInput style={styles.input} placeholder="Doe" />
            </View>
          </View>

          {/* Row 2: Personal Details */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth*</Text>
              <TextInput style={styles.input} placeholder="MM/DD/YYYY" />
            </View>
            <View style={styles.inputGroup}>
// needs to be a drop down menu for gender I think, right??            
              <Text style={styles.label}>Gender*</Text>
              <TextInput style={styles.input} placeholder="Select Gender" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Resident ID*</Text>
              <TextInput style={styles.input} placeholder="Unique ID" />
            </View>
          </View>

          {/* Row 3: Contact Info */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} keyboardType="email-address" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} keyboardType="phone-pad" />
            </View>
          </View>

          {/* Row 4: Medical Primary */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
 //split into two inputs?             
              <Text style={styles.label}>Emergency Contact & Number*</Text>
              <TextInput style={styles.input} placeholder="Name - (555) 000-0000" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Primary Care Doctor*</Text>
              <TextInput style={styles.input} />
            </View>
          </View>

          {/* Row 5: Medical Details (Large Text) */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Medical Conditions</Text>
            <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={3} />
          </View>

          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Food Allergies*</Text>
              <TextInput style={styles.input} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medications</Text>
              <TextInput style={styles.input} />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Submit Resident</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 24,
    color: '#333',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
  },
  inputGroupFull: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3cff00ff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
});

export default ResidentForm;