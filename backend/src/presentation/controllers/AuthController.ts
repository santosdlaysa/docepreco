import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { sendPasswordResetCode } from '../../infrastructure/services/emailService';
import { notifyNewUser } from '../../infrastructure/services/telegramService';

const userRepo = new PostgresUserRepository();
const JWT_SECRET = process.env.JWT_SECRET || 'sweet-pricing-secret';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { companyName, email, password } = req.body;
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
      const existing = await userRepo.findByEmail(email);
      if (existing) {
        res.status(409).json({ success: false, error: 'Email já cadastrado' });
        return;
      }
      const user = await userRepo.create({ companyName, email, password });
      notifyNewUser(companyName, email);
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      res.status(201).json({ success: true, data: { user, token } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ success: false, error: 'Email inválido' });
        return;
      }
      const user = await userRepo.findByEmail(email);
      if (!user) {
        res.status(401).json({ success: false, error: 'Email ou senha incorretos' });
        return;
      }
      const valid = await userRepo.verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ success: false, error: 'Email ou senha incorretos' });
        return;
      }
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      const { passwordHash, ...safeUser } = user;
      res.json({ success: true, data: { user: safeUser, token } });
    } catch (error) {
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
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  async me(req: Request & { userId?: string }, res: Response): Promise<void> {
    try {
      const user = await userRepo.findById(req.userId!);
      if (!user) { res.status(404).json({ success: false, error: 'Usuário não encontrado' }); return; }
      res.json({ success: true, data: user });
    } catch {
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }
}
