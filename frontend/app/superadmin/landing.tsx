import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { landingAPI, type FooterData, type WhiteLabelRequest } from '../../src/services/api';

const LANDING_KEYS = [
  { key: 'hero_title', label: 'Hero - Tit', section: 'Hero' },
  { key: 'hero_subtitle', label: 'Hero - Sous-tit', section: 'Hero' },
  { key: 'hero_btn1', label: 'Hero - Bouton 1', section: 'Hero' },
  { key: 'hero_btn2', label: 'Hero - Bouton 2', section: 'Hero' },
  { key: 'problem_title', label: 'Pwoblèm - Tit', section: 'Problem' },
  { key: 'problem_subtitle', label: 'Pwoblèm - Sous-tit', section: 'Problem' },
  { key: 'problem_text', label: 'Pwoblèm - Tèks', section: 'Problem' },
  { key: 'solution_text', label: 'Solisyon - Tèks', section: 'Problem' },
  { key: 'features_title', label: 'Fonksyonalite - Tit', section: 'Features' },
  { key: 'features_subtitle', label: 'Fonksyonalite - Sous-tit', section: 'Features' },
  { key: 'feature_1_title', label: 'Fonksyon 1 - Tit', section: 'Features' },
  { key: 'feature_1_text', label: 'Fonksyon 1 - Tèks', section: 'Features' },
  { key: 'feature_2_title', label: 'Fonksyon 2 - Tit', section: 'Features' },
  { key: 'feature_2_text', label: 'Fonksyon 2 - Tèks', section: 'Features' },
  { key: 'feature_3_title', label: 'Fonksyon 3 - Tit', section: 'Features' },
  { key: 'feature_3_text', label: 'Fonksyon 3 - Tèks', section: 'Features' },
  { key: 'feature_4_title', label: 'Fonksyon 4 - Tit', section: 'Features' },
  { key: 'feature_4_text', label: 'Fonksyon 4 - Tèks', section: 'Features' },
  { key: 'feature_5_title', label: 'Fonksyon 5 - Tit', section: 'Features' },
  { key: 'feature_5_text', label: 'Fonksyon 5 - Tèks', section: 'Features' },
  { key: 'feature_6_title', label: 'Fonksyon 6 - Tit', section: 'Features' },
  { key: 'feature_6_text', label: 'Fonksyon 6 - Tèks', section: 'Features' },
  { key: 'how_title', label: 'Kòman - Tit', section: 'How' },
  { key: 'how_subtitle', label: 'Kòman - Sous-tit', section: 'How' },
  { key: 'step_1_title', label: 'Etap 1 - Tit', section: 'How' },
  { key: 'step_1_text', label: 'Etap 1 - Tèks', section: 'How' },
  { key: 'step_2_title', label: 'Etap 2 - Tit', section: 'How' },
  { key: 'step_2_text', label: 'Etap 2 - Tèks', section: 'How' },
  { key: 'step_3_title', label: 'Etap 3 - Tit', section: 'How' },
  { key: 'step_3_text', label: 'Etap 3 - Tèks', section: 'How' },
  { key: 'step_4_title', label: 'Etap 4 - Tit', section: 'How' },
  { key: 'step_4_text', label: 'Etap 4 - Tèks', section: 'How' },
  { key: 'apps_title', label: 'Apps - Tit', section: 'Apps' },
  { key: 'apps_subtitle', label: 'Apps - Sous-tit', section: 'Apps' },
  { key: 'app_unified_title', label: 'App - Tit (yon app tout moun)', section: 'Apps' },
  { key: 'app_unified_text', label: 'App - Tèks deskripsyon', section: 'Apps' },
  { key: 'white_label_title', label: 'White-Label - Tit', section: 'White' },
  { key: 'white_label_intro', label: 'White-Label - Entwodiksyon', section: 'White' },
  { key: 'why_title', label: 'Poukisa - Tit', section: 'Why' },
  { key: 'why_subtitle', label: 'Poukisa - Sous-tit', section: 'Why' },
  { key: 'benefit_1_title', label: 'Benefis 1 - Tit', section: 'Why' },
  { key: 'benefit_1_text', label: 'Benefis 1 - Tèks', section: 'Why' },
  { key: 'benefit_2_title', label: 'Benefis 2 - Tit', section: 'Why' },
  { key: 'benefit_2_text', label: 'Benefis 2 - Tèks', section: 'Why' },
  { key: 'benefit_3_title', label: 'Benefis 3 - Tit', section: 'Why' },
  { key: 'benefit_3_text', label: 'Benefis 3 - Tèks', section: 'Why' },
  { key: 'benefit_4_title', label: 'Benefis 4 - Tit', section: 'Why' },
  { key: 'benefit_4_text', label: 'Benefis 4 - Tèks', section: 'Why' },
];

