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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { landingAPI, supportMessagesAPI, type FooterData, type SupportMessage, type WhiteLabelRequest } from '../../src/services/api';

const LANDING_KEYS = [
  { key: 'hero_title', label: 'Hero - Tit', section: 'Hero' },
  { key: 'hero_subtitle', label: 'Hero - Sous-tit', section: 'Hero' },
  { key: 'hero_btn1', label: 'Hero - Bouton 1', section: 'Hero' },
  { key: 'hero_btn2', label: 'Hero - Bouton 2', section: 'Hero' },
  { key: 'sou_nou_content', label: 'Sou Nou - Kontni konplè (istwa, sa nou fè, sekirite, tèstimoni, kontak)', section: 'SouNou' },
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
  { key: 'vehicle_images_title', label: 'Transpò - Tit (imaj)', section: 'VehicleImages' },
  { key: 'vehicle_images_subtitle', label: 'Transpò - Sous-tit (imaj)', section: 'VehicleImages' },
];

const SECTION_LABELS: Record<string, string> = {
  Hero: 'Seksyon Hero',
  SouNou: 'Sou Nou (istwa, sa nou fè, solisyon, poukisa chwazi nou)',
  Problem: 'Pwoblèm & Solisyon',
  Features: 'Fonksyonalite',
  How: 'Kòman Sa Mache',
  Apps: 'Aplikasyon',
  White: 'Marque Pwop Ou',
  Why: 'Poukisa Chwazi Nou',
  VehicleImages: 'Transpò — Imaj (Chofè+Pasajè, Moto, Machin)',
};

