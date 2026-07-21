/**
 * Tipografia central do app.
 *
 * - `fontAssets`: arquivos carregados pelo App.tsx (`useFonts({ ...fontAssets })`).
 * - `fonts`: nomes das famílias para usar em `fontFamily`.
 * - `weightToFamily`: mapa peso -> família DM Sans, usado pelo override global
 *   (ver ./applyGlobalFont) para aplicar DM Sans automaticamente em todo o app.
 *
 * Para trocar as fontes do app inteiro, altere AQUI.
 */
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';

export const fontAssets = {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
};

export const fonts = {
  // DM Sans (corpo, UI)
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  extrabold: 'DMSans_800ExtraBold',
  // Playfair Display (títulos)
  serif: 'PlayfairDisplay_700Bold',
  serifRegular: 'PlayfairDisplay_400Regular',
  serifItalic: 'PlayfairDisplay_400Regular_Italic',
} as const;

export const DEFAULT_FONT_FAMILY = fonts.regular;

export const weightToFamily: Record<string, string> = {
  '100': fonts.regular,
  '200': fonts.regular,
  '300': fonts.regular,
  '400': fonts.regular,
  normal: fonts.regular,
  '500': fonts.medium,
  '600': fonts.semibold,
  '700': fonts.bold,
  bold: fonts.bold,
  '800': fonts.extrabold,
  '900': fonts.extrabold,
};
