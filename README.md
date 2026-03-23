# Precifica Doces

Aplicativo mobile para precificacao de doces, desenvolvido para confeiteiras iniciantes e profissionais.

## Tecnologias

**Mobile:** React Native + Expo + TypeScript
**Backend:** Node.js + Express + TypeScript
**Banco de dados:** PostgreSQL
**Arquitetura:** Clean Architecture

## Como rodar

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edite .env com suas credenciais do PostgreSQL
npm run migrate
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npm start
```

## Funcionalidades

- Cadastro de ingredientes com unidade de medida
- Criacao de receitas com ingredientes e custos adicionais
- Calculo automatico de preco de venda
- Margem de lucro configuravel
- Tela de resultado com custo por unidade e lucro estimado
- CRUD completo de receitas e ingredientes