const DEFAULT_FOOTER: FooterData = {
  brand_title: 'TapTapGo',
  brand_text: 'Transpò rapid, sekirize, ak pri klè pou tout Ayiti. Moto ak machin disponib 24/7.',
  copyright: '© 2026 TapTapGo. Tout dwa rezève. Fèt ak ❤️ pou Ayiti.',
  play_store_url: 'https://play.google.com/store/apps/details?id=com.taptapgo.app',
  app_store_url: 'https://apps.apple.com/app/taptapgo',
  direct_apk_url: '',
  whitelabel_confirm_subject: 'TapTapGo — Nou resevwa demann ou (Marque Pwop Ou)',
  whitelabel_confirm_body: 'Bonjou {{name}},\n\nMèsi paske ou te voye demann ou pou {{company}} ({{zone}}).\n\nNou resevwa li byen. Yon nan ekspè nou nan depatman an ap kontakte w pou yon kout diskisyon.\n\nNou ap reponn ou byento!\n\nBonjou,\nEkip TapTapGo',
  support_sant_ed_content: 'Kijan mwen mande yon kous?\nOuvri app TapTapGo, antre adrès ou ak kote w prale. Konfime pri a epi chofè a ap vin pran w.\n\nKijan mwen peye?\nOu kapab peye avèk MonCash, NatCash, kach oswa lòt metòd disponib nan app la.',
  support_kontak_content: 'TapTapGo — Kontakte Nou\n\n• Telefòn sipò: +509 XX XX XX XX\n• WhatsApp: +509 XX XX XX XX\n• Imèl: sipò@taptapgoht.com\n\nLè nou ouvri: 24/7',
  support_politik_content: 'Politik Konfidansyalite — TapTapGo\n\nKontni chaje depi API...',
  support_video_url: '',
  image_ride_url: '',
  image_moto_url: '',
  image_auto_url: '',
  columns: [
    { title: 'Aplikasyon', links: [{ label: 'App Pasajè', href: '#aplikasyon' }, { label: 'App Chofè', href: '#aplikasyon' }, { label: 'Marque Pwop Ou', href: '#marque-pwop' }] },
    { title: 'Konpayi', links: [{ label: 'Fonksyonalite', href: '#fonksyonalite' }, { label: 'Sou Nou', href: '#sou-nou' }] },
    { title: 'Sipò', links: [{ label: 'Sant Èd', href: '#sant-ed' }, { label: 'Kontakte Nou', href: '#kontakte-nou' }, { label: 'Politik Konfidansyalite', href: '#politik' }] },
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
  const [openRequest, setOpenRequest] = useState<WhiteLabelRequest | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [loadingSupportMessages, setLoadingSupportMessages] = useState(false);
  const [openSupportMessage, setOpenSupportMessage] = useState<SupportMessage | null>(null);
  const [supportEmailSubject, setSupportEmailSubject] = useState('');
  const [supportEmailMessage, setSupportEmailMessage] = useState('');
  const [sendingSupportEmail, setSendingSupportEmail] = useState(false);
  const [supportAdminNotes, setSupportAdminNotes] = useState('');

  const fetchSupportMessages = async () => {
    setLoadingSupportMessages(true);
    try {
      const res = await supportMessagesAPI.list();
      setSupportMessages(res.data?.messages || []);
    } catch (e) {
      console.error('Fetch support messages error:', e);
    } finally {
      setLoadingSupportMessages(false);
    }
  };

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

  const handleCancelRequest = async (req: WhiteLabelRequest) => {
    setProcessingId(req.id);
    try {
      await landingAPI.processWhitelabelRequest(req.id, 'cancelled');
      setWhitelabelRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'cancelled' as const } : r)));
      setOpenRequest((o) => (o?.id === req.id ? { ...o, status: 'cancelled' } : o));
    } catch (e: any) {
      Alert.alert('Erè', e?.response?.data?.detail || 'Pa kapab anile.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (req: WhiteLabelRequest) => {
    setProcessingId(req.id);
    try {
      await landingAPI.processWhitelabelRequest(req.id, 'rejected');
      setWhitelabelRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'rejected' as const } : r)));
      setOpenRequest((o) => (o?.id === req.id ? { ...o, status: 'rejected' } : o));
    } catch (e: any) {
      Alert.alert('Erè', e?.response?.data?.detail || 'Pa kapab refize.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendSupportEmail = async () => {
    if (!openSupportMessage) return;
    const msg = supportEmailMessage.trim();
    if (!msg) {
      Alert.alert('Erè', 'Ou dwe ekri yon mesaj.');
      return;
    }
    setSendingSupportEmail(true);
    try {
      await supportMessagesAPI.sendEmail(
        openSupportMessage.id,
        supportEmailSubject.trim() || `TapTapGo — Repons pou mesaj ou`,
        msg
      );
      Alert.alert('Siksè', 'Imèl la voye. Moun lan ap resevwa li.');
      setSupportMessages((prev) => prev.map((m) => (m.id === openSupportMessage.id ? { ...m, status: 'replied' as const } : m)));
      setOpenSupportMessage((o) => (o?.id === openSupportMessage.id ? { ...o, status: 'replied' } : o));
      setSupportEmailSubject('');
      setSupportEmailMessage('');
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Pa kapab voye imèl la.';
      Alert.alert('Erè', typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setSendingSupportEmail(false);
    }
  };

  const handleUpdateSupportStatus = async (msg: SupportMessage, status: string) => {
    try {
      await supportMessagesAPI.update(msg.id, { status });
      setSupportMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: status as SupportMessage['status'] } : m)));
      if (openSupportMessage?.id === msg.id) setOpenSupportMessage({ ...openSupportMessage, status: status as SupportMessage['status'] });
    } catch (e: any) {
      Alert.alert('Erè', e?.response?.data?.detail || 'Pa kapab mete ajou.');
    }
  };

  const handleDeleteRequest = (req: WhiteLabelRequest) => {
    const msg = req.status === 'processed'
      ? 'Demann sa a te deja tratée. Ou vle efase li (egzanp: si w te fè erè)?'
      : 'Ou sèten ou vle efase demann sa a? Aksyon sa a pa ka defèt.';
    Alert.alert('Efase demann', msg, [
      { text: 'Anile', style: 'cancel' },
      {
        text: 'Efase',
        style: 'destructive',
        onPress: async () => {
          setProcessingId(req.id);
          try {
            await landingAPI.deleteWhitelabelRequest(req.id);
            setWhitelabelRequests((prev) => prev.filter((r) => r.id !== req.id));
            setOpenRequest((o) => (o?.id === req.id ? null : o));
          } catch (e: any) {
            Alert.alert('Erè', e?.response?.data?.detail || 'Pa kapab efase.');
          } finally {
            setProcessingId(null);
          }
        },
      },
    ]);
  };

  const fetchContent = async () => {
    try {
      const res = await landingAPI.get();
      setContent(res.data?.content || {});
      const f = res.data?.footer;
      if (f) {
        setFooter({
          ...DEFAULT_FOOTER,
          ...f,
          columns: Array.isArray(f.columns) ? f.columns : DEFAULT_FOOTER.columns,
          support_politik_content: f.support_politik_content ?? DEFAULT_FOOTER.support_politik_content ?? '',
        });
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

  const handleSendEmail = async () => {
    if (!openRequest) return;
    const subj = emailSubject.trim();
    const msg = emailMessage.trim();
    if (!msg) {
      Alert.alert('Erè', 'Ou dwe ekri yon mesaj.');
      return;
    }
    setSendingEmail(true);
    try {
      await landingAPI.sendWhitelabelEmail(openRequest.id, subj || `TapTapGo - Demann Marque Pwop Ou - ${openRequest.company}`, msg);
      Alert.alert('Siksè', 'Imèl la voye. Moun lan ap resevwa li nan imèl li.');
      setEmailSubject('');
      setEmailMessage('');
    } catch (e: any) {
      Alert.alert('Erè', e?.response?.data?.detail || 'Pa kapab voye imèl la.');
    } finally {
      setSendingEmail(false);
    }
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
          <Pressable
            style={[styles.btn, { backgroundColor: Colors.secondary }]}
            onPress={fetchSupportMessages}
            disabled={loadingSupportMessages}
          >
            {loadingSupportMessages ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="chatbubbles" size={18} color="white" />}
            <Text style={styles.btnTextPrimary}>Mesaj Sipò (Sant Èd)</Text>
          </Pressable>
        </View>
      </View>

      {supportMessages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mesaj Sipò (soti Sant Èd) — {supportMessages.filter((m) => m.status === 'pending').length} an atant</Text>
          {supportMessages.map((msg) => (
            <Pressable
              key={msg.id}
              style={[styles.footerColumn, { marginBottom: 12 }]}
              onPress={() => {
                setOpenSupportMessage(msg);
                setSupportAdminNotes(msg.admin_notes || '');
                setSupportEmailSubject(`TapTapGo — Repons pou mesaj ou`);
                setSupportEmailMessage(
                  `Bonjou ${msg.name},\n\nNou resevwa mesaj ou. ${msg.message ? `Ou te ekri:\n"${msg.message}"\n\n` : ''}Nou ap ede w. Si w gen lòt kesyon, kontakte nou.\n\nBonjou,\nEkip TapTapGo`
                );
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Text style={[styles.label, { fontSize: 16 }]}>{msg.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <View
                    style={[
                      styles.smallBtn,
                      {
                        backgroundColor:
                          msg.status === 'pending' ? Colors.warning : msg.status === 'replied' ? Colors.success : Colors.textSecondary,
                      },
                    ]}
                  >
                    <Text style={styles.smallBtnText}>
                      {msg.status === 'pending' ? 'An atant' : msg.status === 'replied' ? 'Reponn' : msg.status === 'read' ? 'Li' : 'Archive'}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.smallBtn, { backgroundColor: Colors.secondary }]}
                    onPress={() => {
                      setOpenSupportMessage(msg);
                      setSupportAdminNotes(msg.admin_notes || '');
                      setSupportEmailSubject(`TapTapGo — Repons pou mesaj ou`);
                      setSupportEmailMessage(
                        `Bonjou ${msg.name},\n\nNou resevwa mesaj ou. ${msg.message ? `Ou te ekri:\n"${msg.message}"\n\n` : ''}Nou ap ede w. Si w gen lòt kesyon, kontakte nou.\n\nBonjou,\nEkip TapTapGo`
                      );
                    }}
                  >
                    <Ionicons name="open-outline" size={16} color="white" />
                    <Text style={styles.smallBtnText}>Ouvri / Reponn</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={{ color: Colors.textSecondary, fontSize: 13, marginBottom: 4 }}>📞 {msg.phone} · ✉️ {msg.email}</Text>
              <Text style={{ color: Colors.text, fontSize: 13, marginTop: 6 }}>{msg.message}</Text>
              <Text style={{ color: Colors.textSecondary, fontSize: 11, marginTop: 8 }}>{new Date(msg.created_at).toLocaleString()}</Text>
              {msg.admin_notes ? <Text style={{ color: Colors.textSecondary, fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>Nòt: {msg.admin_notes}</Text> : null}
            </Pressable>
          ))}
        </View>
      )}

      {whitelabelRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demann White-Label ({whitelabelRequests.filter((r) => r.status === 'pending').length} an atant)</Text>
          {whitelabelRequests.map((req) => (
            <View key={req.id} style={[styles.footerColumn, { marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Text style={[styles.label, { fontSize: 16 }]}>{req.company} — {req.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <View
                    style={[
                      styles.smallBtn,
                      {
                        backgroundColor:
                          req.status === 'pending'
                            ? Colors.primary
                            : req.status === 'cancelled'
                              ? '#6B7280'
                              : req.status === 'rejected'
                                ? Colors.error
                                : Colors.textSecondary,
                      },
                    ]}
                  >
                    <Text style={styles.smallBtnText}>
                      {req.status === 'pending'
                        ? 'An atant'
                        : req.status === 'cancelled'
                          ? 'Anile'
                          : req.status === 'rejected'
                            ? 'Refize'
                            : 'Traitée'}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.smallBtn, { backgroundColor: Colors.secondary }]}
                    onPress={() => {
                      setOpenRequest(req);
                      setEmailSubject(`TapTapGo - Demann Marque Pwop Ou - ${req.company}`);
                      setEmailMessage(
                        `Bonjou ${req.name},\n\nNou resevwa demann ou pou ${req.company} (${req.zone}).\n\n${req.message ? `Ou te ekri:\n"${req.message}"\n\n` : ''}Nou ap kontakte w byento pou diskite sou pwojè a.\n\nBonjou,\nEkip TapTapGo`
                      );
                    }}
                  >
                    <Ionicons name="open-outline" size={16} color="white" />
                    <Text style={styles.smallBtnText}>Ouvri demann lan</Text>
                  </Pressable>
                  {req.status === 'pending' && (
                    <>
                      <Pressable
                        style={[styles.smallBtn, { backgroundColor: Colors.primary }]}
                        onPress={() => handleProcessRequest(req)}
                        disabled={processingId === req.id}
                      >
                        {processingId === req.id ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="checkmark" size={16} color="white" />}
                        <Text style={styles.smallBtnText}>Traite</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.smallBtn, { backgroundColor: '#6B7280' }]}
                        onPress={() => handleCancelRequest(req)}
                        disabled={processingId === req.id}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="white" />
                        <Text style={styles.smallBtnText}>Anile</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.smallBtn, { backgroundColor: Colors.error }]}
                        onPress={() => handleRejectRequest(req)}
                        disabled={processingId === req.id}
                      >
                        <Ionicons name="ban-outline" size={16} color="white" />
                        <Text style={styles.smallBtnText}>Refize</Text>
                      </Pressable>
                    </>
                  )}
                  <Pressable
                    style={[styles.smallBtn, { backgroundColor: Colors.error, opacity: processingId === req.id ? 0.7 : 1 }]}
                    onPress={() => handleDeleteRequest(req)}
                    disabled={processingId === req.id}
                  >
                    <Ionicons name="trash-outline" size={16} color="white" />
                    <Text style={styles.smallBtnText}>Efase</Text>
                  </Pressable>
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

      <Modal
        visible={!!openRequest}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setOpenRequest(null);
          setEmailSubject('');
          setEmailMessage('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {openRequest && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.modalTitle}>Demann — {openRequest.company}</Text>
                  <Pressable
                    onPress={() => {
                      setOpenRequest(null);
                      setEmailSubject('');
                      setEmailMessage('');
                    }}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalLabel}>Non responsab</Text>
                  <Text style={styles.modalValue}>{openRequest.name}</Text>
                  <Text style={styles.modalLabel}>Telefòn</Text>
                  <Text style={styles.modalValue}>{openRequest.phone}</Text>
                  <Text style={styles.modalLabel}>Imèl</Text>
                  <Text style={[styles.modalValue, { color: Colors.primary }]}>{openRequest.email}</Text>
                  <Text style={styles.modalLabel}>Vil / Zòn</Text>
                  <Text style={styles.modalValue}>{openRequest.zone}</Text>
                  {openRequest.website ? (
                    <>
                      <Text style={styles.modalLabel}>Sitwèb</Text>
                      <Text style={[styles.modalValue, { color: Colors.primary }]}>{openRequest.website}</Text>
                    </>
                  ) : null}
                  {openRequest.drivers_estimate ? (
                    <>
                      <Text style={styles.modalLabel}>Chofè estime</Text>
                      <Text style={styles.modalValue}>~{openRequest.drivers_estimate}</Text>
                    </>
                  ) : null}
                  {openRequest.message ? (
                    <>
                      <Text style={styles.modalLabel}>Mesaj</Text>
                      <Text style={styles.modalValue}>{openRequest.message}</Text>
                    </>
                  ) : null}
                  <Text style={[styles.modalLabel, { marginTop: 8 }]}>{new Date(openRequest.created_at).toLocaleString()}</Text>
                </ScrollView>
                <Text style={[styles.label, { marginTop: 16, marginBottom: 8 }]}>Voye imèl bay {openRequest.name} ({openRequest.email})</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Sijè</Text>
                  <TextInput
                    style={styles.input}
                    value={emailSubject}
                    onChangeText={setEmailSubject}
                    placeholder="Egzanp: TapTapGo - Demann Marque Pwop Ou"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Mesaj</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 120 }]}
                    value={emailMessage}
                    onChangeText={setEmailMessage}
                    placeholder="Ekri mesaj ou isit..."
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                    numberOfLines={5}
                  />
                </View>
                <Pressable
                  style={[styles.btn, styles.btnPrimary, { marginTop: 8 }]}
                  onPress={handleSendEmail}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="send" size={18} color="white" />}
                  <Text style={styles.btnTextPrimary}>{sendingEmail ? 'Ap voye...' : 'Voye imèl'}</Text>
                </Pressable>
                {openRequest.status === 'pending' && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: Colors.primary }]}
                      onPress={() => { handleProcessRequest(openRequest); setOpenRequest(null); }}
                      disabled={processingId === openRequest.id}
                    >
                      <Ionicons name="checkmark" size={16} color="white" />
                      <Text style={styles.smallBtnText}>Traite</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: '#6B7280' }]}
                      onPress={() => { handleCancelRequest(openRequest); setOpenRequest(null); }}
                      disabled={processingId === openRequest.id}
                    >
                      <Text style={styles.smallBtnText}>Anile</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: Colors.error }]}
                      onPress={() => { handleRejectRequest(openRequest); setOpenRequest(null); }}
                      disabled={processingId === openRequest.id}
                    >
                      <Text style={styles.smallBtnText}>Refize</Text>
                    </Pressable>
                  </View>
                )}
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: Colors.error, marginTop: 12 }]}
                  onPress={() => handleDeleteRequest(openRequest)}
                  disabled={processingId === openRequest.id}
                >
                  <Ionicons name="trash-outline" size={16} color="white" />
                  <Text style={styles.smallBtnText}>Efase demann lan</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!openSupportMessage}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setOpenSupportMessage(null);
          setSupportAdminNotes('');
          setSupportEmailSubject('');
          setSupportEmailMessage('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {openSupportMessage && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.modalTitle}>Mesaj Sipò — {openSupportMessage.name}</Text>
                  <Pressable
                    onPress={() => {
                      setOpenSupportMessage(null);
                      setSupportAdminNotes('');
                      setSupportEmailSubject('');
                      setSupportEmailMessage('');
                    }}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalLabel}>Telefòn</Text>
                  <Text style={styles.modalValue}>{openSupportMessage.phone}</Text>
                  <Text style={styles.modalLabel}>Imèl</Text>
                  <Text style={[styles.modalValue, { color: Colors.primary }]}>{openSupportMessage.email}</Text>
                  <Text style={styles.modalLabel}>Mesaj</Text>
                  <Text style={styles.modalValue}>{openSupportMessage.message}</Text>
                  <Text style={styles.modalLabel}>Dat</Text>
                  <Text style={styles.modalValue}>{new Date(openSupportMessage.created_at).toLocaleString()}</Text>
                </ScrollView>
                <Text style={[styles.modalLabel, { marginTop: 8 }]}>Nòt admin (anrejistre pou referans)</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60 }]}
                  value={supportAdminNotes}
                  onChangeText={setSupportAdminNotes}
                  placeholder="Ajoute yon nòt..."
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={2}
                />
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: Colors.textSecondary, marginTop: 6 }]}
                  onPress={async () => {
                    if (!openSupportMessage) return;
                    try {
                      await supportMessagesAPI.update(openSupportMessage.id, { admin_notes: supportAdminNotes.trim() });
                      setSupportMessages((prev) => prev.map((m) => (m.id === openSupportMessage.id ? { ...m, admin_notes: supportAdminNotes.trim() } : m)));
                      setOpenSupportMessage((o) => (o?.id === openSupportMessage.id ? { ...o, admin_notes: supportAdminNotes.trim() } : o));
                      Alert.alert('Siksè', 'Nòt ou anrejistre.');
                    } catch (e: any) {
                      Alert.alert('Erè', e?.response?.data?.detail || 'Pa kapab anrejistre.');
                    }
                  }}
                >
                  <Ionicons name="save" size={16} color="white" />
                  <Text style={styles.smallBtnText}>Anrejistre nòt</Text>
                </Pressable>
                <Text style={[styles.label, { marginTop: 16, marginBottom: 8 }]}>Reponn pa imèl bay {openSupportMessage.name} ({openSupportMessage.email})</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Sijè</Text>
                  <TextInput
                    style={styles.input}
                    value={supportEmailSubject}
                    onChangeText={setSupportEmailSubject}
                    placeholder="Egzanp: TapTapGo — Repons pou mesaj ou"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Mesaj</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 120 }]}
                    value={supportEmailMessage}
                    onChangeText={setSupportEmailMessage}
                    placeholder="Ekri repons ou isit..."
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                    numberOfLines={5}
                  />
                </View>
                <Pressable
                  style={[styles.btn, styles.btnPrimary, { marginTop: 8 }]}
                  onPress={handleSendSupportEmail}
                  disabled={sendingSupportEmail}
                >
                  {sendingSupportEmail ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="send" size={18} color="white" />}
                  <Text style={styles.btnTextPrimary}>{sendingSupportEmail ? 'Ap voye...' : 'Voye imèl'}</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {openSupportMessage.status === 'pending' && (
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: Colors.success }]}
                      onPress={() => handleUpdateSupportStatus(openSupportMessage, 'read')}
                    >
                      <Text style={styles.smallBtnText}>Li</Text>
                    </Pressable>
                  )}
                  {openSupportMessage.status !== 'replied' && (
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: Colors.primary }]}
                      onPress={() => handleUpdateSupportStatus(openSupportMessage, 'replied')}
                    >
                      <Text style={styles.smallBtnText}>Reponn</Text>
                    </Pressable>
                  )}
                  {openSupportMessage.status !== 'archived' && (
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: Colors.textSecondary }]}
                      onPress={() => handleUpdateSupportStatus(openSupportMessage, 'archived')}
                    >
                      <Text style={styles.smallBtnText}>Archive</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {sections.map((section) => (
        <View key={section} style={styles.section}>
          <Text style={styles.sectionTitle}>{SECTION_LABELS[section] || section}</Text>
          {LANDING_KEYS.filter((k) => k.section === section).map((item) => (
            <View key={item.key} style={styles.field}>
              <Text style={styles.label}>{item.label}</Text>
              <TextInput
                style={[styles.input, item.key === 'sou_nou_content' && { minHeight: 320 }]}
                value={content[item.key] ?? ''}
                onChangeText={(t) => setContent((c) => ({ ...c, [item.key]: t }))}
                placeholder={`Tèks pou ${item.label}`}
                placeholderTextColor={Colors.textSecondary}
                multiline={item.key.includes('_text') || item.key.includes('intro') || item.key.includes('subtitle') || item.key === 'sou_nou_content'}
                numberOfLines={item.key === 'sou_nou_content' ? 20 : (item.key.includes('_text') || item.key.includes('intro') ? 3 : 1)}
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

        <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 8 }]}>Lyen telechajman aplikasyon</Text>
        <Text style={[styles.label, { marginBottom: 12, fontWeight: '400', color: Colors.textSecondary }]}>Ajoute lyen dirèk pou moun ka telechaje app la. Lyen yo parèt sou landing la nan seksyon "Telechaje Aplikasyon".</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Play Store (lyen aplikasyon Android)</Text>
          <TextInput
            style={styles.input}
            value={footer.play_store_url ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, play_store_url: t }))}
            placeholder="https://play.google.com/store/apps/details?id=..."
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>App Store (lyen aplikasyon iOS)</Text>
          <TextInput
            style={styles.input}
            value={footer.app_store_url ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, app_store_url: t }))}
            placeholder="https://apps.apple.com/app/..."
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Lyen dirèk APK (opsyonèl — telechajman dirèk fichye .apk)</Text>
          <TextInput
            style={styles.input}
            value={footer.direct_apk_url ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, direct_apk_url: t }))}
            placeholder="https://exemple.com/app.apk oubyen vide si ou pa bezwen"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 8 }]}>Imèl otomatik — Demann Marque Pwop Ou</Text>
        <Text style={[styles.label, { marginBottom: 12, fontWeight: '400', color: Colors.textSecondary }]}>Lè yon moun voye demann White-Label, yo resevwa otomatikman yon imèl ki konfime nou resevwa li epi yon ekspè ap kontakte yo. Ou kontwòl sijè ak mesaj la. Itilize {'{{name}}'}, {'{{company}}'}, {'{{zone}}'} pou ranplase nan tèks la.</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Sijè imèl otomatik</Text>
          <TextInput
            style={styles.input}
            value={footer.whitelabel_confirm_subject ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, whitelabel_confirm_subject: t }))}
            placeholder="Egz: TapTapGo — Nou resevwa demann ou"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Kò imèl otomatik</Text>
          <TextInput
            style={[styles.input, { minHeight: 140 }]}
            value={footer.whitelabel_confirm_body ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, whitelabel_confirm_body: t }))}
            placeholder="Bonjou {{name}}, Mèsi pou demann ou pou {{company}}..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={6}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 8 }]}>Sipò — Sant Èd, Kontakte Nou, Politik Konfidansyalite</Text>
        <Text style={[styles.label, { marginBottom: 12, fontWeight: '400', color: Colors.textSecondary }]}>Lyen yo (tèks, href) se nan kolòn Sipò anba a. Pou href itilize #sant-ed, #kontakte-nou, #politik. Kontni modèl yo pou chak bouton :</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Sant Èd — kontni modal la</Text>
          <TextInput
            style={[styles.input, { minHeight: 120 }]}
            value={footer.support_sant_ed_content ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, support_sant_ed_content: t }))}
            placeholder="Kesyon ak repons sou app la, kijan mande kous..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={5}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Kontakte Nou — kontni modal la</Text>
          <TextInput
            style={[styles.input, { minHeight: 120 }]}
            value={footer.support_kontak_content ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, support_kontak_content: t }))}
            placeholder="Telefòn, WhatsApp, imèl, adrès..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={5}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Politik Konfidansyalite — kontni modal la</Text>
          <Text style={[styles.label, { marginBottom: 8, fontWeight: '400', color: Colors.textSecondary, fontSize: 13 }]}>
            Kontni sa a parèt lè moun klike "Politik Konfidansyalite" sou landing la. Ou ka modifye l nenpòt ki lè.
          </Text>
          <TextInput
            style={[styles.input, { minHeight: 400, textAlignVertical: 'top' }]}
            value={footer.support_politik_content ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, support_politik_content: t }))}
            placeholder="Politik konfidansyalite, koleksyon done, dwa itilizatè..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={20}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Videyo eksplikasyon — lyen (YouTube, Vimeo, oswa .mp4)</Text>
          <Text style={[styles.label, { marginBottom: 8, fontWeight: '400', color: Colors.textSecondary }]}>Lyen sa a parèt lè moun klike "Gade Videyo Eksplikasyon" nan Sant Èd. Egzanp: https://www.youtube.com/watch?v=VIDEO_ID oswa https://youtu.be/VIDEO_ID</Text>
          <TextInput
            style={styles.input}
            value={footer.support_video_url ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, support_video_url: t }))}
            placeholder="https://www.youtube.com/watch?v=... oswa https://youtu.be/..."
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 8 }]}>Transpò — Imaj (Chofè+Pasajè, Moto, Machin)</Text>
        <Text style={[styles.label, { marginBottom: 12, fontWeight: '400', color: Colors.textSecondary }]}>Lyen imaj pou seksyon "Transpò Nou Yo" sou landing la. Vide = imaj defo. Ou ka mete URL konplè (https://...) oswa chemen relatif (images/nom.png).</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Imaj Chofè ak Pasajè</Text>
          <TextInput
            style={styles.input}
            value={footer.image_ride_url ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, image_ride_url: t }))}
            placeholder="https://... oswa images/moto-chofe-passager.png"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Imaj Moto</Text>
          <TextInput
            style={styles.input}
            value={footer.image_moto_url ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, image_moto_url: t }))}
            placeholder="https://... oswa images/moto-transport.png"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Imaj Machin</Text>
          <TextInput
            style={styles.input}
            value={footer.image_auto_url ?? ''}
            onChangeText={(t) => setFooter((f) => ({ ...f, image_auto_url: t }))}
            placeholder="https://... oswa images/auto-transport.png"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    ...Shadows.small,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.secondary },
  modalCloseBtn: { padding: 4 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 12, marginBottom: 4 },
  modalValue: { fontSize: 15, color: Colors.text, lineHeight: 22 },
});
