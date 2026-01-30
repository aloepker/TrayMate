import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';

interface Meal {
  id: string;
  type: string;
  status: 'confirmed' | 'pending';
  time: string;
  name: string;
  image: any;
  ingredients: string[];
  seasonal: boolean;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sodium: number;
    cholesterol: number;
    fiber: number;
  };
}

function UpcomingMealsScreen({ navigation }: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const meals: Meal[] = useMemo(
    () => [
      {
        id: 'lunch',
        type: 'Lunch',
        status: 'confirmed',
        time: '12:00 PM',
        name: 'Herb Baked Chicken',
        image: require('../styles/pictures/herb baked chicken.png'),
        ingredients: [
          'Chicken breast',
          'Herb seasoning',
          'Olive oil',
          'Garlic',
          'Lemon',
          'Salt & pepper',
        ],
        seasonal: false,
        nutrition: {
          calories: 420,
          protein: 45,
          carbs: 12,
          fat: 18,
          sodium: 380,
          cholesterol: 125,
          fiber: 2,
        },
      },
      {
        id: 'dinner',
        type: 'Dinner',
        status: 'pending',
        time: '6:00 PM',
        name: 'Seasonal Vegetables',
        image: require('../styles/pictures/Seasonal vegetables.png'),
        ingredients: [
          'Chefs seasonal vegetable mix',
          'Roasted garlic',
          'Olive oil',
          'Sea salt',
          'Cracked black pepper',
        ],
        seasonal: true,
        nutrition: {
          calories: 180,
          protein: 6,
          carbs: 28,
          fat: 8,
          sodium: 240,
          cholesterol: 0,
          fiber: 8,
        },
      },
    ],
    []
  );

  const toggleExpand = (id: string) => {
    setExpandedId((curr) => (curr === id ? null : id));
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming Meals</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={handleSettings}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {meals.map((meal) => {
          const expanded = expandedId === meal.id;

          return (
            <TouchableOpacity
              key={meal.id}
              style={styles.mealCard}
              onPress={() => toggleExpand(meal.id)}
              activeOpacity={0.8}
            >
              <View style={styles.mealHeader}>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealType}>{meal.type}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      meal.status === 'confirmed' ? styles.confirmed : styles.pending,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {meal.status === 'confirmed' ? 'confirmed' : 'pending'}
                    </Text>
                  </View>
                </View>
                <View style={styles.timeContainer}>
                  <Text style={styles.time}>{meal.time}</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </View>

              <Text style={styles.mealName}>{meal.name}</Text>

              {expanded && (
                <View style={styles.expandedSection}>
                  <View style={styles.divider} />
                  
                  <Image 
                    source={meal.image} 
                    style={styles.mealImage}
                    resizeMode="cover"
                  />

                  <View style={styles.nutritionSection}>
                    <Text style={styles.sectionTitle}>Nutrition Facts</Text>
                    <View style={styles.nutritionGrid}>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{meal.nutrition.calories}</Text>
                        <Text style={styles.nutritionLabel}>calories</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{meal.nutrition.protein}g</Text>
                        <Text style={styles.nutritionLabel}>protein</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{meal.nutrition.carbs}g</Text>
                        <Text style={styles.nutritionLabel}>carbs</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{meal.nutrition.fat}g</Text>
                        <Text style={styles.nutritionLabel}>fat</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.ingredientsSection}>
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    <View style={styles.ingredientsList}>
                      {meal.ingredients.map((ingredient, idx) => (
                        <View key={idx} style={styles.ingredientRow}>
                          <View style={styles.bullet} />
                          <Text style={styles.ingredient}>{ingredient}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: '#717644',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A4A4A',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  settingsIcon: {
    fontSize: 24,
    color: '#717644',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confirmed: {
    backgroundColor: '#717644',
  },
  pending: {
    backgroundColor: '#d27028',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8A8A8A',
  },
  chevron: {
    fontSize: 24,
    color: '#cbc2b4',
    fontWeight: '300',
  },
  mealName: {
    fontSize: 18,
    fontWeight: '400',
    color: '#8A8A8A',
  },
  expandedSection: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E4DE',
    marginBottom: 16,
  },
  mealImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#F5F3EF',
    marginBottom: 20,
  },
  nutritionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  nutritionItem: {
    flex: 1,
    backgroundColor: '#F5F3EF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E4DE',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 2,
  },
  nutritionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8A8A8A',
    textAlign: 'center',
  },
  ingredientsSection: {
    marginBottom: 0,
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#b77f3f',
    marginTop: 7,
    marginRight: 10,
  },
  ingredient: {
    fontSize: 15,
    color: '#6A6A6A',
    flex: 1,
    lineHeight: 22,
  },
});

export default UpcomingMealsScreen;