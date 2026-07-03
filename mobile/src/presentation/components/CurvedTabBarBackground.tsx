import React, { useState } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

// Onda do menu inferior: topo reto com um vale central de 112px de largura
// e 32px de profundidade, onde o botão "+" se encaixa. Curva extraída do
// SVG de design (viewBox 344x92, topo da barra em y=28.5) e recentralizada
// para qualquer largura de tela.
function buildWavePath(width: number, height: number): string {
  const c = width / 2;
  return [
    `M${c - 56} 0.5`,
    `C${c - 49.532} 0.5 ${c - 43.753} 3.455 ${c - 38.436} 7.662`,
    `C${c - 33.114} 11.873 ${c - 28.313} 17.289 ${c - 23.78} 22.153`,
    `C${c - 17.848} 28.518 ${c - 9.389} 32.5 ${c} 32.5`,
    `C${c + 9.389} 32.5 ${c + 17.848} 28.518 ${c + 23.78} 22.153`,
    `C${c + 28.313} 17.289 ${c + 33.114} 11.873 ${c + 38.436} 7.662`,
    `C${c + 43.753} 3.455 ${c + 49.532} 0.5 ${c + 56} 0.5`,
    `H${width - 0.5}`,
    `V${height}`,
    `H0.5`,
    'V0.5',
    'Z',
  ].join(' ');
}

export function CurvedTabBarBackground() {
  // Mede o tamanho real da barra: usar a largura da janela desloca o desenho
  // quando a barra não ocupa a tela inteira, deixando o lado direito cortado.
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size.width > 0 && size.height > 0 && (
        <Svg width={size.width} height={size.height}>
          {/* Mesmas cores do menu atual: fundo surface com a borda superior seguindo o corte */}
          <Path d={buildWavePath(size.width, size.height)} fill={colors.surface} stroke={colors.border} />
        </Svg>
      )}
    </View>
  );
}
