import { colors } from '../theme/colors';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { typography } from '../theme/typography';
import { Header } from '../components/Header';

export const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Politica de Privacidade" showBack onBack={() => navigation.goBack()} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Ultima atualizacao: 27 de marco de 2026</Text>

        <Text style={styles.intro}>
          A sua privacidade e importante para nos. Esta Politica de Privacidade explica como o
          aplicativo DocePreco coleta, usa, armazena e protege suas informacoes pessoais.
        </Text>

        <Section title="1. Informacoes que Coletamos">
          <Text style={styles.body}>
            Ao utilizar o DocePreco, podemos coletar as seguintes informacoes:
          </Text>
          <BulletItem text="Dados de cadastro: nome da empresa e endereco de e-mail." />
          <BulletItem text="Dados de uso: ingredientes, receitas, calculos de precificacao e registros de vendas inseridos por voce." />
          <BulletItem text="Dados tecnicos: tipo de dispositivo, sistema operacional e identificadores anonimos para fins de diagnostico." />
        </Section>

        <Section title="2. Como Usamos suas Informacoes">
          <Text style={styles.body}>Utilizamos as informacoes coletadas para:</Text>
          <BulletItem text="Fornecer, manter e melhorar os servicos do aplicativo." />
          <BulletItem text="Autenticar seu acesso e proteger sua conta." />
          <BulletItem text="Calcular custos, margens de lucro e precos de venda das suas receitas." />
          <BulletItem text="Enviar comunicacoes importantes relacionadas ao servico, quando necessario." />
        </Section>

        <Section title="3. Armazenamento e Seguranca">
          <Text style={styles.body}>
            Seus dados sao armazenados em servidores seguros e protegidos com medidas tecnicas
            e organizacionais adequadas para prevenir acesso nao autorizado, perda ou alteracao.
            As credenciais de acesso sao armazenadas de forma criptografada no seu dispositivo.
          </Text>
        </Section>

        <Section title="4. Compartilhamento de Dados">
          <Text style={styles.body}>
            Nos nao vendemos, alugamos ou compartilhamos suas informacoes pessoais com terceiros,
            exceto nas seguintes situacoes:
          </Text>
          <BulletItem text="Quando exigido por lei ou ordem judicial." />
          <BulletItem text="Para proteger nossos direitos, privacidade, seguranca ou propriedade." />
          <BulletItem text="Com provedores de servico que nos auxiliam na operacao do aplicativo, sob acordos de confidencialidade." />
        </Section>

        <Section title="5. Seus Direitos">
          <Text style={styles.body}>
            De acordo com a Lei Geral de Protecao de Dados (LGPD), voce tem direito a:
          </Text>
          <BulletItem text="Acessar seus dados pessoais armazenados." />
          <BulletItem text="Solicitar a correcao de dados incompletos ou desatualizados." />
          <BulletItem text="Solicitar a exclusao dos seus dados pessoais." />
          <BulletItem text="Revogar seu consentimento a qualquer momento." />
          <BulletItem text="Solicitar a portabilidade dos seus dados." />
        </Section>

        <Section title="6. Cookies e Tecnologias Semelhantes">
          <Text style={styles.body}>
            O aplicativo pode utilizar tecnologias de armazenamento local (como AsyncStorage)
            para manter sua sessao ativa e salvar preferencias. Nao utilizamos cookies de
            rastreamento de terceiros.
          </Text>
        </Section>

        <Section title="7. Links para Terceiros">
          <Text style={styles.body}>
            O aplicativo pode conter links para sites ou servicos de terceiros (como Shopee).
            Nao nos responsabilizamos pelas praticas de privacidade desses sites. Recomendamos
            que voce leia as politicas de privacidade de cada site que visitar.
          </Text>
        </Section>

        <Section title="8. Alteracoes nesta Politica">
          <Text style={styles.body}>
            Podemos atualizar esta Politica de Privacidade periodicamente. Quando fizermos
            alteracoes significativas, notificaremos voce por meio do aplicativo. O uso
            continuado do aplicativo apos as alteracoes constitui aceitacao da politica
            atualizada.
          </Text>
        </Section>

        <Section title="9. Contato">
          <Text style={styles.body}>
            Se voce tiver duvidas ou solicitacoes sobre esta Politica de Privacidade ou sobre
            o tratamento dos seus dados pessoais, entre em contato conosco pelo e-mail:
          </Text>
          <Text style={styles.email}>contato@docepreco.com.br</Text>
        </Section>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const BulletItem: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bullet}>{'\u2022'}</Text>
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { padding: 20 },
  lastUpdated: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: 16,
  },
  intro: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 8,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginTop: 6,
  },
  bullet: {
    ...typography.body,
    color: colors.primary,
    marginRight: 8,
    lineHeight: 22,
  },
  bulletText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  email: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  bottomSpacer: { height: 40 },
});