const SECTION_LABELS: Record<string, string> = {
  Hero: 'Seksyon Hero',
  Problem: 'Pwoblèm & Solisyon',
  Features: 'Fonksyonalite',
  How: 'Kòman Sa Mache',
  Apps: 'Aplikasyon',
  White: 'Marque Pwop Ou',
  Why: 'Poukisa Chwazi Nou',
};

const DEFAULT_FOOTER: FooterData = {
  brand_title: 'TapTapGo',
  brand_text: 'Transpò rapid, sekirize, ak pri klè pou tout Ayiti. Moto ak machin disponib 24/7.',
  copyright: '© 2026 TapTapGo. Tout dwa rezève. Fèt ak ❤️ pou Ayiti.',
  columns: [
    { title: 'Aplikasyon', links: [{ label: 'App Pasajè', href: '#aplikasyon' }, { label: 'App Chofè', href: '#aplikasyon' }, { label: 'Marque Pwop Ou', href: '#marque-pwop' }] },
    { title: 'Konpayi', links: [{ label: 'Fonksyonalite', href: '#fonksyonalite' }, { label: 'Sou Nou', href: '#lakay' }, { label: 'Sit Lakay', href: '/' }] },
    { title: 'Sipò', links: [{ label: 'Sant Èd', href: '/' }, { label: 'Kontakte Nou', href: '#kontak' }, { label: 'Politik Konfidansyalite', href: '/' }] },
  ],
};

