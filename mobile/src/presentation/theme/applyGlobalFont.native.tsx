/**
 * Aplica DM Sans como fonte padrão de todo o app (nativo — iOS/Android).
 *
 * Em React Native não existe herança global de fonte: cada <Text>/<TextInput>
 * usa a fonte do sistema salvo se `fontFamily` for definido explicitamente, e
 * cada peso é uma família de fonte separada. Em vez de editar centenas de telas,
 * envolvemos os componentes Text/TextInput para injetar a família DM Sans
 * correta conforme o `fontWeight` de cada texto. Estilos que já definem
 * `fontFamily` (ex.: títulos em Playfair Display, ícones do @expo/vector-icons)
 * são respeitados e não sofrem alteração.
 *
 * Detalhe técnico: o índice do `react-native` expõe `Text`/`TextInput` como
 * getters NÃO-configuráveis (`get Text() { return require('.../Text').default }`),
 * então não é possível redefini-los diretamente. Em vez disso sobrescrevemos o
 * `default` do módulo interno — o getter do índice passa a devolver a versão
 * envolvida automaticamente. Esses módulos internos são "native-only"; por isso
 * este arquivo é `.native` e há uma versão `.web` no-op.
 *
 * As famílias vêm de ./fonts — o "lugar único" para trocar as fontes do app.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { weightToFamily, DEFAULT_FONT_FAMILY } from './fonts';

function resolveFontStyle(style: any): any {
  const flat = StyleSheet.flatten(style) || {};
  // Respeita fontFamily explícito (Playfair Display, ícones, etc.).
  if (flat.fontFamily) return style;
  const weight = flat.fontWeight != null ? String(flat.fontWeight) : '400';
  const family = weightToFamily[weight] || DEFAULT_FONT_FAMILY;
  return [{ fontFamily: family }, style];
}

/**
 * Sobrescreve o export `default` de um módulo interno do RN por uma versão
 * envolvida. Lida tanto com `exports.default` gravável quanto com getter.
 */
function patchModuleDefault(mod: any, makeWrapped: (Original: any) => any): void {
  const Original = mod && mod.default;
  if (!Original || Original.__doceprecoFontPatched) return;

  const Wrapped = makeWrapped(Original);
  Wrapped.__doceprecoFontPatched = true;

  try {
    mod.default = Wrapped;
    if (mod.default === Wrapped) return;
  } catch {
    // cai no defineProperty abaixo
  }
  try {
    Object.defineProperty(mod, 'default', {
      configurable: true,
      enumerable: true,
      get: () => Wrapped,
    });
  } catch {
    // se nem isso funcionar, o app segue com a fonte do sistema (sem crash)
  }
}

let patched = false;

export function applyGlobalFont(): void {
  if (patched) return;
  patched = true;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const TextModule = require('react-native/Libraries/Text/Text');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const TextInputModule = require('react-native/Libraries/Components/TextInput/TextInput');

  patchModuleDefault(TextModule, (OriginalText) => {
    const AppText = React.forwardRef((props: any, ref: any) => (
      <OriginalText ref={ref} {...props} style={resolveFontStyle(props.style)} />
    ));
    AppText.displayName = 'Text';
    return AppText;
  });

  patchModuleDefault(TextInputModule, (OriginalTextInput) => {
    const AppTextInput = React.forwardRef((props: any, ref: any) => (
      <OriginalTextInput ref={ref} {...props} style={resolveFontStyle(props.style)} />
    ));
    AppTextInput.displayName = 'TextInput';
    return AppTextInput;
  });
}
