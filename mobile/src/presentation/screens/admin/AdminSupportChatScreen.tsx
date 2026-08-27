import { colors } from '../../theme/colors';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { adminApi, AdminMessage } from '../../../data/api/adminApi';
import { AdminStackParamList } from './types';

type Route = RouteProp<AdminStackParamList, 'AdminSupportChat'>;

function Bubble({ msg, onImagePress }: { msg: AdminMessage; onImagePress: (url: string) => void }) {
  const isAdmin = msg.senderType === 'admin';
  const time = new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={{ alignItems: isAdmin ? 'flex-end' : 'flex-start', marginVertical: 3, paddingHorizontal: 16 }}>
      <View style={[styles.bubble, isAdmin ? styles.bubbleAdmin : styles.bubbleUser]}>
        {isAdmin && <Text style={styles.adminTag}>Admin</Text>}
        {msg.imageUrl ? (
          <TouchableOpacity onPress={() => onImagePress(msg.imageUrl!)} activeOpacity={0.85}>
            <Image source={{ uri: msg.imageUrl }} style={styles.msgImage} resizeMode="cover" />
          </TouchableOpacity>
        ) : null}
        {msg.message ? <Text style={[styles.bubbleText, isAdmin && { color: '#fff' }]}>{msg.message}</Text> : null}
        <Text style={[styles.bubbleTime, isAdmin && { color: 'rgba(255,255,255,0.65)' }]}>{time}</Text>
      </View>
    </View>
  );
}

export const AdminSupportChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { userId, companyName } = route.params;
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try { setMessages(await adminApi.getConversationMessages(userId)); } catch {}
  }, [userId]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  // Poll for new messages every 5s
  useEffect(() => {
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

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
    if (!text.trim() && !selectedImage) return;
    setSending(true);
    const imageToSend = selectedImage;
    try {
      await adminApi.setTyping(userId, false);
      const msg = await adminApi.sendMessage(userId, text.trim(), imageToSend);
      setText('');
      setSelectedImage(null);
      setMessages(prev => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível enviar.');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (v: string) => {
    setText(v);
    adminApi.setTyping(userId, v.length > 0).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(companyName?.[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{companyName}</Text>
            <Text style={styles.headerSub}>Suporte</Text>
          </View>
        </View>
        <TouchableOpacity onPress={load} hitSlop={8}>
          <Ionicons name="refresh" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={{ paddingVertical: 12 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => <Bubble msg={item} onImagePress={setExpandedImage} />}
            ListEmptyComponent={
              <View style={{ padding: 48, alignItems: 'center' }}>
                <Ionicons name="chatbubble-outline" size={36} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: 12 }}>Nenhuma mensagem</Text>
              </View>
            }
          />
        )}

        <Modal visible={!!expandedImage} transparent animationType="fade" onRequestClose={() => setExpandedImage(null)}>
          <TouchableOpacity style={styles.imageModal} activeOpacity={1} onPress={() => setExpandedImage(null)}>
            <TouchableOpacity style={styles.imageModalClose} onPress={() => setExpandedImage(null)} activeOpacity={0.8}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {expandedImage ? <Image source={{ uri: expandedImage }} style={styles.expandedImage} resizeMode="contain" /> : null}
          </TouchableOpacity>
        </Modal>

        {/* Image preview */}
        {selectedImage ? (
          <View style={styles.previewBar}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.previewRemove}>
              <Ionicons name="close-circle" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Input */}
        <View style={styles.inputWrap}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7} style={styles.imageBtn}>
            <Ionicons name="image-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            value={text}
            onChangeText={handleTyping}
            placeholder="Responder como admin..."
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.input}
          />
          <TouchableOpacity onPress={handleSend} disabled={(!text.trim() && !selectedImage) || sending} activeOpacity={0.75}>
            <View style={[styles.sendBtn, { backgroundColor: (text.trim() || selectedImage) ? colors.primary : colors.border }]}>
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  headerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 11, color: colors.textMuted },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleAdmin: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleUser: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  adminTag: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  bubbleText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  previewBar: { padding: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  previewImage: { width: 90, height: 90, borderRadius: 10 },
  previewRemove: { position: 'absolute', top: 4, left: 86 },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  imageBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.text, maxHeight: 120 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  msgImage: { width: 180, height: 180, borderRadius: 10, marginBottom: 4 },
  imageModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  expandedImage: { width: '100%', height: '80%' },
  imageModalClose: { position: 'absolute', top: 48, right: 20, zIndex: 1, padding: 8 },
});
