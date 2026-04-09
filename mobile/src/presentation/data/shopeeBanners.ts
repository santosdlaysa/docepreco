// ============================================================
// ✏️  CADASTRO DE BANNERS DA SHOPEE
//
// Para adicionar um novo banner, copie um dos blocos abaixo
// e preencha os campos:
//
//   name        → nome do produto
//   description → descrição curta
//   emoji       → emoji de fallback (caso a imagem não carregue)
//   url         → link de afiliado da Shopee (s.shopee.com.br/...)
//   image       → URL direta da foto do produto (opcional, mas recomendado)
//                 Como pegar: abra o produto no navegador → botão direito
//                 na foto → "Copiar endereço da imagem"
//
// O campo `category` pode ser: 'Formas' | 'Ingredientes' | 'Embalagens' | 'Decoração'
// ============================================================

export interface ShopeeBanner {
  id: string;
  emoji: string;
  name: string;
  description: string;
  category: 'Formas' | 'Ingredientes' | 'Embalagens' | 'Decoração';
  url: string;
  image?: string;
}

export const shopeeBanners: ShopeeBanner[] = [
  {
    id: '1',
    emoji: '🎂',
    name: 'Kit 10 Cake Board 30cm em MDF 3mm Redondo de Bolo',
    description: 'Kit 10 Cake Board 30cm em MDF 3mm Redondo de Bolo',
    category: 'Formas',
    url: 'https://s.shopee.com.br/4AvsZu3VWX',
    image: 'https://down-aka-br.img.susercontent.com/br-11134207-81ztc-mjsnpzi3ihhf45.webp',
  },
  {
    id: '2',
    emoji: '🟫',
    name: 'Espatula para Alisar Bolo',
    description: 'Confeitaria Linha Color Rosa Pink Profissional',
    category: 'Formas',
    url: 'https://s.shopee.com.br/1Vv7P2LVuY',
    image: 'https://down-aka-br.img.susercontent.com/6dc982478c377cb7a71e31eb89f65ef5.webp',
  },
  {
    id: '3',
    emoji: '🍫',
    name: ' Kit Pote de Vidro Hermético Retangular',
    description: '5 Unid Travas Marmita Fit Microondas',
    category: 'Formas',
    url: 'https://s.shopee.com.br/16JcPO3o9',
    image: 'https://down-aka-br.img.susercontent.com/br-11134207-7r98o-mdn5xvzwinrl9c.webp',
  },
];
