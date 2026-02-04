import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TextInput,
  Pressable,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '../../src/constants/colors';
import { adminAPI } from '../../src/services/api';
import { DEPARTMENT_CITIES, HAITI_DEPARTMENTS } from '../../src/constants/haiti';

export default function SuperAdminWhiteLabel() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [forcePasswordChange, setForcePasswordChange] = useState(true);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    representativeName: '',
    phone: '',
    email: '',
    tempPassword: '',
    primaryColor: '#E53935',
    secondaryColor: '#1E3A5F',
    tertiaryColor: '#F4B400',
    logo: '',
  });

  const departmentOptions = useMemo(() => HAITI_DEPARTMENTS, []);

  const colorPalette = useMemo(
    () => [
      '#000000',
      '#212121',
      '#E53935',
      '#D81B60',
      '#8E24AA',
      '#5E35B1',
      '#3949AB',
      '#1E88E5',
      '#039BE5',
      '#00897B',
      '#43A047',
      '#7CB342',
      '#F4B400',
      '#FB8C00',
      '#F4511E',
      '#6D4C41',
      '#546E7A',
    ],
    []
  );

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllAdmins();
      const admins = response.data.admins || [];
      const filtered = admins.filter((admin: any) =>
        admin.brand_name && String(admin.brand_name).trim().length > 0
      );
      setBrands(filtered);
    } catch (error) {
      console.error('Fetch white label error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      companyName: '',
      representativeName: '',
      phone: '',
      email: '',
      tempPassword: '',
      primaryColor: '#E53935',
      secondaryColor: '#1E3A5F',
      tertiaryColor: '#F4B400',
      logo: '',
    });
    setSelectedCity('');
    setSelectedDepartment('');
    setForcePasswordChange(true);
    setDepartmentOpen(false);
    setCityOpen(false);
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setForm({ ...form, logo: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const citiesForDepartment = useMemo(() => {
    if (!selectedDepartment) return [];
    return DEPARTMENT_CITIES[selectedDepartment] || [];
  }, [selectedDepartment]);

  const handleCreateBrand = async () => {
    if (!form.companyName || !form.representativeName || !form.phone || !form.email || !form.tempPassword) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan obligatwa yo');
      return;
    }
    if (!selectedCity) {
      Alert.alert('Erè', 'Chwazi yon vil');
      return;
    }
    if (!selectedDepartment) {
      Alert.alert('Erè', 'Chwazi yon depatman');
      return;
    }

    setSaving(true);
    try {
      await adminAPI.createAdmin({
        full_name: form.representativeName,
        email: form.email,
        phone: form.phone,
        password: form.tempPassword,
        brand_name: form.companyName,
        logo: form.logo || undefined,
        primary_color: form.primaryColor,
        secondary_color: form.secondaryColor,
        cities: [selectedCity],
      });
      Alert.alert('Siksè', 'Mak pèsonèl kreye!');
      resetForm();
      fetchBrands();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab kreye mak la');
    } finally {
      setSaving(false);
    }
  };

  const handleTestBrand = () => {
    Alert.alert(
      'Tès Mak Pèsonèl',
      'Mòd tès lan pare. Nou ka konekte ak anviwònman tès la pou verifye koule yo.'
    );
  };

  const handlePreviewAction = () => {
    Alert.alert(
      'Aksyon',
      'Bouton sa a se yon egzanp pou wè kijan mak la ap parèt sou dashboard la.'
    );
  };

  const handlePreviewDetails = () => {
    Alert.alert(
      'Detay',
      'Bouton sa a se yon egzanp pou wè yon paj detay nan mak la.'
    );
  };

  const renderBrand = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.brandIcon}>
          <Ionicons name="color-palette" size={20} color={Colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.brandName}>{item.brand_name}</Text>
          <Text style={styles.meta}>{item.full_name}</Text>
          <Text style={styles.meta}>{item.email}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Mak Pèsonèl</Text>
        </View>
      </View>

      <View style={styles.colorRow}>
        <View style={styles.colorItem}>
          <View style={[styles.colorSwatch, { backgroundColor: item.primary_color }]} />
          <Text style={styles.colorLabel}>Prensipal</Text>
        </View>
        <View style={styles.colorItem}>
          <View style={[styles.colorSwatch, { backgroundColor: item.secondary_color }]} />
          <Text style={styles.colorLabel}>Sekondè</Text>
        </View>
      </View>

      <View style={styles.citiesRow}>
        <Ionicons name="location" size={14} color={Colors.textSecondary} />
        <Text style={styles.citiesText}>
          {item.cities?.join(', ') || 'Pa gen vil'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mak Pèsonèl</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBrands} />}
      >
        <View style={styles.formRow}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Kreye nouvo mak pèsonèl</Text>
            <Text style={styles.sectionHint}>
              Mak pèsonèl la ap gen app chofè/pasajè ak dashboard admin pou flòt pa li.
            </Text>

            <Text style={styles.fieldLabel}>Non antrepriz la</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: TapTapGo Partner"
              value={form.companyName}
              onChangeText={(text) => setForm({ ...form, companyName: text })}
            />

            <Text style={styles.fieldLabel}>Logo antrepriz</Text>
            <Pressable style={styles.logoPicker} onPress={pickLogo}>
              {form.logo ? (
                <Image source={{ uri: form.logo }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="image-outline" size={28} color={Colors.textSecondary} />
                  <Text style={styles.logoText}>Ajoute logo</Text>
                </View>
              )}
            </Pressable>

            <Text style={styles.fieldLabel}>Reprezantan antrepriz (non konplè)</Text>
            <TextInput
              style={styles.input}
              placeholder="Non konplè"
              value={form.representativeName}
              onChangeText={(text) => setForm({ ...form, representativeName: text })}
            />

            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <Text style={styles.fieldLabel}>Nimewo telefòn</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 509..."
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@domain.com"
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Depatman</Text>
            <Pressable
              onPress={() => setDepartmentOpen((prev) => !prev)}
              style={styles.dropdown}
            >
              <Text style={styles.dropdownText}>
                {selectedDepartment || 'Chwazi depatman'}
              </Text>
              <Ionicons
                name={departmentOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.textSecondary}
              />
            </Pressable>
            {departmentOpen && (
              <View style={styles.dropdownList}>
                {departmentOptions.map((dept) => (
                  <Pressable
                    key={dept}
                    onPress={() => {
                      setSelectedDepartment(dept);
                      setSelectedCity('');
                      setDepartmentOpen(false);
                      setCityOpen(false);
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>{dept}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.fieldLabel}>Vil</Text>
            <Pressable
              onPress={() => {
                if (selectedDepartment) {
                  setCityOpen((prev) => !prev);
                }
              }}
              style={[
                styles.dropdown,
                !selectedDepartment && styles.dropdownDisabled,
              ]}
            >
              <Text style={styles.dropdownText}>
                {selectedCity || 'Chwazi vil'}
              </Text>
              <Ionicons
                name={cityOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.textSecondary}
              />
            </Pressable>
            {cityOpen && (
              <View style={styles.dropdownList}>
                {citiesForDepartment.map((city) => (
                  <Pressable
                    key={city}
                    onPress={() => {
                      setSelectedCity(city);
                      setCityOpen(false);
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>{city}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <Text style={styles.fieldLabel}>Modpas tanporè</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Modpas tanporè"
                  value={form.tempPassword}
                  onChangeText={(text) => setForm({ ...form, tempPassword: text })}
                  secureTextEntry
                />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.fieldLabel}>Obligatwa chanje</Text>
                <View style={styles.switchRow}>
                  <Switch
                    value={forcePasswordChange}
                    onValueChange={setForcePasswordChange}
                  />
                  <Text style={styles.switchLabel}>
                    {forcePasswordChange ? 'Wi' : 'Non'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Chwazi koulè yo</Text>
            <Text style={styles.helperText}>Klike sou palèt pou chwazi.</Text>
            <View style={styles.colorPickRow}>
              <View style={styles.colorPickBlock}>
                <Text style={styles.colorPickLabel}>Koulè prensipal</Text>
                <View style={styles.paletteRow}>
                  {colorPalette.map((color) => (
                    <Pressable
                      key={`p-${color}`}
                      onPress={() => setForm({ ...form, primaryColor: color })}
                      style={[
                        styles.paletteSwatch,
                        { backgroundColor: color },
                        form.primaryColor === color && styles.paletteSwatchActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
              <View style={styles.colorPickBlock}>
                <Text style={styles.colorPickLabel}>Koulè sekondè</Text>
                <View style={styles.paletteRow}>
                  {colorPalette.map((color) => (
                    <Pressable
                      key={`s-${color}`}
                      onPress={() => setForm({ ...form, secondaryColor: color })}
                      style={[
                        styles.paletteSwatch,
                        { backgroundColor: color },
                        form.secondaryColor === color && styles.paletteSwatchActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
              <View style={styles.colorPickBlock}>
                <Text style={styles.colorPickLabel}>Twazyèm koulè</Text>
                <View style={styles.paletteRow}>
                  {colorPalette.map((color) => (
                    <Pressable
                      key={`t-${color}`}
                      onPress={() => setForm({ ...form, tertiaryColor: color })}
                      style={[
                        styles.paletteSwatch,
                        { backgroundColor: color },
                        form.tertiaryColor === color && styles.paletteSwatchActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.primaryButton, saving && styles.buttonDisabled]}
                onPress={handleCreateBrand}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Ap kreye...' : 'Kreye Mak Pèsonèl'}
                </Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleTestBrand}>
                <Text style={styles.secondaryButtonText}>Teste Mak la</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.sectionTitle}>Vizyalizasyon rapid</Text>
            <Text style={styles.sectionHint}>
              Sa a se yon egzanp kijan nouvo mak la ka parèt.
            </Text>
            <View style={[styles.previewHeader, { backgroundColor: form.primaryColor }]}>
              <View style={styles.previewHeaderRow}>
                {form.logo ? (
                  <Image source={{ uri: form.logo }} style={styles.previewLogo} />
                ) : (
                  <View style={styles.previewLogoPlaceholder}>
                    <Ionicons name="image-outline" size={16} color="white" />
                  </View>
                )}
                <Text style={styles.previewHeaderText}>
                  {form.companyName || 'Mak Pèsonèl'}
                </Text>
              </View>
            </View>
            <View style={styles.previewBody}>
              <View style={styles.previewBadge}>
                <View style={[styles.previewDot, { backgroundColor: form.secondaryColor }]} />
                <Text style={styles.previewBadgeText}>Admin Dashboard</Text>
              </View>
              <Text style={styles.previewText}>
                Koulè prensipal: {form.primaryColor}
              </Text>
              <Text style={styles.previewText}>
                Koulè sekondè: {form.secondaryColor}
              </Text>
              <Text style={styles.previewText}>
                Twazyèm koulè: {form.tertiaryColor}
              </Text>
            </View>
            <View style={styles.previewActions}>
              <Pressable
                onPress={handlePreviewAction}
                style={[styles.previewButton, { backgroundColor: form.secondaryColor }]}
              >
                <Text style={styles.previewButtonText}>Aksyon</Text>
              </Pressable>
              <Pressable
                onPress={handlePreviewDetails}
                style={[styles.previewButtonOutline, { borderColor: form.tertiaryColor }]}
              >
                <Text style={[styles.previewButtonOutlineText, { color: form.tertiaryColor }]}>
                  Detay
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Mak pèsonèl ki egziste</Text>
          {brands.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="color-palette-outline" size={60} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>Pa gen mak pèsonèl</Text>
            </View>
          ) : (
            <View style={styles.listGrid}>
              {brands.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  {renderBrand({ item })}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  formCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    ...Shadows.small,
  },
  previewCard: {
    width: 360,
    minWidth: 280,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    ...Shadows.small,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: Colors.background,
    color: Colors.text,
  },
  logoPicker: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: Colors.background,
    marginBottom: 12,
  },
  logoPlaceholder: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  logoText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignSelf: 'center',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineField: {
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  chipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: Colors.background,
  },
  dropdownDisabled: {
    opacity: 0.6,
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.text,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.background,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.text,
  },
  colorPickRow: {
    gap: 12,
    marginBottom: 16,
  },
  colorPickBlock: {
    gap: 6,
  },
  colorPickLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paletteSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paletteSwatchActive: {
    borderColor: Colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  previewHeader: {
    borderRadius: 12,
    padding: 14,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewHeaderText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  previewLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  previewLogoPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBody: {
    paddingVertical: 12,
    gap: 6,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  previewBadgeText: {
    fontSize: 12,
    color: Colors.text,
  },
  previewText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
  },
  previewButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  previewButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  previewButtonOutline: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewButtonOutlineText: {
    fontWeight: '600',
  },
  listSection: {
    marginTop: 8,
  },
  listGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  listItem: {
    flexGrow: 1,
    flexBasis: 280,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  colorLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  citiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  citiesText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
