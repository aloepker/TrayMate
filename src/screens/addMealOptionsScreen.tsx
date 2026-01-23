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
  StyleSheet
} from 'react-native';

const KitchenAddMealOptionsScreen = ({ navigation }: any) => {
  // State for all fields
  const [formData, setFormData] = useState({
    mealName: '',
    ingredients: '', 
    amounts: '',
    description: '',
    image: '',
    mealType: '',
    allergenInfo: ''
  });

  // Helper to update state
  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleBackPress = () => {
    // Check if we can go back
    if (navigation.canGoBack()) {
      Alert.alert("Are you sure?", "Entered information will be deleted", [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => navigation.goBack() }
      ]);
    } else {
      // If we can't go back, navigate to Home
      navigation.navigate('Home');
    }
  };

  // Validation and submit
  const handleSubmit = () => {
    const requiredFields = [
      { key: 'mealName', label: 'Meal Name' },
      { key: 'ingredients', label: 'Ingredients' },
      { key: 'amounts', label: 'Amounts' },
      { key: 'mealType', label: 'Meal Type' }
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
    Alert.alert("Success", "Meal Saved.", [
      { text: "OK", onPress: () => navigation.navigate('Home') }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Meal</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.formContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Meal Name & Type Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Meal Name *</Text>
              <TextInput 
                style={styles.input} 
                value={formData.mealName} 
                onChangeText={(v) => updateField('mealName', v)} 
                placeholder="Grilled Chicken"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Meal Type *</Text>
              <TextInput 
                style={styles.input} 
                value={formData.mealType} 
                onChangeText={(v) => updateField('mealType', v)} 
                placeholder="Lunch"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Ingredients *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.ingredients}
              onChangeText={(v) => updateField('ingredients', v)}
              placeholder="Chicken, olive oil, garlic, rosemary..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Amounts */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Amounts *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.amounts}
              onChangeText={(v) => updateField('amounts', v)}
              placeholder="2 lbs, 1 tbsp, 2 cloves..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(v) => updateField('description', v)}
              placeholder="Notes about preparation or serving..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Image */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Image URL</Text>
            <TextInput
              style={styles.input}
              value={formData.image}
              onChangeText={(v) => updateField('image', v)}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Allergen Info */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Allergen Info</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.allergenInfo}
              onChangeText={(v) => updateField('allergenInfo', v)}
              placeholder="Contains: dairy, nuts, gluten..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          {/* Required Fields Note */}
          <Text style={styles.requiredNote}>* Required fields</Text>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleBackPress}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit Meal</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputGroupFull: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  requiredNote: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default KitchenAddMealOptionsScreen;