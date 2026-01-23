import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { globalStyles } from '../styles/styles';

const UpcomingMeal = ({ navigation }: any) => {
  const meals = useMemo(
    () => [
      {
        id: 'lunch',
        type: 'Lunch',
        status: 'confirmed' as const,
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
        status: 'pending' as const,
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

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((curr) => (curr === id ? null : id));
  };

  const goToMenu = () => {
    navigation.navigate('BrowseMealOptions');
  };

  const getMealTypeColor = (type: string) => {
    switch (type) {
      case 'Breakfast':
        return { bg: '#fef3c7', text: '#92400e', icon: '🌅' };
      case 'Lunch':
        return { bg: '#dbeafe', text: '#1e40af', icon: '☀️' };
      case 'Dinner':
        return { bg: '#ede9fe', text: '#5b21b6', icon: '🌙' };
      default:
        return { bg: '#f3f4f6', text: '#374151', icon: '🍽️' };
    }
  };

  return (
    <View style={styles.fullContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming Meals</Text>
        <TouchableOpacity style={styles.menuBtn} onPress={goToMenu}>
          <Text style={styles.menuBtnText}>Menu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {meals.map((meal) => {
          const expanded = expandedId === meal.id;
          const mealTypeStyle = getMealTypeColor(meal.type);

          return (
            <TouchableOpacity
              key={meal.id}
              style={styles.card}
              onPress={() => toggleExpand(meal.id)}
              activeOpacity={0.7}
            >
              {/* Meal Type Banner - NEW: Prominent meal period indicator */}
              <View style={[styles.mealTypeBanner, { backgroundColor: mealTypeStyle.bg }]}>
                <Text style={styles.mealTypeIcon}>{mealTypeStyle.icon}</Text>
                <Text style={[styles.mealTypeBannerText, { color: mealTypeStyle.text }]}>
                  {meal.type.toUpperCase()}
                </Text>
                <Text style={[styles.mealTimeText, { color: mealTypeStyle.text }]}>
                  {meal.time}
                </Text>
              </View>

              {/* Meal Image */}
              <View style={styles.imageContainer}>
                <Image 
                  source={meal.image} 
                  style={styles.mealImage}
                  resizeMode="cover"
                />
                {/* Meal Name Overlay */}
                <View style={styles.nameOverlay}>
                  <Text style={styles.mealNameLarge}>{meal.name}</Text>
                </View>
              </View>

              {/* Status and Badges Below Image */}
              <View style={styles.badgeSection}>
                <View style={styles.badgesContainer}>
                  {meal.seasonal && (
                    <View style={styles.seasonalPill}>
                      <Text style={styles.seasonalText}>★ Seasonal</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.badge,
                      meal.status === 'confirmed' ? styles.confirmed : styles.pending,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {meal.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Nutrition Information */}
              <View style={styles.nutritionSection}>
                <Text style={styles.nutritionTitle}>Nutrition Facts</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionCard}>
                    <Text style={styles.nutritionValue}>{meal.nutrition.calories}</Text>
                    <Text style={styles.nutritionLabel}>kcal</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <Text style={styles.nutritionValue}>{meal.nutrition.sodium}mg</Text>
                    <Text style={styles.nutritionLabel}>sodium</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <Text style={styles.nutritionValue}>{meal.nutrition.protein}g</Text>
                    <Text style={styles.nutritionLabel}>protein</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <Text style={styles.nutritionValue}>{meal.nutrition.cholesterol}mg</Text>
                    <Text style={styles.nutritionLabel}>cholesterol</Text>
                  </View>
                </View>
              </View>

              {/* Expanded Ingredients */}
              {expanded && (
                <View style={styles.expandArea}>
                  <View style={styles.divider} />
                  <Text style={styles.expandTitle}>Ingredients</Text>
                  <View style={styles.ingredientsList}>
                    {meal.ingredients.map((ing, idx) => (
                      <View key={idx} style={styles.ingredientRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.ingredient}>{ing}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Expand Indicator */}
              <View style={styles.expandIndicator}>
                <Text style={styles.expandIcon}>{expanded ? '▲ Hide Details' : '▼ Show Details'}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  menuBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  menuBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  // NEW: Meal Type Banner Styles
  mealTypeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  mealTypeIcon: {
    fontSize: 24,
  },
  mealTypeBannerText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  mealTimeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  imageContainer: {
    position: 'relative',
  },
  mealImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#f3f4f6',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  mealNameLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  badgeSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 26,
    minWidth: 130,
    alignItems: 'center',
  },
  confirmed: {
    backgroundColor: '#10b981',
  },
  pending: {
    backgroundColor: '#f59e0b',
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  seasonalPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 26,
  },
  seasonalText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400e',
  },
  nutritionSection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 0,
  },
  nutritionCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  nutritionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  expandArea: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#f9fafb',
  },
  divider: {
    height: 2,
    backgroundColor: '#e5e7eb',
    marginBottom: 20,
  },
  expandTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
    marginTop: 8,
    marginRight: 14,
  },
  ingredient: {
    fontSize: 17,
    color: '#374151',
    flex: 1,
    lineHeight: 26,
    fontWeight: '500',
  },
  expandIndicator: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#ffffff',
  },
  expandIcon: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '600',
  },
});

export default UpcomingMeal;