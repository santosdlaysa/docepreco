import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../domain/entities/User';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { PostgresSuggestionRepository } from '../../infrastructure/repositories/PostgresSuggestionRepository';
import { sendPasswordResetCode } from '../../infrastructure/services/emailService';
import { notifyNewUser, notifyUserMilestone } from '../../infrastructure/services/telegramService';

const userRepo = new PostgresUserRepository();
const suggestionRepo = new PostgresSuggestionRepository();
const JWT_SECRET = process.env.JWT_SECRET || 'sweet-pricing-secret';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { companyName, email, password, phone } = req.body;
      if (!companyName || !email || !password) {
        res.status(400).json({ success: false, error: 'Nome da empresa, email e senha são obrigatórios' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ success: false, error: 'Email inválido' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ success: false, error: 'Senha deve ter pelo menos 6 caracteres' });
        return;
      }
      if (phone !== undefined && phone !== null && phone !== '') {
        const digits = String(phone).replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 13) {
          res.status(400).json({ success: false, error: 'Número de celular inválido' });
          return;
        }
      }
      const existing = await userRepo.findByEmail(email);
      if (existing) {
        res.status(409).json({ success: false, error: 'Email já cadastrado' });
        return;
      }
      const user = await userRepo.create({ companyName, email, password, phone });
      notifyNewUser(companyName, email);
      userRepo.countAll().then(({ total }) => notifyUserMilestone(total)).catch(() => {});
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      res.status(201).json({ success: true, data: { user, token } });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      console.log(`[Auth] Login attempt: ${email ?? '(empty)'}`);
      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.log(`[Auth] Login failed: invalid email format — ${email}`);
        res.status(400).json({ success: false, error: 'Email inválido' });
        return;
      }
      const user = await userRepo.findByEmail(email);
      if (!user) {
        console.log(`[Auth] Login failed: email not found — ${email}`);
        res.status(401).json({ success: false, error: 'Email ou senha incorretos' });
        return;
      }
      const valid = await userRepo.verifyPassword(password, user.passwordHash);
      if (!valid) {
        console.log(`[Auth] Login failed: wrong password — ${email}`);
        res.status(401).json({ success: false, error: 'Email ou senha incorretos' });
        return;
      }
      console.log(`[Auth] Login success: ${email} (${user.companyName})`);
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      const { passwordHash, ...safeUser } = user;
      res.json({ success: true, data: { user: safeUser, token } });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: 'Email é obrigatório' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ success: false, error: 'Email inválido' });
        return;
      }
      const user = await userRepo.findByEmail(email);
      if (!user) {
        // Return success even if user not found (security: don't reveal if email exists)
        res.json({ success: true, message: 'Se o email estiver cadastrado, você receberá um código de recuperação' });
        return;
      }
      const code = await userRepo.createPasswordResetCode(user.id);
      await sendPasswordResetCode(user.email, code);
      res.json({ success: true, message: 'Se o email estiver cadastrado, você receberá um código de recuperação' });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        res.status(400).json({ success: false, error: 'Email, código e nova senha são obrigatórios' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ success: false, error: 'Senha deve ter pelo menos 6 caracteres' });
        return;
      }
      const result = await userRepo.verifyPasswordResetCode(email, code);
      if (!result.valid || !result.userId) {
        res.status(400).json({ success: false, error: 'Código inválido ou expirado' });
        return;
      }
      await userRepo.updatePassword(result.userId, newPassword);
      await userRepo.markResetCodeUsed(result.userId, code);
      res.json({ success: true, message: 'Senha atualizada com sucesso' });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  async updateProfile(req: Request & { userId?: string }, res: Response): Promise<void> {
    try {
      const { instagramHandle, phone } = req.body;
      let user: (User & { passwordHash: string }) | null = null;

      if (instagramHandle !== undefined && instagramHandle !== null) {
        const handle = String(instagramHandle).replace(/^@/, '').trim();
        if (handle.length > 30) {
          res.status(400).json({ success: false, error: 'Instagram inválido (máximo 30 caracteres)' });
          return;
        }
        if (handle && !/^[a-zA-Z0-9._]+$/.test(handle)) {
          res.status(400).json({ success: false, error: 'Instagram inválido (apenas letras, números, . e _)' });
          return;
        }
        user = await userRepo.updateInstagramHandle(req.userId!, handle || null);
      }

      if (phone !== undefined) {
        const cleanPhone = phone === null || phone === '' ? null : String(phone).replace(/\D/g, '');
        if (cleanPhone !== null && (cleanPhone.length < 10 || cleanPhone.length > 13)) {
          res.status(400).json({ success: false, error: 'Número de celular inválido' });
          return;
        }
        user = await userRepo.updatePhone(req.userId!, cleanPhone);
      }

      if (!user) {
        if (instagramHandle === undefined && phone === undefined) {
          res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
          return;
        }
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }

      const { passwordHash, ...safeUser } = user;
      res.json({ success: true, data: safeUser });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  async changePassword(req: Request & { userId?: string }, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, error: 'Senha atual e nova senha são obrigatórias' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ success: false, error: 'Nova senha deve ter pelo menos 6 caracteres' });
        return;
      }
      const user = await userRepo.findByIdFull(req.userId!);
      if (!user) {
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }
      const valid = await userRepo.verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        res.status(401).json({ success: false, error: 'Senha atual incorreta' });
        return;
      }
      await userRepo.updatePassword(req.userId!, newPassword);
      res.json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  async me(req: Request & { userId?: string }, res: Response): Promise<void> {
    try {
      const user = await userRepo.findById(req.userId!);
      if (!user) { res.status(404).json({ success: false, error: 'Usuário não encontrado' }); return; }
      res.json({ success: true, data: user });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  async sendSuggestion(req: Request & { userId?: string }, res: Response): Promise<void> {
    try {
      const { message } = req.body;
      if (!message || !message.trim()) {
        res.status(400).json({ success: false, error: 'Mensagem é obrigatória' });
        return;
      }
      const user = await userRepo.findById(req.userId!);
      if (!user) { res.status(404).json({ success: false, error: 'Usuário não encontrado' }); return; }
      await suggestionRepo.create({
        userId: req.userId!,
        userName: user.companyName,
        userEmail: user.email,
        message: message.trim(),
      });
      res.status(201).json({ success: true, message: 'Sugestão enviada com sucesso' });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao enviar sugestão' });
    }
  }
}
