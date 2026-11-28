# Contexto do Projeto — Feirinha Pedidos

Resumo compacto para retomada rápida em novas sessões sem reler o histórico completo.

## Arquitetura e Arquivos
- **Frontend SPA estático:** `public/index.html` (HTML + CSS + JS vanilla, polling a cada 5s, autenticação por header `x-senha` salvo em `localStorage`).
  - Abas: `Painel` (filtros: `Novos`, `Prontos`, `Todos`; novos sempre primeiro), `Resumo` (KPIs dia/mês, gráfico diário, pagamentos, top produtos) e `Cardápio` (CRUD de produtos).
- **Backend Serverless:** `netlify/functions/api.mjs` (Netlify Functions v2, rota `/api`, runtime Node 22 via `esbuild`).
  - Persistência: `@netlify/blobs` (store `feirinha` em produção; `feirinha-<contexto>` em previews/branches, `consistency: "strong"`).
  - Autenticação: `Netlify.env.get("SENHA")` com `timingSafeEqual`; retorna `503` se `SENHA` não estiver configurada.
- **Configuração Netlify:** `netlify.toml` (`publish = "public"`, `functions.directory = "netlify/functions"`, `node_bundler = "esbuild"`, `NODE_VERSION = "22"`, headers de segurança/cache).
- **Dependências:** `package.json` (`@netlify/blobs ^8.0.0`, `engines.node >= 20`).
- **Segurança:** `.gitignore` bloqueia `.env*` (exceto `.env.example`), `node_modules/`, `.netlify/` e chaves privadas; `.env.example` contém apenas `SENHA=`.

## Infraestrutura e Deploy
- **GitHub:** `https://github.com/allexavelardev/feirinha-netlify` (branch `main`).
- **Netlify:** projeto `feirinha-netlify` (`siteId: bbf565a2-1f9e-41b8-8315-ebe5e566b4fc`), URL `https://feirinha-netlify.netlify.app`.
- **Variável obrigatória no Netlify:** `SENHA` (escopo `Functions`, marcada como secreta).
