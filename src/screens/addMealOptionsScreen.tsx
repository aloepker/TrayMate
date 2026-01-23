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
import { globalStyles } from '../styles/styles';

const MealForm = ({ navigation }: any) => {
  // 1. STATE FOR ALL FIELDS
  const [formData, setFormData] = useState({
    mealName: '',
    ingredients: '', 
    amounts: '',
    description: '', // We store the display string here
    image: '',
    mealType: '',
    allergenInfo: ''
  });

  // Helper to update state
  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
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
    Alert.alert("Success", "Meal Saved.");
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Text style={globalStyles.header}>Add New Meal</Text>

        <ScrollView contentContainerStyle={globalStyles.formContainer}>
          <View style={globalStyles.row}>
            <View style={[globalStyles.inputGroup, { flex: 2 }]}>
              <Text style={globalStyles.label}>Meal Name*</Text>
              <TextInput style={globalStyles.input} value={formData.mealName} onChangeText={(v) => updateField('mealName', v)} placeholder="Grilled Chicken" />
            </View>
            <View style={[globalStyles.inputGroup, { flex: 1 }]}>
              <Text style={globalStyles.label}>Meal Type*</Text>
              <TextInput style={globalStyles.input} value={formData.mealType} onChangeText={(v) => updateField('mealType', v)} placeholder="Lunch" />
            </View>
          </View>

          <View style={globalStyles.inputGroupFull}>
            <Text style={globalStyles.label}>Ingredients*</Text>
            <TextInput
              style={[globalStyles.input, globalStyles.textArea]}
              value={formData.ingredients}
              onChangeText={(v) => updateField('ingredients', v)}
              placeholder="Chicken, olive oil, garlic"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={globalStyles.inputGroupFull}>
            <Text style={globalStyles.label}>Amounts*</Text>
            <TextInput
              style={[globalStyles.input, globalStyles.textArea]}
              value={formData.amounts}
              onChangeText={(v) => updateField('amounts', v)}
              placeholder="2 lbs, 1 tbsp, 2 cloves"
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={globalStyles.inputGroupFull}>
            <Text style={globalStyles.label}>Description</Text>
            <TextInput
              style={[globalStyles.input, globalStyles.textArea]}
              value={formData.description}
              onChangeText={(v) => updateField('description', v)}
              placeholder="Notes about preparation or serving."
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={globalStyles.inputGroupFull}>
            <Text style={globalStyles.label}>Image</Text>
            <TextInput
              style={globalStyles.input}
              value={formData.image}
              onChangeText={(v) => updateField('image', v)}
              placeholder="Image URL or file name"
            />
          </View>

          <View style={globalStyles.inputGroupFull}>
            <Text style={globalStyles.label}>Allergen Info</Text>
            <TextInput
              style={[globalStyles.input, globalStyles.textArea]}
              value={formData.allergenInfo}
              onChangeText={(v) => updateField('allergenInfo', v)}
              placeholder="Contains: dairy, nuts"
              multiline
              numberOfLines={2}
            />
          </View>
        </ScrollView>

        <View style={globalStyles.footer}>
          <TouchableOpacity style={globalStyles.backButton} onPress={handleBackPress}>
            <Text style={globalStyles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={globalStyles.submitButton} onPress={handleSubmit}>
            <Text style={globalStyles.submitButtonText}>Submit Meal</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default MealForm;
