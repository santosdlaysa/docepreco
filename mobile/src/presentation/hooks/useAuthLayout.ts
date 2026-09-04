import { Platform, useWindowDimensions } from 'react-native';

/**
 * Métricas das telas de autenticação ajustadas à altura do aparelho.
 *
 * O cabeçalho rosa tem 290pt fixos, o que sozinho ocupa 43% de um iPhone 8
 * (667pt) e empurra "criar conta" e o modo demo para baixo da dobra. Em telas
 * baixas — iPhone 8/SE, Android compacto e qualquer aparelho com Display Zoom
 * ligado — encolhemos logo, respiros e paddings para o formulário caber inteiro.
 */
export const useAuthLayout = () => {
  const { height } = useWindowDimensions();
  const compact = height < 700; // iPhone 8 = 667
  const tiny = height < 600;    // iPhone SE 1ª geração / Display Zoom = 568

  const pick = <T,>(normal: T, small: T, smallest: T): T => (tiny ? smallest : compact ? small : normal);

  return {
    compact,
    tiny,
    logoSize: pick(90, 68, 56),
    logoRadius: pick(26, 20, 16),
    logoGap: pick(14, 10, 8),
    headerPadTop: pick(Platform.OS === 'ios' ? 60 : 50, 24, 12),
    headerPadExtra: pick(32, 16, 8), // somado ao overlap do card
    brandSize: pick(28, 24, 22),
    taglineSize: pick(13, 12, 12),
    cardPad: pick(28, 20, 16),
    cardTitleGap: pick(24, 16, 12),
    cardMarginBottom: pick(32, 20, 12),
    fieldGap: pick(16, 10, 8),
    blockGap: pick(24, 16, 10),
    smallGap: pick(20, 14, 10),
  };
};
