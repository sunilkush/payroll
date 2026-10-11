import { useCallback, useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  createClientApi,
  listClientsApi,
  setClientStatusApi,
  updateClientApi,
} from '../../api/clientApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';

const EMPTY_CLIENT = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  lat: '',
  lng: '',
  notes: '',
};

export default function AdminClientsScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [feedback, setFeedback] = useState({ type: 'success', text: '' });

  // Modal State (Add / Edit Client)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(EMPTY_CLIENT);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      setFeedback({ type: 'success', text: '' });
      const res = await listClientsApi();
      setClients(res?.data?.items || res?.data || []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load clients.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  const openAddModal = () => {
    setEditingClient(null);
    setForm(EMPTY_CLIENT);
    setModalVisible(true);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setForm({
      name: client.name || '',
      contactPerson: client.contactPerson || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      lat: client.lat != null ? String(client.lat) : '',
      lng: client.lng != null ? String(client.lng) : '',
      notes: client.notes || '',
    });
    setModalVisible(true);
  };

  const handleGetCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        NativeAlert.alert('Permission Denied', 'Location permission is required to detect coordinates.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setForm((prev) => ({
        ...prev,
        lat: loc.coords.latitude.toFixed(6),
        lng: loc.coords.longitude.toFixed(6),
      }));
    } catch (err) {
      NativeAlert.alert('GPS Error', err.message || 'Unable to retrieve location.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      NativeAlert.alert('Validation Error', 'Please enter a client name.');
      return;
    }

    setSubmitting(true);
    try {
      const hasCoords = Boolean(
        form.lat &&
          form.lng &&
          !isNaN(Number(form.lat)) &&
          !isNaN(Number(form.lng))
      );
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        lat: hasCoords ? Number(form.lat) : undefined,
        lng: hasCoords ? Number(form.lng) : undefined,
        notes: form.notes.trim(),
      };

      if (editingClient) {
        await updateClientApi(editingClient._id, payload);
        setFeedback({ type: 'success', text: `Client "${payload.name}" updated successfully.` });
      } else {
        await createClientApi(payload);
        setFeedback({ type: 'success', text: `New client "${payload.name}" created.` });
      }

      setModalVisible(false);
      fetchClients();
      setTimeout(() => setFeedback({ type: 'success', text: '' }), 4000);
    } catch (err) {
      NativeAlert.alert('Error', err.message || 'Failed to save client.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = (client) => {
    const nextStatus = !client.isActive;
    const actionLabel = nextStatus ? 'Activate' : 'Deactivate';

    NativeAlert.alert(
      `${actionLabel} Client?`,
      `Are you sure you want to ${actionLabel.toLowerCase()} "${client.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: nextStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await setClientStatusApi(client._id, nextStatus);
              setFeedback({
                type: 'success',
                text: `Client "${client.name}" ${nextStatus ? 'activated' : 'deactivated'}.`,
              });
              fetchClients();
              setTimeout(() => setFeedback({ type: 'success', text: '' }), 3000);
            } catch (err) {
              NativeAlert.alert('Error', err.message || 'Failed to update client status.');
            }
          },
        },
      ]
    );
  };

  const filteredClients = clients.filter((c) => {
    if (filterActive === 'ACTIVE' && !c.isActive) return false;
    if (filterActive === 'INACTIVE' && c.isActive) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.contactPerson?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Client Accounts"
        subtitle="Manage client locations & contacts"
        canGoBack
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'plus',
          onPress: openAddModal,
        }}
      />

      {feedback.text ? (
        <View style={styles.alertWrapper}>
          <Alert
            type={feedback.type}
            message={feedback.text}
            onDismiss={() => setFeedback({ type: 'success', text: '' })}
          />
        </View>
      ) : null}

      <View style={styles.filterBar}>
        <SearchBar
          placeholder="Search clients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          style={styles.searchInput}
        />
        <View style={styles.statusChipsRow}>
          {['ALL', 'ACTIVE', 'INACTIVE'].map((opt) => {
            const isSelected = filterActive === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setFilterActive(opt)}
                activeOpacity={0.75}
              >
                {isSelected && (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color={colors.primary}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <Loader message="Loading client directory..." />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            icon="domain"
            title="No clients found"
            description={
              searchQuery
                ? 'Try adjusting your search criteria.'
                : 'Tap "+" to register your first client account.'
            }
            actionTitle={!searchQuery ? 'Add Client' : undefined}
            onAction={!searchQuery ? openAddModal : undefined}
          />
        ) : (
          <View style={styles.list}>
            {filteredClients.map((client) => (
              <Card key={client._id} style={styles.clientCard} elevation="sm">
                <View style={styles.cardHeader}>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    {client.contactPerson ? (
                      <Text style={styles.contactName}>
                        <MaterialCommunityIcons name="account-outline" size={14} color={colors.textSecondary} />{' '}
                        {client.contactPerson}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={client.isActive ? 'Active' : 'Inactive'}
                    variant={client.isActive ? 'success' : 'default'}
                    size="sm"
                  />
                </View>

                {client.phone || client.email ? (
                  <View style={styles.contactMetaRow}>
                    {client.phone ? (
                      <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="phone-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.metaText}>{client.phone}</Text>
                      </View>
                    ) : null}
                    {client.email ? (
                      <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="email-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.metaText}>{client.email}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {client.address ? (
                  <View style={styles.addressRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.primary} />
                    <Text style={styles.addressText} numberOfLines={2}>
                      {client.address}
                    </Text>
                  </View>
                ) : null}

                {client.lat != null && client.lng != null ? (
                  <View style={styles.gpsRow}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={14} color={colors.info} />
                    <Text style={styles.gpsText}>
                      GPS: {Number(client.lat).toFixed(4)}, {Number(client.lng).toFixed(4)}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardActions}>
                  <Button
                    title="Edit Details"
                    variant="outline"
                    size="sm"
                    icon="pencil-outline"
                    onPress={() => openEditModal(client)}
                  />
                  <Button
                    title={client.isActive ? 'Deactivate' : 'Activate'}
                    variant={client.isActive ? 'danger' : 'success'}
                    size="sm"
                    onPress={() => handleToggleStatus(client)}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Client Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Input
                label="Client / Company Name *"
                placeholder="e.g. Acme Technologies Pvt Ltd"
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              />
              <Input
                label="Contact Person"
                placeholder="e.g. Ramesh Kumar"
                value={form.contactPerson}
                onChangeText={(v) => setForm((p) => ({ ...p, contactPerson: v }))}
              />
              <Input
                label="Phone Number"
                placeholder="e.g. +91 98765 43210"
                value={form.phone}
                keyboardType="phone-pad"
                onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))}
              />
              <Input
                label="Email Address"
                placeholder="e.g. contact@acme.com"
                value={form.email}
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
              />
              <Input
                label="Client Office Address"
                placeholder="e.g. Suite 402, Sector 62, Noida"
                value={form.address}
                multiline
                numberOfLines={2}
                onChangeText={(v) => setForm((p) => ({ ...p, address: v }))}
              />

              <View style={styles.gpsSection}>
                <View style={styles.gpsHeader}>
                  <Text style={styles.gpsLabel}>Office GPS Coordinates (Optional)</Text>
                  <Button
                    title="Use Phone GPS"
                    size="sm"
                    variant="outline"
                    icon="crosshairs-gps"
                    loading={locating}
                    onPress={handleGetCurrentLocation}
                  />
                </View>

                <View style={styles.coordsRow}>
                  <Input
                    placeholder="Latitude"
                    value={form.lat}
                    onChangeText={(v) => setForm((p) => ({ ...p, lat: v }))}
                    keyboardType="numeric"
                    containerStyle={styles.coordInput}
                  />
                  <Input
                    placeholder="Longitude"
                    value={form.lng}
                    onChangeText={(v) => setForm((p) => ({ ...p, lng: v }))}
                    keyboardType="numeric"
                    containerStyle={styles.coordInput}
                  />
                </View>
              </View>

              <Input
                label="Internal Notes"
                placeholder="e.g. Key decision maker, prefers afternoon meetings"
                value={form.notes}
                multiline
                numberOfLines={2}
                onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
              />

              <Button
                title={editingClient ? 'Save Changes' : 'Create Client'}
                onPress={handleSubmit}
                loading={submitting}
                icon="check"
                style={styles.modalSubmitBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  alertWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchInput: {
    marginBottom: 8,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  chipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.sizes.xs,
    color: colors.onSurfaceVariant,
    fontWeight: typography.weights.medium,
  },
  chipTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: typography.weights.bold,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  list: {
    gap: 12,
  },
  clientCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  clientInfo: {
    flex: 1,
    marginRight: 8,
  },
  clientName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  contactName: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contactMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgApp,
    padding: 8,
    borderRadius: borderRadius.sm,
    marginBottom: 8,
  },
  addressText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    flex: 1,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  gpsText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    marginVertical: 20,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyBtn: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: 24,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  gpsSection: {
    marginBottom: 12,
  },
  gpsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gpsLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coordInput: {
    flex: 1,
    marginBottom: 0,
  },
  modalSubmitBtn: {
    marginTop: 16,
  },
});
