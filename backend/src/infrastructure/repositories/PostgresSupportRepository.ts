import { pool } from '../database/connection';

export interface SupportMessage {
  id: string;
  userId: string;
  senderType: 'user' | 'admin';
  message: string;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

// Públicos possíveis para um broadcast no chat — espelham os alvos de push
// (ver PostgresPushTokenRepository.findByTarget) para o admin poder mandar a
// mesma mensagem no chat e na notificação para a mesma audiência.
export type BroadcastTarget = 'all' | 'premium' | 'free' | 'master' | 'expired';

export interface ConversationSummary {
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderType: 'user' | 'admin';
  unreadCount: number;
}

export class PostgresSupportRepository {
  async findByUserId(userId: string): Promise<SupportMessage[]> {
    const result = await pool.query(
      'SELECT * FROM support_messages WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    return result.rows.map(this.mapRow);
  }

  async create(data: { userId: string; senderType: 'user' | 'admin'; message: string; imageUrl?: string | null }): Promise<SupportMessage> {
    const result = await pool.query(
      `INSERT INTO support_messages (user_id, sender_type, message, image_url) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.userId, data.senderType, data.message, data.imageUrl ?? null]
    );
    return this.mapRow(result.rows[0]);
  }

  // Grava a MESMA mensagem do admin na conversa de todos os usuários do público
  // escolhido, de uma vez (INSERT ... SELECT, sem loop). Retorna quantos usuários
  // receberam. O filtro por público espelha PostgresPushTokenRepository.findByTarget.
  async createBroadcast(data: { message: string; imageUrl?: string | null; target: BroadcastTarget }): Promise<number> {
    const where = broadcastWhereClause(data.target);
    const result = await pool.query(
      `INSERT INTO support_messages (user_id, sender_type, message, image_url)
       SELECT u.id, 'admin', $1, $2 FROM users u ${where}`,
      [data.message, data.imageUrl ?? null]
    );
    return result.rowCount ?? 0;
  }

  // Remove uma mensagem enviada pelo admin. Restrito a sender_type = 'admin'
  // para o admin só conseguir apagar as próprias mensagens (nunca as da confeiteira).
  async deleteAdminMessage(id: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM support_messages WHERE id = $1 AND sender_type = 'admin'`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async markAsRead(userId: string, senderType: 'user' | 'admin'): Promise<void> {
    await pool.query(
      `UPDATE support_messages SET read_at = NOW() WHERE user_id = $1 AND sender_type = $2 AND read_at IS NULL`,
      [userId, senderType]
    );
  }

  async getConversations(): Promise<ConversationSummary[]> {
    const result = await pool.query(`
      SELECT
        sub.user_id,
        sub.user_name,
        sub.user_email,
        sub.last_message,
        sub.last_message_at,
        sub.last_sender_type,
        sub.unread_count
      FROM (
        SELECT DISTINCT ON (sm.user_id)
          sm.user_id,
          u.company_name AS user_name,
          u.email AS user_email,
          sm.message AS last_message,
          sm.created_at AS last_message_at,
          sm.sender_type AS last_sender_type,
          (SELECT COUNT(*)::int FROM support_messages WHERE user_id = sm.user_id AND sender_type = 'user' AND read_at IS NULL) AS unread_count
        FROM support_messages sm
        JOIN users u ON u.id = sm.user_id
        ORDER BY sm.user_id, sm.created_at DESC
      ) sub
      ORDER BY sub.last_message_at DESC
    `);
    return result.rows.map((row: Record<string, unknown>) => ({
      userId: row.user_id as string,
      userName: (row.user_name as string) ?? '',
      userEmail: (row.user_email as string) ?? '',
      lastMessage: row.last_message as string,
      lastMessageAt: (row.last_message_at as Date).toISOString(),
      lastSenderType: row.last_sender_type as 'user' | 'admin',
      unreadCount: row.unread_count as number,
    }));
  }

  async getUnreadCountForUser(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM support_messages WHERE user_id = $1 AND sender_type = 'admin' AND read_at IS NULL`,
      [userId]
    );
    return result.rows[0]?.count ?? 0;
  }

  async getTotalUnreadCount(): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM support_messages WHERE sender_type = 'user' AND read_at IS NULL`
    );
    return result.rows[0]?.count ?? 0;
  }

  private mapRow(row: Record<string, unknown>): SupportMessage {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      senderType: row.sender_type as 'user' | 'admin',
      message: row.message as string,
      imageUrl: (row.image_url as string | null) ?? null,
      readAt: row.read_at ? (row.read_at as Date).toISOString() : null,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}

// Cláusula WHERE (sobre a tabela users aliasada como u) que seleciona o público
// do broadcast. Mantida em sincronia com PostgresPushTokenRepository.findByTarget.
function broadcastWhereClause(target: BroadcastTarget): string {
  switch (target) {
    case 'expired':
      return 'WHERE u.premium_until IS NOT NULL AND u.premium_until <= NOW()';
    case 'master':
      return "WHERE u.plan_tier = 'master'";
    case 'premium':
      return "WHERE u.plan_tier = 'premium' AND (u.premium_until IS NULL OR u.premium_until > NOW())";
    case 'free':
      return 'WHERE u.is_premium = FALSE OR (u.is_premium = TRUE AND u.premium_until <= NOW())';
    case 'all':
    default:
      return '';
  }
}
