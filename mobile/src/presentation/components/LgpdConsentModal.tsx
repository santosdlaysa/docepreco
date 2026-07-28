import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Modal de consentimento LGPD exibido no cadastro. Resume o tratamento de dados
 * e remete à Política de Privacidade. O aceite deve ser registrado antes de
 * concluir o cadastro.
 */
const SECTIONS: { title: string; body: string; bullets?: string[] }[] = [
  {
    title: 'Quais dados tratamos',
    body: 'Para usar o Doce Preço, tratamos os dados que você fornece e cadastra:',
    bullets: [
      'Dados de cadastro: nome da confeitaria, e-mail e telefone.',
      'Dados de uso: ingredientes, receitas, vendas, encomendas, clientes e estoque que você registra.',
    ],
  },
  {
    title: 'Como usamos',
    body: 'Utilizamos esses dados apenas para operar o serviço:',
    bullets: [
      'Autenticar seu acesso e proteger sua conta.',
      'Calcular custos, margens e preços das suas receitas e gerar relatórios.',
      'Enviar comunicações importantes relacionadas ao serviço.',
    ],
  },
  {
    title: 'Compartilhamento e segurança',
    body: 'Seus dados são armazenados em servidores seguros. Não vendemos, alugamos nem compartilhamos suas informações pessoais com terceiros, exceto quando exigido por lei ou por provedores que operam o app sob acordos de confidencialidade.',
  },
  {
    title: 'Seus direitos (LGPD)',
    body: 'Conforme a Lei Geral de Proteção de Dados (LGPD – Lei 13.709/2018), você pode a qualquer momento acessar, corrigir, exportar ou excluir seus dados, e revogar este consentimento pelo próprio app.',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
  /** Quando true, o modal não pode ser fechado sem aceitar (aceite obrigatório). */
  required?: boolean;
}

export const LgpdConsentModal: React.FC<Props> = ({ visible, onClose, onAccept, required }) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle={required ? 'fullScreen' : 'pageSheet'}
    onRequestClose={required ? undefined : onClose}
  >
    <SafeAreaView style={s.safe}>
      <View style={s.head}>
        <View style={s.headIcon}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Privacidade e proteção de dados</Text>
          <Text style={s.subtitle}>Lei Geral de Proteção de Dados (LGPD)</Text>
        </View>
        {!required && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {SECTIONS.map(sec => (
          <View key={sec.title} style={{ marginBottom: 18 }}>
            <Text style={s.secTitle}>{sec.title}</Text>
            <Text style={s.body}>{sec.body}</Text>
            {sec.bullets?.map((b, i) => (
              <View key={i} style={s.bulletRow}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}
        <Text style={s.note}>
          Ao aceitar, você concorda com o tratamento dos seus dados conforme descrito acima.
        </Text>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
          <Text style={s.acceptText}>Li e aceito</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  </Modal>
);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: colors.pinkBg3, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  secTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text, marginBottom: 4 },
  body: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
  bulletRow: { flexDirection: 'row', gap: 8, marginTop: 5 },
  bulletDot: { color: colors.primary, fontSize: 14, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
  note: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 4 },
  footer: { padding: 18, borderTopWidth: 1, borderTopColor: colors.border },
  acceptBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  acceptText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
