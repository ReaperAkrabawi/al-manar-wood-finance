import React, { useMemo, useState } from 'react';
import {
  FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryCard } from '@/components/EntryCard';
import { PhotoModal } from '@/components/PhotoModal';
import { useFinance } from '@/context/FinanceContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import type { Income, Purchase, PurchaseCategory, Wage, Withdrawal } from '@/types';
import { PURCHASE_CATEGORIES } from '@/types';

type Tab = 'income' | 'purchases' | 'wages' | 'withdrawals';

export default function EntriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    filteredIncome, filteredPurchases, filteredWages, filteredWithdrawals,
    deleteIncome, deletePurchase, deleteWage, deleteWithdrawal,
  } = useFinance();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('income');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<PurchaseCategory | null>(null);
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  const filteredData = useMemo(() => {
    const q = search.toLowerCase();
    if (activeTab === 'income') {
      return filteredIncome.filter(i => i.desc.toLowerCase().includes(q) || (i.note ?? '').toLowerCase().includes(q));
    } else if (activeTab === 'purchases') {
      let items = filteredPurchases.filter(p => p.name.toLowerCase().includes(q) || (p.supplier ?? '').toLowerCase().includes(q));
      if (catFilter) items = items.filter(p => p.category === catFilter);
      return items;
    } else if (activeTab === 'wages') {
      return filteredWages.filter(w => w.worker.toLowerCase().includes(q) || (w.note ?? '').toLowerCase().includes(q));
    } else {
      return filteredWithdrawals.filter(w => w.desc.toLowerCase().includes(q) || (w.note ?? '').toLowerCase().includes(q));
    }
  }, [activeTab, search, catFilter, filteredIncome, filteredPurchases, filteredWages, filteredWithdrawals]);

  function handleDelete(id: string) {
    if (activeTab === 'income') { deleteIncome(id); showToast('Income deleted'); }
    else if (activeTab === 'purchases') { deletePurchase(id); showToast('Purchase deleted'); }
    else if (activeTab === 'wages') { deleteWage(id); showToast('Wage deleted'); }
    else { deleteWithdrawal(id); showToast('Withdrawal deleted'); }
  }

  const tabs: Array<{ key: Tab; label: string; icon: string; color: string }> = [
    { key: 'income', label: 'Income', icon: 'trending-up', color: colors.income },
    { key: 'purchases', label: 'Purchases', icon: 'shopping-bag', color: colors.purchases },
    { key: 'wages', label: 'Wages', icon: 'users', color: colors.wages },
    { key: 'withdrawals', label: 'Withdrawals', icon: 'arrow-down-circle', color: colors.withdrawals },
  ];

  const activeColor = tabs.find(t => t.key === activeTab)?.color ?? colors.primary;

  function getAddRoute(): string {
    if (activeTab === 'income') return '/add-income';
    if (activeTab === 'purchases') return '/add-purchase';
    if (activeTab === 'wages') return '/add-wage';
    return '/add-withdrawal';
  }

  function renderItem({ item }: { item: Income | Purchase | Wage | Withdrawal }) {
    if (activeTab === 'income') {
      const inc = item as Income;
      return (
        <EntryCard
          type="income"
          title={inc.desc}
          amount={inc.amount}
          date={inc.date}
          photo={inc.photo}
          onEdit={() => router.push({ pathname: '/add-income', params: { id: inc.id } })}
          onDelete={() => handleDelete(inc.id)}
          onPhotoPress={() => inc.photo && setPhotoModal(inc.photo)}
        />
      );
    } else if (activeTab === 'purchases') {
      const pur = item as Purchase;
      return (
        <EntryCard
          type="purchase"
          title={pur.name}
          subtitle={pur.supplier}
          amount={pur.amount}
          date={pur.date}
          photo={pur.photo}
          badge={pur.category}
          onEdit={() => router.push({ pathname: '/add-purchase', params: { id: pur.id } })}
          onDelete={() => handleDelete(pur.id)}
          onPhotoPress={() => pur.photo && setPhotoModal(pur.photo)}
        />
      );
    } else if (activeTab === 'wages') {
      const wag = item as Wage;
      return (
        <EntryCard
          type="wage"
          title={wag.worker}
          subtitle={wag.note}
          amount={wag.amount}
          date={wag.date}
          isRecurring={wag.recurring}
          onEdit={() => router.push({ pathname: '/add-wage', params: { id: wag.id } })}
          onDelete={() => handleDelete(wag.id)}
        />
      );
    } else {
      const wit = item as Withdrawal;
      return (
        <EntryCard
          type="withdrawal"
          title={wit.desc}
          subtitle={wit.note}
          amount={wit.amount}
          date={wit.date}
          onEdit={() => router.push({ pathname: '/add-withdrawal', params: { id: wit.id } })}
          onDelete={() => handleDelete(wit.id)}
        />
      );
    }
  }

  const total = (filteredData as Array<{ amount: number }>).reduce((s, i) => s + i.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Entries</Text>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(getAddRoute() as any); }}
            style={[styles.addBtn, { backgroundColor: activeColor }]}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tabs — scrollable row */}
        <FlatList
          horizontal
          data={tabs}
          showsHorizontalScrollIndicator={false}
          keyExtractor={t => t.key}
          contentContainerStyle={styles.tabsRow}
          renderItem={({ item: t }) => (
            <TouchableOpacity
              onPress={() => { setActiveTab(t.key); setSearch(''); setCatFilter(null); }}
              style={[
                styles.tabChip,
                {
                  backgroundColor: activeTab === t.key ? t.color : colors.secondary,
                  borderColor: activeTab === t.key ? t.color : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Feather name={t.icon as any} size={13} color={activeTab === t.key ? '#fff' : colors.mutedForeground} />
              <Text style={[styles.tabLabel, { color: activeTab === t.key ? '#fff' : colors.mutedForeground }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category filters for purchases */}
        {activeTab === 'purchases' && (
          <FlatList
            horizontal
            data={PURCHASE_CATEGORIES}
            showsHorizontalScrollIndicator={false}
            keyExtractor={i => i}
            contentContainerStyle={styles.catFilters}
            renderItem={({ item: cat }) => (
              <TouchableOpacity
                onPress={() => setCatFilter(catFilter === cat ? null : cat)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: catFilter === cat ? colors.purchases : colors.secondary,
                    borderColor: catFilter === cat ? colors.purchases : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.catChipText, { color: catFilter === cat ? '#fff' : colors.mutedForeground }]}>{cat}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Total bar */}
      <View style={[styles.totalBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>{filteredData.length} entries</Text>
        <Text style={[styles.totalAmount, { color: activeColor }]}>
          JD {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={item => (item as any).id}
        renderItem={renderItem}
        scrollEnabled={!!filteredData.length}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 120 : 100) },
          !filteredData.length && styles.emptyList,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No entries yet</Text>
          </View>
        }
      />

      {photoModal && (
        <PhotoModal visible photo={photoModal} onClose={() => setPhotoModal(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabsRow: { gap: 8, paddingBottom: 2 },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  catFilters: { gap: 6, paddingBottom: 2 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  catChipText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  totalLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  totalAmount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  list: { padding: 16 },
  emptyList: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  emptyText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
});
