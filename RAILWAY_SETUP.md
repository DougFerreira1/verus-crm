# Verus CRM — Guia de hospedagem no Railway

Este pacote contém o código-fonte completo do Verus CRM, preparado para rodar no **Railway** (ou qualquer provedor que hospede aplicações Node.js/Next.js, como Render, Vercel, Fly.io).

> ⚠️ Importante: esta é uma cópia independente. Ela **não** se conecta ao banco de dados nem às integrações da versão hospedada na Abacus.AI. Você vai configurar um banco e as chaves próprias abaixo.

---

## 1. Pré-requisitos

- Conta no [Railway](https://railway.app)
- [Node.js 20+](https://nodejs.org) instalado localmente (opcional, para testar antes)
- O [Railway CLI](https://docs.railway.app/develop/cli) (opcional)

---

## 2. Subir o código para o Railway

Você tem duas opções:

### Opção A — Via GitHub (recomendado)
1. Crie um repositório novo no seu GitHub e envie o conteúdo desta pasta.
2. No Railway: **New Project → Deploy from GitHub repo** e selecione o repositório.

### Opção B — Via Railway CLI
```bash
npm i -g @railway/cli
railway login
cd verus-railway
railway init
railway up
```

---

## 3. Adicionar o banco de dados PostgreSQL

1. No painel do projeto no Railway, clique em **New → Database → Add PostgreSQL**.
2. O Railway cria a variável `DATABASE_URL` automaticamente.

---

## 4. Configurar as variáveis de ambiente

No serviço da aplicação, vá em **Variables** e adicione (veja `.env.example`):

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência ao banco do Railway) |
| `AUTH_SECRET` | gere com `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | mesmo valor do `AUTH_SECRET` |
| `NEXTAUTH_URL` | a URL pública do app (ex.: `https://verus.up.railway.app`) |
| `ABACUSAI_API_KEY` | sua chave de IA (veja a seção **6**) |

---

## 5. Criar as tabelas e os usuários iniciais

Após o primeiro deploy, rode a migração do banco e o seed (dados iniciais):

```bash
# via Railway CLI, conectado ao projeto:
railway run npx prisma db push
railway run yarn db:seed
```

O `railway.json` já executa `prisma db push` automaticamente a cada start, então as tabelas são criadas no primeiro deploy. O **seed** (usuários de login e configurações padrão) precisa ser rodado uma vez manualmente com o comando acima.

Usuários criados pelo seed:
- `usuario1@crm.com` / senha `Crm@2024!`
- `usuario2@crm.com` / senha `Crm@2024!`

---

## 6. IA (agente) — escolha uma opção

O código chama um endpoint **compatível com OpenAI** em `lib/agent.ts` e `app/api/agent-test/route.ts`.

### Opção A — Manter a API da Abacus.AI (mais simples)
Mantenha o endpoint atual e preencha `ABACUSAI_API_KEY` com sua chave da Abacus.AI. Nada mais a mudar.

### Opção B — Usar OpenAI diretamente (independência total)
Em **`lib/agent.ts`** e **`app/api/agent-test/route.ts`**, troque:
```ts
const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}` },
```
por:
```ts
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
```
e defina a variável `OPENAI_API_KEY` no Railway. Os nomes de modelo (`gpt-4o`, `gpt-4o-mini`, etc.) já são compatíveis.

---

## 7. Build e start

O Railway detecta Next.js automaticamente. Os comandos usados são:

- **Build:** `yarn install` → `prisma generate && next build` (via `postinstall` + script `build`)
- **Start:** `prisma db push --skip-generate && next start` (definido em `railway.json`)

O Next.js escuta na porta da variável `PORT` que o Railway injeta automaticamente.

---

## 8. Domínio próprio (verusapp.com.br)

1. No serviço do app no Railway → **Settings → Networking → Custom Domain**.
2. Digite `verusapp.com.br`.
3. O Railway mostra um registro **CNAME** (ou A) — adicione-o no painel DNS do seu registrador (Registro.br).
4. Atualize `NEXTAUTH_URL` para `https://verusapp.com.br`.

---

## 9. Integrações opcionais

- **WhatsApp (Z-API / Evolution API):** configurado dentro do app em *Configurações → WhatsApp*. Não precisa de variável de ambiente — as credenciais são salvas no banco.
- **Google Calendar:** o app tem fallback local. Para sincronizar de verdade, será necessário configurar um app OAuth no Google Cloud Console e adaptar o código em `app/api/google-calendar-config`.

---

## Resumo dos arquivos adicionados para o Railway

| Arquivo | Função |
|---|---|
| `.env.example` | Modelo das variáveis de ambiente |
| `railway.json` | Configuração de build/start do Railway |
| `.gitignore` | Ignora `node_modules`, `.next`, `.env` |
| `next.config.js` | Config limpa (sem dependências da Abacus) |
| `RAILWAY_SETUP.md` | Este guia |

Boa sorte! Qualquer dúvida na adaptação do código, é só perguntar.
