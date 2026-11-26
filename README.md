# Feirinha - Pedidos (deploy no Netlify)

## 1. Subir o projeto
Crie um repositório no GitHub com o conteúdo desta pasta (onde ficam `netlify.toml`, `package.json`, `public/` e `netlify/`) e envie os arquivos.

## 2. Publicar no Netlify

### Opção A: Via Git (deploy contínuo)
1. No Netlify: **Add new project > Import an existing project** e escolha o repositório.
2. Build command: deixe vazio. Publish directory: `public`. Functions directory: `netlify/functions`. (O `netlify.toml` já define tudo isso e fixa Node 22 + bundler `esbuild`.)
3. Antes do deploy, em **Project configuration > Environment variables**, crie:
   - `SENHA` = a senha que você quer usar para entrar no painel (marque como **Contains secret values** e mantenha o escopo **Functions** habilitado).
4. Faça o deploy. O Netlify instala `@netlify/blobs` automaticamente.

### Opção B: Via Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set SENHA "sua-senha-aqui" --secret
netlify deploy --prod
```

## 3. Usar
- Abra o link do site. Na primeira vez ele pede a senha e guarda no navegador.
- Os dados ficam salvos no **Netlify Blobs** (store `feirinha` em produção; previews/branches usam stores isolados para não misturar com produção).

## Observações
- O painel atualiza sozinho a cada 5 segundos.
- Se duas pessoas lançarem pedidos exatamente no mesmo instante, um dos dois pode sobrescrever o outro (o Netlify Blobs é armazenamento de objetos/JSON, não um banco transacional; para concorrência alta, recomenda-se migrar para **Netlify DB**).
- Para trocar a senha, altere a variável `SENHA` no Netlify e faça um novo deploy para que a função receba o novo valor.