export default function SuperAdminLanding() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [footer, setFooter] = useState<FooterData>(DEFAULT_FOOTER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [whitelabelRequests, setWhitelabelRequests] = useState<WhiteLabelRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchWhitelabelRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await landingAPI.whitelabelRequests();
      setWhitelabelRequests(res.data?.requests || []);
    } catch (e) {
      console.error('Fetch whitelabel requests error:', e);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleProcessRequest = async (req: WhiteLabelRequest) => {
    setProcessingId(req.id);
    try {
      await landingAPI.processWhitelabelRequest(req.id, 'processed');
      setWhitelabelRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'processed' as const } : r)));
    } catch (e: any) {
      Alert.alert('Erè', e?.response?.data?.detail || 'Pa kapab traite.');
    } finally {
      setProcessingId(null);
    }
  };

  const fetchContent = async () => {
    try {
      const res = await landingAPI.get();
      setContent(res.data?.content || {});
      if (res.data?.footer && Array.isArray(res.data.footer.columns)) {
        setFooter(res.data.footer);
      }
    } catch (e) {
      console.error('Fetch landing error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await landingAPI.update(content, footer);
      Alert.alert('Siksè', 'Landing la modifye avèk siksè.');
    } catch (e: any) {
      Alert.alert('Erè', e?.response?.data?.detail || 'Pa kapab anregistre.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reyinite Landing',
      'Ou vle reyinite tout modifikasyon epi retounen nan tèks orijinal?',
      [
        { text: 'Anile', style: 'cancel' },
        {
          text: 'Reyinite',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              const res = await landingAPI.reset();
              setContent(res.data?.content || {});
              if (res.data?.footer) setFooter(res.data.footer);
              Alert.alert('Siksè', 'Landing la reyinite.');
            } catch (e) {
              Alert.alert('Erè', 'Pa kapab reyinite.');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  const openLanding = () => {
    const isLocal = Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const url = isLocal ? 'http://localhost:3000' : 'https://taptapgoht.com';
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chajman...</Text>
      </View>
    );
  }

  const sections = Array.from(new Set(LANDING_KEYS.map((k) => k.section)));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Gere Sit (Landing Page)</Text>
        <Text style={styles.subtitle}>Modifye, korekte, oswa reyinite tout tèks sou landing la.</Text>
        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="save" size={18} color="white" />}
            <Text style={styles.btnTextPrimary}>Anregistre</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnDanger]}
            onPress={handleReset}
            disabled={resetting}
          >
            {resetting ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="refresh" size={18} color="white" />}
            <Text style={styles.btnTextPrimary}>Reyinite</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={openLanding}>
            <Ionicons name="open-outline" size={18} color={Colors.primary} />
            <Text style={styles.btnTextSecondary}>Gade Landing</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, { backgroundColor: Colors.secondary }]}
            onPress={fetchWhitelabelRequests}
            disabled={loadingRequests}
          >
            {loadingRequests ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="mail-unread" size={18} color="white" />}
            <Text style={styles.btnTextPrimary}>Gade demann White-Label</Text>
          </Pressable>
        </View>
      </View>

      {whitelabelRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demann White-Label ({whitelabelRequests.filter((r) => r.status === 'pending').length} an atant)</Text>
          {whitelabelRequests.map((req) => (
            <View key={req.id} style={[styles.footerColumn, { marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Text style={[styles.label, { fontSize: 16 }]}>{req.company} — {req.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={[styles.smallBtn, { backgroundColor: req.status === 'pending' ? Colors.primary : Colors.textSecondary }]}>
                    <Text style={styles.smallBtnText}>{req.status === 'pending' ? 'An atant' : 'Traitée'}</Text>
                  </View>
                  {req.status === 'pending' && (
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: Colors.primary }]}
                      onPress={() => handleProcessRequest(req)}
                      disabled={processingId === req.id}
                    >
                      {processingId === req.id ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="checkmark" size={16} color="white" />}
                      <Text style={styles.smallBtnText}>Traite</Text>
                    </Pressable>
                  )}
                </View>
              </View>
              <Text style={{ color: Colors.textSecondary, fontSize: 13, marginBottom: 4 }}>📞 {req.phone} · ✉️ {req.email}</Text>
              <Text style={{ color: Colors.textSecondary, fontSize: 13, marginBottom: 4 }}>📍 {req.zone}</Text>
              {req.message ? <Text style={{ color: Colors.text, fontSize: 13, marginTop: 6 }}>{req.message}</Text> : null}
              {req.website ? <Text style={{ color: Colors.primary, fontSize: 12, marginTop: 4 }}>{req.website}</Text> : null}
              {req.drivers_estimate ? <Text style={{ color: Colors.textSecondary, fontSize: 12, marginTop: 4 }}>~{req.drivers_estimate} chofè</Text> : null}
              <Text style={{ color: Colors.textSecondary, fontSize: 11, marginTop: 8 }}>{new Date(req.created_at).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      {sections.map((section) => (
        <View key={section} style={styles.section}>
          <Text style={styles.sectionTitle}>{SECTION_LABELS[section] || section}</Text>
          {LANDING_KEYS.filter((k) => k.section === section).map((item) => (
            <View key={item.key} style={styles.field}>
              <Text style={styles.label}>{item.label}</Text>
              <TextInput
                style={styles.input}
                value={content[item.key] ?? ''}
                onChangeText={(t) => setContent((c) => ({ ...c, [item.key]: t }))}
                placeholder={`Tèks pou ${item.label}`}
                placeholderTextColor={Colors.textSecondary}
                multiline={item.key.includes('_text') || item.key.includes('intro') || item.key.includes('subtitle')}
                numberOfLines={item.key.includes('_text') || item.key.includes('intro') ? 3 : 1}
              />
            </View>
          ))}
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kontwòl Footer — tout bouton ak tèks</Text>
        <Text style={[styles.label, { marginBottom: 12 }]}>Tit marque · Tèks · Copyright</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Tit (footer)</Text>
          <TextInput
            style={styles.input}
            value={footer.brand_title}
            onChangeText={(t) => setFooter((f) => ({ ...f, brand_title: t }))}
            placeholder="TapTapGo"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Tèks deskripsyon (footer)</Text>
          <TextInput
            style={[styles.input, { minHeight: 70 }]}
            value={footer.brand_text}
            onChangeText={(t) => setFooter((f) => ({ ...f, brand_text: t }))}
            placeholder="Transpò rapid..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Copyright (anba paj)</Text>
          <TextInput
            style={styles.input}
            value={footer.copyright}
            onChangeText={(t) => setFooter((f) => ({ ...f, copyright: t }))}
            placeholder="© 2026 TapTapGo..."
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 8 }]}>Kolòn ak lyen</Text>
        {footer.columns.map((col, colIndex) => (
          <View key={colIndex} style={[styles.footerColumn, { marginBottom: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={[styles.label, { flex: 1 }]}>Tit kolòn {colIndex + 1}</Text>
              <Pressable
                style={[styles.smallBtn, { backgroundColor: Colors.error }]}
                onPress={() =>
                  setFooter((f) => ({
                    ...f,
                    columns: f.columns.filter((_, i) => i !== colIndex),
                  }))
                }
              >
                <Ionicons name="trash-outline" size={16} color="white" />
                <Text style={styles.smallBtnText}>Efase kolòn</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              value={col.title}
              onChangeText={(t) =>
                setFooter((f) => ({
                  ...f,
                  columns: f.columns.map((c, i) => (i === colIndex ? { ...c, title: t } : c)),
                }))
              }
              placeholder="Egz: Aplikasyon"
              placeholderTextColor={Colors.textSecondary}
            />
            {(col.links || []).map((link, linkIndex) => (
              <View key={linkIndex} style={styles.linkRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={link.label}
                  onChangeText={(t) =>
                    setFooter((f) => ({
                      ...f,
                      columns: f.columns.map((c, i) =>
                        i === colIndex
                          ? { ...c, links: c.links.map((l, j) => (j === linkIndex ? { ...l, label: t } : l)) }
                          : c
                      ),
                    }))
                  }
                  placeholder="Tèks lyen"
                  placeholderTextColor={Colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={link.href}
                  onChangeText={(t) =>
                    setFooter((f) => ({
                      ...f,
                      columns: f.columns.map((c, i) =>
                        i === colIndex
                          ? { ...c, links: c.links.map((l, j) => (j === linkIndex ? { ...l, href: t } : l)) }
                          : c
                      ),
                    }))
                  }
                  placeholder="#aplikasyon ou /paj"
                  placeholderTextColor={Colors.textSecondary}
                />
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: Colors.error }]}
                  onPress={() =>
                    setFooter((f) => ({
                      ...f,
                      columns: f.columns.map((c, i) =>
                        i === colIndex ? { ...c, links: c.links.filter((_, j) => j !== linkIndex) } : c
                      ),
                    }))
                  }
                >
                  <Ionicons name="close" size={18} color="white" />
                </Pressable>
              </View>
            ))}
            <Pressable
              style={[styles.smallBtn, { backgroundColor: Colors.primary, alignSelf: 'flex-start', marginTop: 6 }]}
              onPress={() =>
                setFooter((f) => ({
                  ...f,
                  columns: f.columns.map((c, i) =>
                    i === colIndex ? { ...c, links: [...c.links, { label: 'Nouvo lyen', href: '#' }] } : c
                  ),
                }))
              }
            >
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.smallBtnText}>Ajoute lyen</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          style={[styles.smallBtn, { backgroundColor: Colors.secondary, marginTop: 8 }]}
          onPress={() =>
            setFooter((f) => ({
              ...f,
              columns: [...f.columns, { title: 'Nouvo kolòn', links: [{ label: 'Lyen 1', href: '#' }] }],
            }))
          }
        >
          <Ionicons name="add" size={18} color="white" />
          <Text style={styles.smallBtnText}>Ajoute kolòn</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, color: Colors.textSecondary },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  btnPrimary: { backgroundColor: Colors.primary, ...Shadows.small },
  btnDanger: { backgroundColor: Colors.error, ...Shadows.small },
  btnSecondary: { backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.primary },
  btnTextPrimary: { color: 'white', fontWeight: '600', fontSize: 14 },
  btnTextSecondary: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  section: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, ...Shadows.small },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.secondary, marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 44,
  },
  footerColumn: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  smallBtnText: { color: 'white', fontWeight: '600', fontSize: 12 },
});
