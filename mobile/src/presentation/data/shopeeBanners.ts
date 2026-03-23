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
    name: 'Kit 100 Sacos De Confeitar Medio Confeitaria',
    description: 'Bolo Doce Confeitaria Bolo Doce Cupcake',
    category: 'Formas',
    url: 'https://s.shopee.com.br/5fkFrhuOux',
    image: 'https://down-br.img.susercontent.com/file/sg-11134201-7rbkt-m5iz6pwzohh059_tn',
  },
  {
    id: '2',
    emoji: '🟫',
    name: '5 Caixas Duo Ovos de Colher 150g',
    description: 'Ovo de colher',
    category: 'Formas',
    url: 'https://s.shopee.com.br/6VJMrR8efO',
    image: 'https://down-br.img.susercontent.com/file/br-11134207-7r98o-lq3iwcrutn3be6@resize_w450_nl.webp',
  },
  {
    id: '3',
    emoji: '🍫',
    name: '10 un Caixa para ovo de colher 150-250-350-500g',
    description: '10 un Caixa para ovo de colher 150-250-350-500g',
    category: 'Ingredientes',
    url: 'https://s.shopee.com.br/9ztF39GDP7',
    image: 'https://down-br.img.susercontent.com/file/1919e93de9efc280436ce2ee3924177f@resize_w450_nl.webp',
  },
];
