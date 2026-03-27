import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useKitchenMessages } from '../context/KitchenMessageContext';
import { useCart } from '../context/CartContext';
import { MealService } from '../../services/localDataService';

export default function KitchenBoardScreen({ navigation }: any) {
  const { messages, unreadCount, markAllRead, markRead } = useKitchenMessages();
  const { orders } = useCart();

  // Seasonal meal form
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealDesc, setMealDesc] = useState('');
  const [mealPeriod, setMealPeriod] = useState<'Breakfast' | 'Lunch' | 'Dinner'>('Lunch');
  const [mealCal, setMealCal] = useState('');

  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'confirmed');
  const pendingOrders = orders.filter(o => o.status === 'confirmed');

  const handleAddSeasonalMeal = () => {
    if (!mealName.trim()) {
      Alert.alert('Missing info', 'Please enter a meal name.');
      return;
    }
    // In a real app this would POST to the API or update local state in localDataService.
    Alert.alert(
      'Seasonal Meal Added',
      `"${mealName}" has been added to the ${mealPeriod} menu as a seasonal special.`,
      [{ text: 'OK', onPress: () => {
        setMealName('');
        setMealDesc('');
        setMealCal('');
        setMealPeriod('Lunch');
        setShowAddMeal(false);
      }}]
    );
  };

  const formatTime = (date: Date) => new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return `Today ${formatTime(d)}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + formatTime(d);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🍳 Kitchen Board</Text>
          <Text style={styles.headerSub}>TrayMate — Kitchen Staff</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.replace('Login')}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: '#F2D57E' }]}>
            <Text style={styles.statEmoji}>📨</Text>
            <Text style={styles.statValue}>{unreadCount}</Text>
            <Text style={styles.statLabel}>Unread Messages</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#9ECBE5' }]}>
            <Text style={styles.statEmoji}>🍽</Text>
            <Text style={styles.statValue}>{pendingOrders.length}</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#B5D5C5' }]}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{activeOrders.length}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#717644' }]} onPress={() => setShowAddMeal(true)}>
            <Text style={styles.quickBtnText}>＋ Add Seasonal Meal</Text>
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#D87000' }]} onPress={markAllRead}>
              <Text style={styles.quickBtnText}>✓ Mark All Read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Messages from Caregiver / Admin */}
        <Text style={styles.sectionHeader}>Messages from Staff</Text>
        {messages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>No messages yet. Caregiver and admin staff can send meal instructions here.</Text>
          </View>
        ) : (
          messages.map(msg => (
            <TouchableOpacity
              key={msg.id}
              style={[styles.msgCard, !msg.read && styles.msgCardUnread]}
              onPress={() => markRead(msg.id)}
              activeOpacity={0.8}
            >
              <View style={styles.msgHeader}>
                <View style={styles.msgMeta}>
                  <Text style={styles.msgFrom}>{msg.fromName}</Text>
                  <View style={[styles.msgRoleBadge, { backgroundColor: msg.fromRole === 'admin' ? '#EDE9FE' : '#DBEAFE' }]}>
                    <Text style={[styles.msgRoleText, { color: msg.fromRole === 'admin' ? '#5B21B6' : '#1D4ED8' }]}>
                      {msg.fromRole}
                    </Text>
                  </View>
                </View>
                <Text style={styles.msgTime}>{formatDate(msg.timestamp)}</Text>
              </View>
              <Text style={styles.msgResident}>👤 {msg.residentName} — Room {msg.residentRoom}</Text>
              <Text style={styles.msgText}>{msg.text}</Text>
              {!msg.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        )}

        {/* Active / Pending Orders */}
        <Text style={styles.sectionHeader}>Active Orders</Text>
        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No orders yet.</Text>
          </View>
        ) : (
          orders.map(order => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderResident}>Resident {order.residentId.replace('resident_', '#')}</Text>
                <View style={[styles.orderStatusBadge, {
                  backgroundColor: order.status === 'confirmed' ? '#DBEAFE' : order.status === 'preparing' ? '#FEF3C7' : '#DCFCE7'
                }]}>
                  <Text style={[styles.orderStatusText, {
                    color: order.status === 'confirmed' ? '#1D4ED8' : order.status === 'preparing' ? '#B45309' : '#15803D'
                  }]}>
                    {order.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderTime}>{formatDate(order.placedAt)}</Text>
              {order.items.map((item, idx) => (
                <View key={`${item.id}-${idx}`} style={styles.orderItem}>
                  <Text style={styles.orderItemName}>• {item.name}</Text>
                  {item.specialNote ? (
                    <Text style={styles.orderItemNote}>📝 {item.specialNote}</Text>
                  ) : null}
                </View>
              ))}
              <Text style={styles.orderNutr}>
                Total: {order.totalNutrition.calories} kcal · {order.totalNutrition.sodium}mg sodium · {order.totalNutrition.protein}g protein
              </Text>
            </View>
          ))
        )}

      </ScrollView>

      {/* Add Seasonal Meal Modal */}
      <Modal visible={showAddMeal} transparent animationType="slide" onRequestClose={() => setShowAddMeal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddMeal(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Add Seasonal Meal</Text>

          <Text style={styles.fieldLabel}>Meal Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Summer Berry Parfait"
            placeholderTextColor="#9CA3AF"
            value={mealName}
            onChangeText={setMealName}
          />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.textInput, { minHeight: 60, textAlignVertical: 'top' }]}
            placeholder="Describe the meal…"
            placeholderTextColor="#9CA3AF"
            value={mealDesc}
            onChangeText={setMealDesc}
            multiline
          />

          <Text style={styles.fieldLabel}>Meal Period</Text>
          <View style={styles.periodRow}>
            {(['Breakfast', 'Lunch', 'Dinner'] as const).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodChip, mealPeriod === p && styles.periodChipActive]}
                onPress={() => setMealPeriod(p)}
              >
                <Text style={[styles.periodChipText, mealPeriod === p && styles.periodChipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Calories (optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 350"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={mealCal}
            onChangeText={setMealCal}
          />

          <TouchableOpacity style={styles.addBtn} onPress={handleAddSeasonalMeal}>
            <Text style={styles.addBtnText}>Add to Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddMeal(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  header: {
    height: 74,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E2D6',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSub: {
    fontSize: 13,
    color: '#8A8A8A',
    marginTop: 2,
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  quickBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 20,
  },
  msgCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E7E2D6',
    position: 'relative',
  },
  msgCardUnread: {
    borderColor: '#D87000',
    backgroundColor: '#FFFBF0',
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  msgFrom: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  msgRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  msgRoleText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  msgTime: {
    fontSize: 11,
    color: '#8A8A8A',
  },
  msgResident: {
    fontSize: 13,
    color: '#6A6A6A',
    fontWeight: '600',
    marginBottom: 6,
  },
  msgText: {
    fontSize: 14,
    color: '#3A3A3A',
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D87000',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E7E2D6',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderResident: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  orderTime: {
    fontSize: 12,
    color: '#8A8A8A',
    marginBottom: 8,
  },
  orderItem: {
    paddingVertical: 2,
  },
  orderItemName: {
    fontSize: 14,
    color: '#3A3A3A',
  },
  orderItemNote: {
    fontSize: 13,
    color: '#92400E',
    fontStyle: 'italic',
    marginLeft: 12,
    marginTop: 2,
  },
  orderNutr: {
    fontSize: 12,
    color: '#8A8A8A',
    marginTop: 8,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#F9FAFB',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  periodChipActive: {
    backgroundColor: '#717644',
    borderColor: '#717644',
  },
  periodChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A6A6A',
  },
  periodChipTextActive: {
    color: '#FFFFFF',
  },
  addBtn: {
    backgroundColor: '#717644',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 22,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelBtnText: {
    fontSize: 15,
    color: '#8A8A8A',
    fontWeight: '600',
  },
});
