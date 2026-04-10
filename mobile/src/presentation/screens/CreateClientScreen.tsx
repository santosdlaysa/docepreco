import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { clientStorage } from '../../data/storage/clientStorage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'EditClient'>;

export const CreateClientScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const clientId = (route.params as any)?.clientId as string | undefined;
  const isEditing = !!clientId;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (clientId) {
      clientStorage.getById(clientId).then(client => {
        if (!client) return;
        setName(client.name);
        setPhone(client.phone || '');
        setEmail(client.email || '');
        if (client.birthday) {
          const [mm, dd] = client.birthday.split('-');
          setBirthdayMonth(mm);
          setBirthdayDay(dd);
        }
        setAddress(client.address || '');
        setNotes(client.notes || '');
      });
    }
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome é obrigatório';
    if (birthdayDay || birthdayMonth) {
      const d = parseInt(birthdayDay);
      const m = parseInt(birthdayMonth);
      if (!d || d < 1 || d > 31) newErrors.birthdayDay = 'Dia inválido';
      if (!m || m < 1 || m > 12) newErrors.birthdayMonth = 'Mês inválido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const birthday =
        birthdayMonth && birthdayDay
          ? `${String(parseInt(birthdayMonth)).padStart(2, '0')}-${String(parseInt(birthdayDay)).padStart(2, '0')}`
          : undefined;

      const data = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        birthday,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (isEditing) {
        await clientStorage.update(clientId!, data);
        showToast('Cliente atualizado!', 'success');
      } else {
        await clientStorage.create(data);
        showToast('Cliente cadastrado!', 'success');
      }
      navigation.goBack();
    } catch {
      showToast('Erro ao salvar cliente', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isEditing ? 'Editar Cliente' : 'Novo Cliente'}
        subtitle="Aniversário será usado para lembretes. Telefone para contato via WhatsApp."
        showBack
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Dados pessoais</Text>
            <Input
              label="Nome *"
              placeholder="Ex: Maria Silva"
              value={name}
              onChangeText={setName}
              error={errors.name}
            />
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Input
              label="E-mail"
              placeholder="maria@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Aniversário</Text>
            <Text style={styles.sectionSubtitle}>Receba lembretes de aniversário dos seus clientes</Text>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="Dia"
                  placeholder="15"
                  value={birthdayDay}
                  onChangeText={setBirthdayDay}
                  keyboardType="number-pad"
                  error={errors.birthdayDay}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Mês"
                  placeholder="03"
                  value={birthdayMonth}
                  onChangeText={setBirthdayMonth}
                  keyboardType="number-pad"
                  error={errors.birthdayMonth}
                />
              </View>
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Endereço</Text>
            <Input
              placeholder="Rua, número, bairro..."
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
            />
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Input
              placeholder="Preferências, alergias, informações importantes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </Card>

          <Button
            title={isEditing ? 'Atualizar Cliente' : 'Salvar Cliente'}
            onPress={handleSave}
            loading={loading}
            size="lg"
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: 16 },
  sectionSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: -12, marginBottom: 12 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  row: { flexDirection: 'row' },
  saveButton: { marginBottom: 32 },
});
