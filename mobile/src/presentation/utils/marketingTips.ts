/**
 * Biblioteca curada de dicas de marketing e vendas para confeitaria/doces
 * caseiros. Conteúdo estático e acionável — complementa as análises
 * personalizadas geradas a partir dos dados do usuário.
 */

export type MarketingCategory =
  | 'instagram'
  | 'whatsapp'
  | 'fotos'
  | 'preco'
  | 'fidelizacao'
  | 'datas'
  | 'captacao';

export interface MarketingTip {
  id: string;
  category: MarketingCategory;
  icon: string;        // Ionicons
  title: string;
  body: string;
  /** Link opcional exibido como botão no card expandido (ex.: template do Canva). */
  link?: { url: string; label: string };
}

export interface CategoryMeta {
  key: MarketingCategory;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

export const MARKETING_CATEGORIES: CategoryMeta[] = [
  { key: 'instagram',   label: 'Instagram',    icon: 'logo-instagram',     color: '#C13584', bg: '#FCEAF4' },
  { key: 'whatsapp',    label: 'WhatsApp',     icon: 'logo-whatsapp',      color: '#1FA855', bg: '#E3F7EC' },
  { key: 'fotos',       label: 'Fotos',        icon: 'camera-outline',     color: '#2B7DDB', bg: '#E7F1FC' },
  { key: 'preco',       label: 'Preço & ofertas', icon: 'pricetags-outline', color: '#7C3AED', bg: '#F1E8FB' },
  { key: 'fidelizacao', label: 'Fidelização',  icon: 'heart-outline',      color: '#E8537A', bg: '#FCE7ED' },
  { key: 'datas',       label: 'Datas',        icon: 'calendar-outline',   color: '#E0922B', bg: '#FCEFD9' },
  { key: 'captacao',    label: 'Atrair clientes', icon: 'megaphone-outline', color: '#0E9C8A', bg: '#E1F6F3' },
];

export const MARKETING_TIPS: MarketingTip[] = [
  // ── Destaque: template pronto de Story ──
  {
    id: 'ig-template-story', category: 'instagram', icon: 'color-palette-outline',
    title: 'Template de Story pronto no Canva',
    body: 'Não sabe como deixar o Story bonito? Use um modelo pronto: é só trocar a foto e o texto pelo seu doce e publicar. Toque no botão abaixo para abrir o template no Canva e personalizar em minutos.',
    link: { url: 'https://canva.link/0e147tvm3mph6ls', label: 'Abrir template de Story no Canva' },
  },

  // ── Instagram / redes ──
  {
    id: 'ig-constancia', category: 'instagram', icon: 'repeat-outline',
    title: 'Apareça com constância',
    body: 'O algoritmo premia quem posta com frequência. Defina uma rotina realista (ex.: 3 posts no feed por semana + Stories diários) e mantenha. Constância vale mais que perfeição — é melhor postar simples toda semana do que sumir por um mês.',
  },
  {
    id: 'ig-reels', category: 'instagram', icon: 'film-outline',
    title: 'Reels de "fazendo o doce" engajam mais',
    body: 'Vídeos curtos mostrando o passo a passo, o recheio escorrendo ou a montagem alcançam muito mais gente do que fotos paradas. Grave 15–30s, use uma música em alta e mostre o resultado final logo nos primeiros segundos.',
  },
  {
    id: 'ig-bastidores', category: 'instagram', icon: 'eye-outline',
    title: 'Use os Stories para criar desejo',
    body: 'Mostre os bastidores: ingredientes chegando, a cozinha, o doce saindo do forno, o cliente recebendo. Isso gera conexão e confiança. Encerre com um convite claro: "Chama no direct para encomendar".',
  },
  {
    id: 'ig-bio', category: 'instagram', icon: 'list-outline',
    title: 'Bio e destaques que vendem',
    body: 'Sua bio deve dizer em 1 linha o que você faz e como pedir (link do WhatsApp). Organize os Destaques como um cardápio: "Sabores", "Preços", "Como encomendar", "Clientes felizes". Quem chega no seu perfil precisa saber comprar em 10 segundos.',
  },

  // ── WhatsApp / atendimento ──
  {
    id: 'wa-business', category: 'whatsapp', icon: 'briefcase-outline',
    title: 'Use o WhatsApp Business com catálogo',
    body: 'O WhatsApp Business é gratuito e deixa você montar um catálogo com fotos e preços. O cliente navega e já escolhe sem você precisar repetir tudo. Configure também o horário de atendimento e a mensagem de saudação.',
  },
  {
    id: 'wa-rapidez', category: 'whatsapp', icon: 'flash-outline',
    title: 'Responder rápido fecha mais venda',
    body: 'A maioria das vendas se perde por demora na resposta. Use as "respostas rápidas" do WhatsApp Business para mandar tabela de preços, sabores e prazos em segundos. Quanto mais ágil, maior a chance de fechar antes do cliente procurar outra confeiteira.',
  },
  {
    id: 'wa-transmissao', category: 'whatsapp', icon: 'send-outline',
    title: 'Lista de transmissão para novidades',
    body: 'Crie listas de transmissão para avisar clientes sobre novos sabores, promoções e abertura de agenda de datas comemorativas. Diferente do grupo, cada um recebe como mensagem individual — mais pessoal e sem incomodar.',
  },

  // ── Fotos ──
  {
    id: 'foto-luz', category: 'fotos', icon: 'sunny-outline',
    title: 'Luz natural é seu melhor estúdio',
    body: 'Fotografe perto de uma janela, de dia, sem flash. A luz natural deixa o doce apetitoso e com cores reais. Evite luz amarela de lâmpada, que deixa a foto "suja". A foto é sua vitrine — vale mais que mil palavras.',
  },
  {
    id: 'foto-corte', category: 'fotos', icon: 'cut-outline',
    title: 'Mostre o recheio',
    body: 'Foto de doce cortado, com o recheio aparecendo, desperta muito mais desejo. Brigadeiro mordido, bolo de pote em camadas, coxinha aberta. O cliente compra com os olhos — mostre a parte mais gostosa.',
  },
  {
    id: 'foto-fundo', category: 'fotos', icon: 'crop-outline',
    title: 'Fundo limpo, foco no doce',
    body: 'Tire a bagunça do enquadramento. Um fundo neutro (mármore, madeira clara, um pano liso) faz o produto se destacar. Aproxime a câmera e deixe o doce ser a estrela.',
  },

  // ── Preço & ofertas ──
  {
    id: 'preco-combo', category: 'preco', icon: 'gift-outline',
    title: 'Combos aumentam o ticket médio',
    body: 'Em vez de vender 1 unidade, ofereça kits: "caixa com 6 sabores", "combo café da tarde", "kit festa com 50 docinhos". O cliente gasta mais por pedido e você ganha tempo produzindo em lote. Dê um pequeno desconto no combo para incentivar.',
  },
  {
    id: 'preco-degustacao', category: 'preco', icon: 'cafe-outline',
    title: 'Kit degustação para novos clientes',
    body: 'Um kit pequeno com vários sabores é a porta de entrada perfeita. O cliente experimenta tudo, descobre o favorito e volta para comprar a versão cheia. Custa pouco para você e converte indeciso em cliente fiel.',
  },
  {
    id: 'preco-ancoragem', category: 'preco', icon: 'pricetag-outline',
    title: 'Ofereça 3 opções de tamanho',
    body: 'Quando você mostra P, M e G, a maioria escolhe o do meio — e você guia a venda. Ter uma opção "premium" mais cara também faz as outras parecerem mais acessíveis. Nunca ofereça só uma opção: dê ao cliente o poder de escolher para cima.',
  },
  {
    id: 'preco-entrega', category: 'preco', icon: 'bicycle-outline',
    title: 'Deixe a taxa de entrega clara',
    body: 'Informe o valor da entrega antes de fechar, para não gerar atrito no fim. Ofereça frete grátis acima de um valor mínimo ("entrega grátis acima de R$ 60") — isso empurra o cliente a comprar mais para "compensar o frete".',
  },

  // ── Fidelização ──
  {
    id: 'fid-cartao', category: 'fidelizacao', icon: 'ticket-outline',
    title: 'Cartão fidelidade',
    body: 'A cada X compras, um brinde ou desconto. Simples e poderoso: dá motivo para o cliente voltar sempre em você e não na concorrência. Pode ser um cartãozinho carimbado ou um controle no caderninho mesmo.',
  },
  {
    id: 'fid-posvenda', category: 'fidelizacao', icon: 'chatbubble-ellipses-outline',
    title: 'Pós-venda que encanta',
    body: 'No dia seguinte à entrega, mande uma mensagem: "Oi! Que bom que escolheu meus doces 💛 Deu tudo certo na festa?". Esse cuidado faz o cliente lembrar de você e indicar. Custa 30 segundos e vale muitas recompras.',
  },
  {
    id: 'fid-brinde', category: 'fidelizacao', icon: 'sparkles-outline',
    title: 'Brinde surpresa no pedido',
    body: 'Inclua um docinho extra ou um bilhete escrito à mão de vez em quando. A surpresa gera foto, story marcando você e propaganda gratuita. Pequenos mimos criam clientes apaixonados.',
  },

  // ── Datas comemorativas ──
  {
    id: 'data-calendario', category: 'datas', icon: 'calendar-number-outline',
    title: 'Planeje o calendário do ano',
    body: 'Páscoa, Dia das Mães, Namorados, Festa Junina, Dia das Crianças e Natal são picos de venda. Marque no calendário e prepare cardápio, fotos e divulgação com antecedência. Quem se antecipa pega as melhores encomendas.',
  },
  {
    id: 'data-agenda', category: 'datas', icon: 'lock-open-outline',
    title: 'Abra a agenda com antecedência',
    body: 'Anuncie "Agenda de Páscoa aberta!" semanas antes e crie urgência: "Vagas limitadas". Ofereça desconto para quem encomenda cedo. Isso organiza sua produção e garante caixa antes da data.',
  },
  {
    id: 'data-kits', category: 'datas', icon: 'cube-outline',
    title: 'Kits temáticos da data',
    body: 'Monte kits exclusivos para cada ocasião: "Caixa Dia das Mães", "Cesta de Páscoa", "Box romântico". Embalagem temática justifica preço maior e vira presente pronto — o cliente compra a experiência, não só o doce.',
  },

  // ── Atrair clientes ──
  {
    id: 'cap-indicacao', category: 'captacao', icon: 'people-outline',
    title: 'Peça indicação (e recompense)',
    body: 'Cliente satisfeito indica se você pedir. Ofereça um benefício: "Indique uma amiga e ganhe 10% no próximo pedido". O boca a boca é a propaganda mais barata e que mais converte na confeitaria.',
  },
  {
    id: 'cap-parcerias', category: 'captacao', icon: 'git-merge-outline',
    title: 'Parcerias locais',
    body: 'Cafés, floriculturas, salões e papelarias atendem o mesmo público que você. Proponha deixar seus doces à venda ou trocar indicação. Uma parceria boa coloca seu produto na frente de clientes novos sem gastar com anúncio.',
  },
  {
    id: 'cap-amostra', category: 'captacao', icon: 'happy-outline',
    title: 'Amostras para quem tem alcance',
    body: 'Envie um kit cortesia para uma microinfluenciadora ou pessoa querida do seu bairro. Um story marcando você pode trazer dezenas de pedidos. Escolha quem fala com o seu público local, não precisa ser alguém famoso.',
  },
  {
    id: 'cap-depoimentos', category: 'captacao', icon: 'star-outline',
    title: 'Colecione e mostre depoimentos',
    body: 'Print de elogio no WhatsApp, foto do cliente com o doce, comentário feliz — guarde tudo e poste nos Stories e Destaques. Prova social vence a desconfiança de quem ainda não comprou de você.',
  },
];
