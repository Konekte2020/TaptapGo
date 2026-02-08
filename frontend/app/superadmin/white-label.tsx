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
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '../../src/constants/colors';
import { adminAPI } from '../../src/services/api';
import { DEPARTMENT_CITIES, HAITI_DEPARTMENTS } from '../../src/constants/haiti';

export default function SuperAdminWhiteLabel() {
  const phonePrefix = '+509 ';
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [createdBrandName, setCreatedBrandName] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [forcePasswordChange, setForcePasswordChange] = useState(true);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<{
    companyName: string;
    primaryColor: string;
    secondaryColor: string;
    tertiaryColor: string;
    logo: string;
  } | null>(null);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [publishTarget, setPublishTarget] = useState<'appstore' | 'playstore' | null>(null);
  const [timeline, setTimeline] = useState([
    { key: 'brief', label: 'Brief & planifikasyon', status: 'an preparasyon', date: '—' },
    { key: 'design', label: 'Design & branding', status: 'an preparasyon', date: '—' },
    { key: 'build', label: 'Build aplikasyon', status: 'an preparasyon', date: '—' },
    { key: 'qa', label: 'Tès & koreksyon', status: 'an preparasyon', date: '—' },
    { key: 'store', label: 'Soumèt Store', status: 'an preparasyon', date: '—' },
    { key: 'live', label: 'Pibliye', status: 'an preparasyon', date: '—' },
  ]);
  const [form, setForm] = useState({
    companyName: '',
    representativeName: '',
    phone: phonePrefix,
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
      phone: phonePrefix,
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

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return citiesForDepartment;
    const term = citySearch.trim().toLowerCase();
    return citiesForDepartment.filter((city) => city.toLowerCase().includes(term));
  }, [citiesForDepartment, citySearch]);

  const handlePhoneChange = (text: string) => {
    const normalized = text.startsWith(phonePrefix) ? text : `${phonePrefix}${text.replace(/^\+?509\s*/, '')}`;
    setForm({ ...form, phone: normalized });
  };

  const previewSource = previewData || {
    companyName: form.companyName,
    primaryColor: form.primaryColor,
    secondaryColor: form.secondaryColor,
    tertiaryColor: form.tertiaryColor,
    logo: form.logo,
  };

  const getDepartmentForCity = (cityName: string) => {
    for (const [dept, cities] of Object.entries(DEPARTMENT_CITIES)) {
      if (cities.includes(cityName)) return dept;
    }
    return '';
  };

  const handleCreateBrand = async () => {
    if (!editingBrand && !canCreateBrand) {
      const remaining = checklist.filter((c) => !c.done).map((c) => `• ${c.label}`).join('\n');
      Alert.alert('Erè', `Fini tout tès yo avan ou kreye mak la.\n\n${remaining}`);
      return;
    }
    if (!form.companyName || !form.representativeName || !form.phone || !form.email || (!editingBrand && !form.tempPassword)) {
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
      if (editingBrand?.id) {
        await adminAPI.updateAdmin(editingBrand.id, {
          full_name: form.representativeName,
          email: form.email,
          phone: form.phone,
          brand_name: form.companyName,
          logo: form.logo || undefined,
          primary_color: form.primaryColor,
          secondary_color: form.secondaryColor,
          tertiary_color: form.tertiaryColor,
          cities: [selectedCity],
        });
        Alert.alert('Siksè', 'Mak pèsonèl modifye!');
      } else {
        await adminAPI.createAdmin({
          full_name: form.representativeName,
          email: form.email,
          phone: form.phone,
          password: form.tempPassword,
          force_password_change: forcePasswordChange,
          brand_name: form.companyName,
          logo: form.logo || undefined,
          primary_color: form.primaryColor,
          secondary_color: form.secondaryColor,
          tertiary_color: form.tertiaryColor,
          cities: [selectedCity],
        });
        Alert.alert('Siksè', 'Mak pèsonèl kreye!');
      }
      setCreatedBrandName(form.companyName.trim());
      updateTimelineStatus([
        { key: 'brief', status: 'fini' },
        { key: 'design', status: 'fini' },
        { key: 'build', status: 'an preparasyon' },
        { key: 'qa', status: 'an preparasyon' },
        { key: 'store', status: 'an preparasyon' },
        { key: 'live', status: 'an preparasyon' },
      ]);
      resetForm();
      setEditingBrand(null);
      fetchBrands();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab kreye mak la');
    } finally {
      setSaving(false);
    }
  };

  const handleTestBrand = () => {
    setPreviewData(null);
    setPreviewVisible(true);
  };

  const handleEditBrand = (brand: any) => {
    const city = brand.cities?.[0] || '';
    const dept = city ? getDepartmentForCity(city) : '';
    setEditingBrand(brand);
    setForm({
      companyName: brand.brand_name || '',
      representativeName: brand.full_name || '',
      phone: brand.phone || phonePrefix,
      email: brand.email || '',
      tempPassword: '',
      primaryColor: brand.primary_color || '#E53935',
      secondaryColor: brand.secondary_color || '#1E3A5F',
      tertiaryColor: brand.tertiary_color || '#F4B400',
      logo: brand.logo || '',
    });
    setSelectedDepartment(dept);
    setSelectedCity(city);
    setDepartmentOpen(false);
    setCityOpen(false);
    setCitySearch('');
  };

  const handlePreviewBrand = (brand: any) => {
    setPreviewData({
      companyName: brand.brand_name || '',
      primaryColor: brand.primary_color || '#E53935',
      secondaryColor: brand.secondary_color || '#1E3A5F',
      tertiaryColor: brand.tertiary_color || '#F4B400',
      logo: brand.logo || '',
    });
    setPreviewVisible(true);
  };

  const handlePublish = (store: 'appstore' | 'playstore') => {
    if (!createdBrandName) {
      Alert.alert('Erè', 'Tanpri kreye mak la avan ou pibliye.');
      return;
    }
    if (!canPublish) {
      Alert.alert('Erè', 'Fini tès yo avan ou pibliye.');
      return;
    }
    setPublishTarget(store);
    setPublishModalVisible(true);
  };

  const handleOpenLiveTest = () => {
    if (!createdBrandName) {
      Alert.alert('Erè', 'Tanpri kreye mak la avan ou lanse tès la.');
      return;
    }
    setTestModalVisible(true);
  };

  const handleOpenPublishPortal = (target: 'appstore' | 'playstore') => {
    const storeName = target === 'appstore' ? 'App Store' : 'Play Store';
    const storeUrl =
      target === 'appstore' ? 'https://appstoreconnect.apple.com/' : 'https://play.google.com/console/';
    Linking.openURL(storeUrl);
    updateTimelineStatus([
      { key: 'store', status: `soumet sou ${storeName}` },
      { key: 'live', status: 'an revizyon' },
    ]);
  };

  const handleDeleteBrand = (brand: any) => {
    setDeleteError('');
    setDeleteTarget(brand);
  };

  const confirmDeleteBrand = async () => {
    if (!deleteTarget?.id) return;
    try {
      setDeleteLoading(true);
      setDeletingId(deleteTarget.id);
      await adminAPI.deleteAdmin(deleteTarget.id);
      await fetchBrands();
      setDeleteTarget(null);
      Alert.alert('Siksè', 'Mak la siprime nèt.');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Pa kapab siprime mak la';
      setDeleteError(message);
      Alert.alert('Erè', message);
    } finally {
      setDeletingId(null);
      setDeleteLoading(false);
    }
  };

  const checklist = useMemo(() => {
    const brandReady =
      !!createdBrandName ||
      (!!form.companyName &&
        !!form.primaryColor &&
        !!form.secondaryColor &&
        !!form.tertiaryColor &&
        !!form.logo);
    const timelineDone = (key: string) => {
      const step = timeline.find((item) => item.key === key);
      if (!step) return false;
      return ['fini', 'pare pou soumèt', 'soumet sou App Store', 'soumet sou Play Store', 'an revizyon', 'pibliye'].includes(
        step.status
      );
    };

    return [
      { key: 'brand', label: 'Idantite vizyèl valide', done: brandReady },
      { key: 'admin', label: 'Kont admin aktive', done: !!createdBrandName },
      { key: 'apps', label: 'Aplikasyon mobil konstwi', done: timelineDone('build') },
      { key: 'tests', label: 'Tès fonksyonèl fini', done: timelineDone('qa') },
      { key: 'stores', label: 'Soumisyon store pare', done: timelineDone('store') },
    ];
  }, [createdBrandName, form, timeline]);

  const checklistProgress = useMemo(() => {
    const total = checklist.length;
    const done = checklist.filter((c) => c.done).length;
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  }, [checklist]);

  const canCreateBrand = checklistProgress.done === checklistProgress.total;
  const canPublish = checklist
    .filter((item) => item.key !== 'stores')
    .every((item) => item.done);

  const updateTimelineStatus = (updates: Array<{ key: string; status: string }>) => {
    const now = new Date().toISOString().slice(0, 10);
    setTimeline((prev) =>
      prev.map((item) => {
        const update = updates.find((u) => u.key === item.key);
        if (!update) return item;
        return { ...item, status: update.status, date: now };
      })
    );
  };

  const handleGeneratePack = (kind: 'apk' | 'ipa' | 'assets') => {
    if (!createdBrandName) {
      Alert.alert('Erè', 'Tanpri kreye mak la avan ou jenere pakè a.');
      return;
    }
    if (!canCreateBrand) {
      Alert.alert('Erè', 'Fini tout tès yo avan ou jenere pakè a.');
      return;
    }
    const url =
      kind === 'apk'
        ? 'https://docs.expo.dev/build-reference/apk/'
        : kind === 'ipa'
          ? 'https://docs.expo.dev/build-reference/ios-builds/'
          : 'https://docs.expo.dev/build-reference/#artifacts';
    Linking.openURL(url);
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

      <View style={styles.brandActions}>
        <Pressable style={styles.editButton} onPress={() => handleEditBrand(item)}>
          <Ionicons name="create-outline" size={16} color={Colors.text} />
          <Text style={styles.editButtonText}>Modifye</Text>
        </Pressable>
        <Pressable style={styles.previewActionButton} onPress={() => handlePreviewBrand(item)}>
          <Ionicons name="eye" size={16} color={Colors.text} />
          <Text style={styles.previewActionText}>Preview</Text>
        </Pressable>
        <Pressable
          style={[styles.deleteButton, deletingId === item.id && styles.buttonDisabled]}
          disabled={deletingId === item.id}
          onPress={() => handleDeleteBrand(item)}
        >
          <Ionicons name="trash-outline" size={16} color="white" />
          <Text style={styles.deleteButtonText}>
            {deletingId === item.id ? 'Ap siprime...' : 'Siprime Mak'}
          </Text>
        </Pressable>
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
        {!!item.tertiary_color && (
          <View style={styles.colorItem}>
            <View style={[styles.colorSwatch, { backgroundColor: item.tertiary_color }]} />
            <Text style={styles.colorLabel}>Twazyèm</Text>
          </View>
        )}
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
            <Text style={styles.sectionTitle}>
              {editingBrand ? 'Modifye mak pèsonèl' : 'Kreye nouvo mak pèsonèl'}
            </Text>
            <Text style={styles.sectionHint}>
              Mak pèsonèl la ap gen app chofè/pasajè ak dashboard admin pou flòt pa li.
            </Text>
            {editingBrand && (
              <View style={styles.editingBanner}>
                <Ionicons name="create-outline" size={16} color={Colors.text} />
                <Text style={styles.editingBannerText}>
                  W ap modifye: {editingBrand.brand_name || 'Mak pèsonèl'}
                </Text>
              </View>
            )}

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
                  placeholder="+509XXXXXXXX"
                  value={form.phone}
                  onChangeText={handlePhoneChange}
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
                      setCitySearch('');
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
                <View style={styles.citySearchRow}>
                  <Ionicons name="search" size={16} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.citySearchInput}
                    placeholder="Chèche vil..."
                    value={citySearch}
                    onChangeText={setCitySearch}
                  />
                </View>
                {filteredCities.map((city) => (
                  <Pressable
                    key={city}
                    onPress={() => {
                      setSelectedCity(city);
                      setCitySearch('');
                      setCityOpen(false);
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>{city}</Text>
                  </Pressable>
                ))}
                {filteredCities.length === 0 && (
                  <Text style={styles.dropdownEmptyText}>Pa gen vil</Text>
                )}
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
                style={[styles.primaryButton, (saving || (!canCreateBrand && !editingBrand)) && styles.buttonDisabled]}
                onPress={handleCreateBrand}
                disabled={saving || (!canCreateBrand && !editingBrand)}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Ap kreye...' : editingBrand ? 'Mete ajou Mak la' : 'Kreye Mak Pèsonèl'}
                </Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleTestBrand}>
                <Text style={styles.secondaryButtonText}>Teste Mak la</Text>
              </Pressable>
              {editingBrand && (
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditingBrand(null);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Anile</Text>
                </Pressable>
              )}
            </View>
            {!editingBrand && !canCreateBrand && (
              <Text style={styles.blockedText}>
                Fini checklist pwodiksyon an avan ou kreye mak la.
              </Text>
            )}

            <View style={styles.processCard}>
              <Text style={styles.sectionTitle}>Pwosesis konplè Mak Pèsonèl</Text>
              <Text style={styles.sectionHint}>
                Mak pèsonèl la se yon aplikasyon apa, ak pwòp idantite li. Nou suiv tout etap yo jiskaske li
                pibliye sou App Store ak Play Store.
              </Text>
              <View style={styles.processSteps}>
                {[
                  'Idantite vizyèl (logo, koulè, non)',
                  'Konfigirasyon admin + vil yo',
                  'Konpilasyon aplikasyon mobil',
                  'Tès fonksyonèl ak sekirite',
                  'Soumèt App Store / Play Store',
                  'Siveyans apre piblikasyon',
                ].map((step, index) => (
                  <View key={step} style={styles.processStep}>
                    <View style={styles.stepIndex}>
                      <Text style={styles.stepIndexText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.checklistCard}>
              <View style={styles.checklistHeader}>
                <Text style={styles.sectionTitle}>Checklist Pwodiksyon</Text>
                <Text style={styles.checklistProgress}>
                  {checklistProgress.done}/{checklistProgress.total} • {checklistProgress.percent}%
                </Text>
              </View>
              <View style={styles.checklistBar}>
                <View style={[styles.checklistBarFill, { width: `${checklistProgress.percent}%` }]} />
              </View>
              <View style={styles.checklistItems}>
                {checklist.map((item) => (
                  <View key={item.key} style={[styles.checklistItem, item.done && styles.checklistItemDone]}>
                    <View style={[styles.checklistDot, item.done && styles.checklistDotDone]}>
                      {item.done && <Ionicons name="checkmark" size={12} color="white" />}
                    </View>
                    <Text style={[styles.checklistText, item.done && styles.checklistTextDone]}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.checklistNote}>
                Checklist la mete ajou otomatikman selon pwogrè travay la.
              </Text>
            </View>

            <View style={styles.timelineCard}>
              <Text style={styles.sectionTitle}>Timeline Pwojè</Text>
              <View style={styles.timelineList}>
                {timeline.map((item) => (
                  <View key={item.key} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>{item.label}</Text>
                      <Text style={styles.timelineMeta}>{item.status} • {item.date}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.deliveryCard}>
              <Text style={styles.sectionTitle}>Pakè Livrezon</Text>
              <Text style={styles.sectionHint}>
                Nou jenere pakè APK/IPA + assets pou mak la apre validasyon final.
              </Text>
              <View style={styles.deliveryRow}>
                <Pressable
                  style={[styles.deliveryButton, (!createdBrandName || !canPublish) && styles.buttonDisabled]}
                  disabled={!createdBrandName || !canPublish}
                  onPress={() => handleGeneratePack('apk')}
                >
                  <Ionicons name="download" size={16} color="white" />
                  <Text style={styles.deliveryText}>Jenere APK</Text>
                </Pressable>
                <Pressable
                  style={[styles.deliveryButton, (!createdBrandName || !canPublish) && styles.buttonDisabled]}
                  disabled={!createdBrandName || !canPublish}
                  onPress={() => handleGeneratePack('ipa')}
                >
                  <Ionicons name="download" size={16} color="white" />
                  <Text style={styles.deliveryText}>Jenere IPA</Text>
                </Pressable>
                <Pressable
                  style={[styles.deliveryButton, (!createdBrandName || !canPublish) && styles.buttonDisabled]}
                  disabled={!createdBrandName || !canPublish}
                  onPress={() => handleGeneratePack('assets')}
                >
                  <Ionicons name="download" size={16} color="white" />
                  <Text style={styles.deliveryText}>Assets Brand</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.testCard}>
              <Text style={styles.sectionTitle}>Teste an dirèk</Text>
              <Text style={styles.sectionHint}>
                Voye yon vèsyon tès bay kliyan an pou li verifye sistèm nan anvan livrezon final.
              </Text>
              <Pressable
                style={[styles.testButton, !createdBrandName && styles.buttonDisabled]}
                disabled={!createdBrandName}
                onPress={handleOpenLiveTest}
              >
                <Ionicons name="flask-outline" size={18} color="white" />
                <Text style={styles.testButtonText}>Tester en direct</Text>
              </Pressable>
            </View>

            <View style={styles.publishCard}>
              <Text style={styles.sectionTitle}>Piblikasyon final</Text>
              <Text style={styles.sectionHint}>
                Lè mak la fin kreye, ou ka lanse etap piblikasyon yo.
              </Text>
              <View style={styles.publishRow}>
                <Pressable
                  style={[styles.publishButton, (!createdBrandName || !canPublish) && styles.buttonDisabled]}
                  disabled={!createdBrandName || !canPublish}
                  onPress={() => handlePublish('appstore')}
                >
                  <Ionicons name="logo-apple" size={18} color="white" />
                  <Text style={styles.publishText}>Pibliye sou App Store</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.publishButton,
                    { backgroundColor: '#34A853' },
                    (!createdBrandName || !canPublish) && styles.buttonDisabled,
                  ]}
                  disabled={!createdBrandName || !canPublish}
                  onPress={() => handlePublish('playstore')}
                >
                  <Ionicons name="logo-google-playstore" size={18} color="white" />
                  <Text style={styles.publishText}>Pibliye sou Play Store</Text>
                </Pressable>
              </View>
              {!!createdBrandName && (
                <View style={styles.publishReady}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.publishReadyText}>
                    Mak "{createdBrandName}" pare pou piblikasyon.
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.sectionTitle}>Vizyalizasyon rapid</Text>
            <Text style={styles.sectionHint}>
              Sa a se yon egzanp kijan nouvo mak la ka parèt.
            </Text>
            <View style={[styles.previewHeader, { backgroundColor: previewSource.primaryColor }]}>
              <View style={styles.previewHeaderRow}>
                {previewSource.logo ? (
                  <Image source={{ uri: previewSource.logo }} style={styles.previewLogo} />
                ) : (
                  <View style={styles.previewLogoPlaceholder}>
                    <Ionicons name="image-outline" size={16} color="white" />
                  </View>
                )}
                <Text style={styles.previewHeaderText}>
                  {previewSource.companyName || 'Mak Pèsonèl'}
                </Text>
              </View>
            </View>
            <View style={styles.previewBody}>
              <View style={styles.previewBadge}>
                <View style={[styles.previewDot, { backgroundColor: previewSource.secondaryColor }]} />
                <Text style={styles.previewBadgeText}>Admin Dashboard</Text>
              </View>
              <Text style={styles.previewText}>
                Koulè prensipal: {previewSource.primaryColor}
              </Text>
              <Text style={styles.previewText}>
                Koulè sekondè: {previewSource.secondaryColor}
              </Text>
              <Text style={styles.previewText}>
                Twazyèm koulè: {previewSource.tertiaryColor}
              </Text>
            </View>
            <View style={styles.previewActions}>
              <Pressable
                onPress={handleTestBrand}
                style={[styles.previewButton, { backgroundColor: previewSource.secondaryColor }]}
              >
                <Text style={styles.previewButtonText}>Gade Preview Full</Text>
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

      <Modal
        visible={previewVisible}
        animationType="slide"
        onRequestClose={() => {
          setPreviewVisible(false);
          setPreviewData(null);
        }}
      >
        <SafeAreaView style={styles.previewModal}>
          <View style={styles.previewModalHeader}>
            <View style={styles.previewTitleRow}>
              <View style={[styles.previewLogoShell, { backgroundColor: previewSource.primaryColor }]}>
                {previewSource.logo ? (
                  <Image source={{ uri: previewSource.logo }} style={styles.previewLogoLarge} />
                ) : (
                  <Ionicons name="shield" size={18} color="white" />
                )}
              </View>
              <View>
                <Text style={styles.previewModalTitle}>
                  {previewSource.companyName || 'Mak Pèsonèl'}
                </Text>
                <Text style={styles.previewModalSubtitle}>Preview aplikasyon + dashboard</Text>
              </View>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                setPreviewVisible(false);
                setPreviewData(null);
              }}
            >
              <Ionicons name="close" size={20} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.previewModalContent}>
            <View style={styles.previewGrid}>
              <View style={styles.previewPanel}>
                <Text style={styles.previewPanelTitle}>Dashboard Admin</Text>
                <View style={styles.previewPanelBody}>
                  <View style={styles.previewAdminHeader}>
                    <View>
                      <Text style={styles.previewAdminTitle}>
                        {previewSource.companyName || 'Mak Pèsonèl'} Admin
                      </Text>
                      <Text style={styles.previewAdminSubtitle}>Dashboard</Text>
                    </View>
                    <View style={[styles.previewAdminBadge, { backgroundColor: previewSource.primaryColor }]}>
                      <Ionicons name="shield" size={12} color="white" />
                      <Text style={styles.previewAdminBadgeText}>Admin</Text>
                    </View>
                  </View>
                  <View style={styles.previewAdminCityCard}>
                    <Text style={styles.previewAdminCityLabel}>Vil ou jère:</Text>
                    <Text style={styles.previewAdminCityValue}>Pa gen vil asiye</Text>
                  </View>
                  <Text style={styles.previewAdminSectionTitle}>Estatistik</Text>
                  <View style={styles.previewAdminStatsGrid}>
                    {[
                      { label: 'Chofè Total', value: '1' },
                      { label: 'An Atant', value: '1' },
                      { label: 'Apwouve', value: '0' },
                      { label: 'Pasajè', value: '1' },
                      { label: 'Kous Total', value: '1' },
                      { label: 'Kous Fini', value: '0' },
                    ].map((stat) => (
                      <View key={stat.label} style={styles.previewAdminStatCard}>
                        <Text style={styles.previewAdminStatValue}>{stat.value}</Text>
                        <Text style={styles.previewAdminStatLabel}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={[styles.previewAdminRevenue, { backgroundColor: previewSource.primaryColor }]}>
                    <Text style={styles.previewAdminRevenueLabel}>Revni Total</Text>
                    <Text style={styles.previewAdminRevenueValue}>0 HTG</Text>
                    <Text style={styles.previewAdminRevenueNote}>Nan vil ou jère yo</Text>
                  </View>
                  <Text style={styles.previewAdminSectionTitle}>Aksyon Rapid</Text>
                  <View style={styles.previewAdminActions}>
                    {['Ajoute Chofè', 'Apwouve Chofè', 'Modifye Pri'].map((label) => (
                      <View key={label} style={styles.previewAdminActionCard}>
                        <Text style={styles.previewAdminActionText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.previewPanel}>
                <Text style={styles.previewPanelTitle}>Aplikasyon Chofè</Text>
                <View style={styles.phoneFrame}>
                  <View style={[styles.phoneHeader, { backgroundColor: previewSource.primaryColor }]}>
                    <Text style={styles.phoneHeaderText}>
                      {previewSource.companyName || 'Mak Pèsonèl'}
                    </Text>
                    <View style={[styles.phoneBadge, { backgroundColor: previewSource.secondaryColor }]}>
                      <Text style={styles.phoneBadgeText}>Chofè</Text>
                    </View>
                  </View>
                  <View style={styles.phoneBody}>
                    <View style={styles.previewHomeHeader}>
                      <Text style={styles.previewHomeTitle}>
                        Byenveni, Chofè
                      </Text>
                      <View style={[styles.previewHomeBadge, { backgroundColor: previewSource.secondaryColor }]}>
                        <Text style={styles.previewHomeBadgeText}>Offline</Text>
                      </View>
                    </View>
                    <View style={styles.previewMap} />
                    <View style={styles.previewHomeCards}>
                      <View style={styles.previewHomeCard} />
                      <View style={styles.previewHomeCard} />
                    </View>
                    <View style={[styles.previewHomeAction, { backgroundColor: previewSource.primaryColor }]}>
                      <Text style={styles.previewHomeActionText}>Kòmanse travay</Text>
                    </View>
                  </View>
                  <View style={styles.phoneTabs}>
                    <View style={[styles.phoneTab, { backgroundColor: previewSource.secondaryColor }]} />
                    <View style={styles.phoneTab} />
                    <View style={styles.phoneTab} />
                    <View style={styles.phoneTab} />
                    <View style={styles.phoneTab} />
                  </View>
                </View>
              </View>

              <View style={styles.previewPanel}>
                <Text style={styles.previewPanelTitle}>Aplikasyon Pasajè</Text>
                <View style={styles.phoneFrame}>
                  <View style={[styles.phoneHeader, { backgroundColor: previewSource.primaryColor }]}>
                    <Text style={styles.phoneHeaderText}>
                      {previewSource.companyName || 'Mak Pèsonèl'}
                    </Text>
                    <View style={[styles.phoneBadge, { backgroundColor: previewSource.tertiaryColor }]}>
                      <Text style={styles.phoneBadgeText}>Pasajè</Text>
                    </View>
                  </View>
                  <View style={styles.phoneBody}>
                    <View style={styles.previewHomeHeader}>
                      <Text style={styles.previewHomeTitle}>
                        Byenveni, Pasajè
                      </Text>
                      <View style={[styles.previewHomeBadge, { backgroundColor: previewSource.tertiaryColor }]}>
                        <Text style={styles.previewHomeBadgeText}>Aktif</Text>
                      </View>
                    </View>
                    <View style={styles.previewSearch} />
                    <View style={styles.previewMap} />
                    <View style={styles.previewHomeCards}>
                      <View style={styles.previewHomeCard} />
                    </View>
                    <View style={[styles.previewHomeAction, { backgroundColor: previewSource.primaryColor }]}>
                      <Text style={styles.previewHomeActionText}>Mande kous</Text>
                    </View>
                  </View>
                  <View style={styles.phoneTabs}>
                    <View style={[styles.phoneTab, { backgroundColor: previewSource.secondaryColor }]} />
                    <View style={styles.phoneTab} />
                    <View style={styles.phoneTab} />
                    <View style={styles.phoneTab} />
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={publishModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPublishModalVisible(false);
          setPublishTarget(null);
        }}
      >
        <View style={styles.publishOverlay}>
          <View style={styles.publishModal}>
            <Text style={styles.publishTitle}>Piblikasyon final</Text>
            <Text style={styles.publishSubtitle}>
              Konekte sou kont ou pou pibliye mak la sou {publishTarget === 'appstore' ? 'App Store' : 'Play Store'}.
            </Text>
            <View style={styles.publishActions}>
              <Pressable
                style={styles.publishActionButton}
                onPress={() => Linking.openURL('https://expo.dev/login')}
              >
                <Ionicons name="log-in-outline" size={18} color="white" />
                <Text style={styles.publishActionText}>Konekte Expo</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.publishActionButton,
                  { backgroundColor: publishTarget === 'appstore' ? '#111' : '#34A853' },
                ]}
                onPress={() => {
                  if (!publishTarget) return;
                  handleOpenPublishPortal(publishTarget);
                }}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="white" />
                <Text style={styles.publishActionText}>
                  {publishTarget === 'appstore' ? 'Konekte App Store Connect' : 'Konekte Play Console'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.publishNote}>
              Apre koneksyon, fini soumèt la sou kont la. Timeline lan mete ajou otomatikman.
            </Text>
            <Pressable
              style={styles.publishClose}
              onPress={() => {
                setPublishModalVisible(false);
                setPublishTarget(null);
              }}
            >
              <Text style={styles.publishCloseText}>Fèmen</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={testModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTestModalVisible(false)}
      >
        <View style={styles.publishOverlay}>
          <View style={styles.publishModal}>
            <Text style={styles.publishTitle}>Tester an dirèk</Text>
            <Text style={styles.publishSubtitle}>
              Nou pral lanse yon build tès pou kliyan an. Konekte, kreye build la, epi pataje lyen an.
            </Text>
            <View style={styles.publishActions}>
              <Pressable
                style={styles.publishActionButton}
                onPress={() => Linking.openURL('https://expo.dev/login')}
              >
                <Ionicons name="log-in-outline" size={18} color="white" />
                <Text style={styles.publishActionText}>Konekte Expo</Text>
              </Pressable>
              <Pressable
                style={[styles.publishActionButton, { backgroundColor: '#6C47FF' }]}
                onPress={() => {
                  Linking.openURL('https://expo.dev/builds');
                  updateTimelineStatus([
                    { key: 'build', status: 'fini' },
                    { key: 'qa', status: 'an tès' },
                  ]);
                }}
              >
                <Ionicons name="construct-outline" size={18} color="white" />
                <Text style={styles.publishActionText}>Lanse build tès</Text>
              </Pressable>
              <Pressable
                style={[styles.publishActionButton, { backgroundColor: Colors.success }]}
                onPress={() =>
                  updateTimelineStatus([
                    { key: 'qa', status: 'fini' },
                    { key: 'store', status: 'pare pou soumèt' },
                  ])
                }
              >
                <Ionicons name="checkmark-done-outline" size={18} color="white" />
                <Text style={styles.publishActionText}>Tès kliyan fini</Text>
              </Pressable>
            </View>
            <Text style={styles.publishNote}>
              Apre build la fin pare, ou ka pataje lyen tès la ak kliyan an (Android/iOS).
            </Text>
            <Pressable style={styles.publishClose} onPress={() => setTestModalVisible(false)}>
              <Text style={styles.publishCloseText}>Fèmen</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteTitle}>Siprime Mak Pèsonèl</Text>
            <Text style={styles.deleteSubtitle}>
              Ou vle efase mak "{deleteTarget?.brand_name}" nèt? Aksyon sa a pa ka retounen.
            </Text>
            {!!deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
            <View style={styles.deleteActions}>
              <Pressable style={styles.deleteCancel} onPress={() => setDeleteTarget(null)} disabled={deleteLoading}>
                <Text style={styles.deleteCancelText}>Anile</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteConfirm, deleteLoading && styles.buttonDisabled]}
                onPress={confirmDeleteBrand}
                disabled={deleteLoading}
              >
                <Text style={styles.deleteConfirmText}>
                  {deleteLoading ? 'Ap siprime...' : 'Siprime'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  editingBanner: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  editingBannerText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
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
  citySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  citySearchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
  },
  dropdownEmptyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  processCard: {
    marginTop: 20,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
    gap: 10,
  },
  processSteps: {
    gap: 10,
    marginTop: 8,
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 13,
    color: Colors.text,
  },
  publishCard: {
    marginTop: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
    gap: 10,
  },
  checklistCard: {
    marginTop: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
    gap: 10,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checklistProgress: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  checklistBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  checklistBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  checklistItems: {
    gap: 10,
  },
  checklistNote: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checklistItemDone: {
    opacity: 0.8,
  },
  checklistDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  checklistDotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checklistText: {
    fontSize: 13,
    color: Colors.text,
  },
  checklistTextDone: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  timelineCard: {
    marginTop: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
    gap: 10,
  },
  timelineList: {
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  timelineMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deliveryCard: {
    marginTop: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
    gap: 10,
  },
  testCard: {
    marginTop: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
    gap: 10,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#6C47FF',
  },
  testButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  deliveryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  deliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  deliveryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  publishRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  publishText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  publishReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publishReadyText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
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
  blockedText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.error,
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
  brandActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  editButtonText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  previewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  previewActionText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.error,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  previewButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  previewButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  previewModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewLogoShell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLogoLarge: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  previewModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  previewModalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  previewModalContent: {
    padding: 20,
  },
  previewGrid: {
    gap: 20,
  },
  previewPanel: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
    gap: 12,
  },
  previewPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  previewPanelHeader: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewPanelHeaderText: {
    color: 'white',
    fontWeight: '700',
  },
  previewBadgeInline: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewBadgeInlineText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  previewPanelBody: {
    gap: 12,
  },
  previewAdminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  previewAdminTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  previewAdminSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previewAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  previewAdminBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  previewAdminCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 10,
  },
  previewAdminCardLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  previewAdminCardValue: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 4,
  },
  previewAdminStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewAdminStat: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 10,
  },
  previewAdminStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  previewAdminStatLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previewAdminRevenue: {
    borderRadius: 12,
    padding: 12,
  },
  previewAdminRevenueLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  previewAdminRevenueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginTop: 6,
  },
  previewAdminRevenueNote: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  previewAdminCityCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 10,
  },
  previewAdminCityLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  previewAdminCityValue: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 4,
  },
  previewAdminSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  previewAdminStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewAdminStatCard: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 10,
  },
  previewAdminActions: {
    flexDirection: 'row',
    gap: 8,
  },
  previewAdminActionCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  previewAdminActionText: {
    fontSize: 9,
    color: Colors.text,
    textAlign: 'center',
  },
  previewList: {
    gap: 8,
  },
  previewListItem: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  previewStatRow: {
    flexDirection: 'row',
    gap: 12,
  },
  previewStatCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  previewStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  previewStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
  },
  previewCta: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  previewCtaText: {
    color: 'white',
    fontWeight: '600',
  },
  phoneFrame: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  phoneHeader: {
    padding: 12,
  },
  phoneHeaderText: {
    color: 'white',
    fontWeight: '700',
  },
  phoneBody: {
    padding: 12,
    gap: 10,
  },
  previewHomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewHomeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  previewHomeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewHomeBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
  previewSearch: {
    height: 18,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  previewMap: {
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  previewHomeCards: {
    flexDirection: 'row',
    gap: 8,
  },
  previewHomeCard: {
    flex: 1,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  previewHomeAction: {
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  previewHomeActionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  roleHeader: {
    alignItems: 'center',
    gap: 4,
  },
  roleLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  roleSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  roleCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
  },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  roleCardDesc: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
  phoneBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  phoneBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  phoneSearch: {
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  phoneMap: {
    height: 120,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  phoneCard: {
    height: 120,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  phoneCardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneList: {
    gap: 8,
  },
  phoneListItem: {
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  phoneStat: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  phoneTabs: {
    flexDirection: 'row',
    gap: 6,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  phoneTab: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.border,
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  deleteModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    ...Shadows.small,
  },
  deleteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  deleteSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  deleteError: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 8,
  },
  deleteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  deleteCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  deleteCancelText: {
    color: Colors.text,
    fontWeight: '600',
  },
  deleteConfirm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.error,
  },
  deleteConfirmText: {
    color: 'white',
    fontWeight: '600',
  },
  publishOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  publishModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    ...Shadows.small,
  },
  publishTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  publishSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  publishActions: {
    gap: 10,
  },
  publishActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  publishActionText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  publishNote: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  publishClose: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  publishCloseText: {
    color: Colors.text,
    fontSize: 12,
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
