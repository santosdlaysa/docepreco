import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '../components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supportApi, SupportMessage } from '../../data/api/supportApi';
import { useTranslation } from 'react-i18next';

// ── Design tokens ──
const INK = '#3D2233';
const INK2 = '#9A7E8C';
const INK3 = '#C4B0BB';
const CREAM = '#FFF6F0';
const LINE = '#F1E2DA';
const PINK = '#EA4B92';
const GREEN = '#43BE6E';

// ── Typing indicator ──
function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ),
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={s.typingWrap}>
      <View style={s.typingBubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              s.typingDot,
              {
                opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export const SupportChatScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const checkAdminTyping = useCallback(async () => {
    try {
      const typing = await supportApi.isAdminTyping();
      setAdminTyping(typing);
    } catch { /* silent */ }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const data = await supportApi.getMessages();
      setMessages(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    checkAdminTyping();
    const interval = setInterval(checkAdminTyping, 3000);
    return () => clearInterval(interval);
  }, [checkAdminTyping]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para enviar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSend = async () => {
    const text = newMessage.trim();
    if ((!text && !selectedImage) || sending) return;
    setSending(true);
    const imageToSend = selectedImage;
    setNewMessage('');
    setSelectedImage(null);
    try {
      const sent = await supportApi.sendMessage(text, imageToSend);
      setMessages(prev => [...prev, sent]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setNewMessage(text);
      setSelectedImage(imageToSend);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: SupportMessage }) => {
    const isUser = item.senderType === 'user';
    return (
      <View style={[s.msgRow, isUser ? s.msgRowRight : s.msgRowLeft]}>
        {isUser ? (
          <LinearGradient
            colors={['#FF6AAE', PINK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.bubble, s.bubbleUser]}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={s.msgImage} resizeMode="cover" />
            ) : null}
            {item.message ? <Text style={s.bubbleTextUser}>{item.message}</Text> : null}
          </LinearGradient>
        ) : (
          <View style={[s.bubble, s.bubbleAdmin]}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={s.msgImage} resizeMode="cover" />
            ) : null}
            {item.message ? <Text style={s.bubbleTextAdmin}>{item.message}</Text> : null}
          </View>
        )}
        <Text style={[s.bubbleTime, isUser ? s.timeRight : s.timeLeft]}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={INK} />
        </TouchableOpacity>
        <LinearGradient
          colors={['#FF8FB6', PINK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.headerAvatar}
        >
          <Ionicons name="chatbubbles" size={18} color="#fff" />
        </LinearGradient>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>Suporte DocePreço</Text>
          <View style={s.onlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>online agora</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={s.skeletonChat}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={i % 2 === 0 ? s.skeletonLeft : s.skeletonRight}>
                <Skeleton
                  width={i % 2 === 0 ? 220 : 170}
                  height={i % 3 === 0 ? 52 : 38}
                  borderRadius={18}
                />
              </View>
            ))}
          </View>
        ) : messages.length === 0 ? (
          <View style={s.emptyContainer}>
            <View style={s.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={36} color={INK3} />
            </View>
            <Text style={s.emptyTitle}>{t('profile.supportEmpty')}</Text>
            <Text style={s.emptySub}>Envie uma mensagem e responderemos o mais rápido possível.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={s.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={
              <Text style={s.dayLabel}>Hoje</Text>
            }
          />
        )}

        {adminTyping && !sending && <TypingDots />}

        {/* ── Image preview ── */}
        {selectedImage ? (
          <View style={s.previewBar}>
            <Image source={{ uri: selectedImage }} style={s.previewImage} resizeMode="cover" />
            <TouchableOpacity onPress={() => setSelectedImage(null)} style={s.previewRemove} activeOpacity={0.8}>
              <Ionicons name="close-circle" size={22} color={PINK} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Input bar ── */}
        <View style={s.inputBar}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7} style={s.imageBtn}>
            <Ionicons name="image-outline" size={22} color={INK2} />
          </TouchableOpacity>
          <TextInput
            style={s.input}
            placeholder="Escreva uma mensagem…"
            placeholderTextColor={INK3}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={(!newMessage.trim() && !selectedImage) || sending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6AAE', PINK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.sendBtn, ((!newMessage.trim() && !selectedImage) || sending) && s.sendBtnDisabled]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#fff" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Shared shadow ──
const SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  flex: { flex: 1 },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: INK },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: GREEN },
  onlineText: { fontSize: 12.5, color: INK2, fontWeight: '600' },

  /* ── Messages ── */
  messagesList: { padding: 16, paddingBottom: 8 },
  dayLabel: {
    textAlign: 'center',
    fontSize: 11.5,
    color: INK3,
    fontWeight: '600',
    marginBottom: 12,
  },
  msgRow: { marginBottom: 10 },
  msgRowRight: { alignItems: 'flex-end' },
  msgRowLeft: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '74%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
  },
  bubbleUser: {
    borderBottomRightRadius: 5,
  },
  bubbleAdmin: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 5,
    ...SHADOW,
  },
  bubbleTextUser: { fontSize: 14, fontWeight: '500', color: '#fff', lineHeight: 20 },
  bubbleTextAdmin: { fontSize: 14, fontWeight: '500', color: INK, lineHeight: 20 },
  bubbleTime: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  timeRight: { color: INK3, alignSelf: 'flex-end' },
  timeLeft: { color: INK3, alignSelf: 'flex-start' },

  /* ── Typing ── */
  typingWrap: { paddingHorizontal: 16, paddingBottom: 8, alignItems: 'flex-start' },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    ...SHADOW,
  },
  typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: INK3 },

  /* ── Image preview ── */
  previewBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  previewRemove: {
    position: 'absolute',
    top: 4,
    left: 104,
  },

  /* ── Input bar ── */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  imageBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: CREAM,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 14,
    color: INK,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  /* ── Image in bubble ── */
  msgImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },

  /* ── Empty state ── */
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#FFF0F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: INK, marginBottom: 6 },
  emptySub: { fontSize: 13, color: INK2, fontWeight: '500', textAlign: 'center', lineHeight: 19, maxWidth: 240 },

  /* ── Skeleton ── */
  skeletonChat: { flex: 1, padding: 16, gap: 12, justifyContent: 'flex-end' },
  skeletonLeft: { alignSelf: 'flex-start' },
  skeletonRight: { alignSelf: 'flex-end' },
});
