import { StyleSheet } from 'react-native';

export const Theme = {
  colors: {
    primary: '#076300ff',
    background: '#F5F7FA',
    text: '#000000', 
    white: '#FFFFFF',
    border: '#DDDDDD',
  },
  fonts: {
    small: 12,      
    medium: 16,
    large: 24,      
    bold: '600' as '600',
  }
};

export const globalStyles = StyleSheet.create({

  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: Theme.colors.background 
  },
  header: {
    fontSize: Theme.fonts.large,
    fontWeight: 'bold',
    color: Theme.colors.text,
    padding: 24,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },   
  title: {
    fontSize: Theme.fonts.large,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 30,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8, 
    paddingHorizontal: 10,
    width: '100%'
  },
  homeButtons: { 
    backgroundColor: Theme.colors.primary, 
    paddingVertical: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    elevation: 3
  },
  button: { 
    backgroundColor: Theme.colors.primary, 
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { 
    color: Theme.colors.white,
    fontWeight: Theme.fonts.bold,
    fontSize: Theme.fonts.small,
    textAlign: 'center'
  },
  input: {
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Theme.colors.text, // Makes typing black
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    color: '#555555',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    width: '100%'
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
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  }
});