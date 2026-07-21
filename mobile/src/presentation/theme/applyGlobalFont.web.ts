/**
 * Versão web (no-op) do override de fonte.
 *
 * A versão nativa importa módulos internos do React Native ("native-only") que
 * não podem ser empacotados no web. No web, a fonte padrão é definida via CSS
 * (index.css / react-native-web), então aqui não há nada a fazer.
 */
export function applyGlobalFont(): void {
  // no-op no web
}
