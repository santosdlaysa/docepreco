import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';

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
