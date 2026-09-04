import { AppStats } from '../../data/api/statsApi';
import { RevenueGoal } from '../../data/api/goalApi';

export interface Insight {
  id: string;
  icon: string; // Ionicons name
  message: string;
  type: 'positive' | 'warning' | 'neutral' | 'tip';
}

export function generateInsights(
  stats: AppStats,
  goal: RevenueGoal | null,
  fmt: (v: number) => string,
): Insight[] {
  const insights: Insight[] = [];
  const { monthlySalesCount, monthlyRevenue, recentSales, recipesCount } = stats;

  // 1. Meta do mês
  if (goal) {
    const pct = Math.round((monthlyRevenue / goal.amount) * 100);
    if (pct >= 100) {
      insights.push({
        id: 'goal-achieved',
        icon: 'trophy-outline',
        message: `Parabéns! Você bateu a meta do mês com ${pct}% do objetivo!`,
        type: 'positive',
      });
    } else if (pct >= 70) {
      const falta = goal.amount - monthlyRevenue;
      insights.push({
        id: 'goal-close',
        icon: 'flag-outline',
        message: `Quase lá! Faltam ${fmt(falta)} para bater a meta.`,
        type: 'neutral',
      });
    } else if (pct > 0) {
      insights.push({
        id: 'goal-behind',
        icon: 'alert-circle-outline',
        message: `Seu faturamento atingiu apenas ${pct}% da meta. Hora de acelerar as vendas!`,
        type: 'warning',
      });
    }
  }

  // 2. Ticket médio
  if (monthlySalesCount > 0) {
    const ticketMedio = monthlyRevenue / monthlySalesCount;
    insights.push({
      id: 'avg-ticket',
      icon: 'receipt-outline',
      message: `Seu ticket médio é ${fmt(ticketMedio)} por venda.`,
      type: 'neutral',
    });

    // Vende muito mas fatura pouco
    if (monthlySalesCount >= 10 && ticketMedio < 30) {
      insights.push({
        id: 'low-ticket',
        icon: 'trending-down-outline',
        message: 'Você vende bastante, mas o ticket médio está baixo. Considere revisar seus preços!',
        type: 'warning',
      });
    }
  }

  // 3. Campeão de vendas
  if (recentSales.length > 0) {
    const salesByRecipe: Record<string, { name: string; total: number }> = {};
    for (const sale of recentSales) {
      if (!salesByRecipe[sale.recipeName]) {
        salesByRecipe[sale.recipeName] = { name: sale.recipeName, total: 0 };
      }
      salesByRecipe[sale.recipeName].total += sale.totalRevenue;
    }
    const top = Object.values(salesByRecipe).sort((a, b) => b.total - a.total)[0];
    if (top) {
      insights.push({
        id: 'top-recipe',
        icon: 'star-outline',
        message: `"${top.name}" é o campeão de vendas recente, com ${fmt(top.total)} faturados.`,
        type: 'positive',
      });
    }
  }

  // 4. Sem vendas
  if (monthlySalesCount === 0 && recipesCount > 0) {
    insights.push({
      id: 'no-sales',
      icon: 'cart-outline',
      message: 'Você ainda não registrou vendas este mês. Registre suas vendas para acompanhar o faturamento!',
      type: 'tip',
    });
  }

  // 5. Sem receitas
  if (recipesCount === 0) {
    insights.push({
      id: 'no-recipes',
      icon: 'book-outline',
      message: 'Crie sua primeira receita para começar a precificar seus produtos!',
      type: 'tip',
    });
  }

  // 6. Poucas receitas mas vendendo
  if (recipesCount > 0 && recipesCount <= 2 && monthlySalesCount > 0) {
    insights.push({
      id: 'few-recipes',
      icon: 'bulb-outline',
      message: `Você tem só ${recipesCount} receita${recipesCount > 1 ? 's' : ''}. Diversificar o cardápio pode aumentar seu faturamento!`,
      type: 'tip',
    });
  }

  return insights;
}
