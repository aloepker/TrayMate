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
      },
    ],
    []
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((curr) => (curr === id ? null : id));
  };

  const goToMenu = () => {
    navigation.navigate('BrowseMenus');
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

          return (
            <TouchableOpacity
              key={meal.id}
              style={styles.card}
              onPress={() => toggleExpand(meal.id)}
              activeOpacity={0.7}
            >
              {/* Meal Image */}
              <Image 
                source={meal.image} 
                style={styles.mealImage}
                resizeMode="cover"
              />

              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>{meal.time}</Text>
                  <Text style={styles.mealType}>{meal.type}</Text>
                </View>
                
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
                    <Text
                      style={[
                        styles.badgeText,
                        meal.status === 'confirmed'
                          ? styles.badgeTextConfirmed
                          : styles.badgeTextPending,
                      ]}
                    >
                      {meal.status.charAt(0).toUpperCase() + meal.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Meal Name */}
              <Text style={styles.mealName}>{meal.name}</Text>

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
                <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
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
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  menuBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  menuBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  mealImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  timeContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: 17,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  mealType: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confirmed: {
    backgroundColor: '#10b981',
  },
  pending: {
    backgroundColor: '#f59e0b',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextConfirmed: {
    color: '#fff',
  },
  badgeTextPending: {
    color: '#fff',
  },
  mealName: {
    fontSize: 18,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
    paddingHorizontal: 24,
  },
  expandArea: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 16,
  },
  expandTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6b7280',
    marginTop: 6,
    marginRight: 12,
  },
  ingredient: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    lineHeight: 20,
  },
  seasonalPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  seasonalText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d97706',
  },
  expandIndicator: {
    alignItems: 'center',
    marginTop: 8,
    paddingBottom: 16,
  },
  expandIcon: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default UpcomingMeal;