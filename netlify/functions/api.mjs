import { timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

const json = (status, body) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function getExpectedPassword() {
  if (typeof Netlify !== "undefined" && Netlify?.env?.get) {
    return Netlify.env.get("SENHA") || "";
  }
  return process.env.SENHA || "";
}

function isAuthorized(provided, expected) {
  const a = Buffer.from(String(provided || ""), "utf8");
  const b = Buffer.from(String(expected || ""), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function getStoreName(context) {
  const deployContext = context?.deploy?.context || "production";
  if (deployContext === "production") return "feirinha";
  return `feirinha-${String(deployContext).replace(/[^a-zA-Z0-9_-]/g, "-")}`.slice(0, 64);
}

export default async (req, context) => {
  const expectedPassword = getExpectedPassword();
  if (!expectedPassword) {
    return json(503, { erro: "Variável de ambiente SENHA não configurada no Netlify." });
  }

  const providedPassword = req.headers.get("x-senha") || "";
  if (!isAuthorized(providedPassword, expectedPassword)) {
    return json(401, { erro: "Senha incorreta" });
  }

  const store = getStore({ name: getStoreName(context), consistency: "strong" });

  let dados;
  try {
    dados = (await store.get("dados", { type: "json" })) || { pedidos: [], cardapio: [] };
  } catch (err) {
    console.error("Erro ao ler Netlify Blobs:", err);
    return json(500, { erro: "Falha ao acessar armazenamento (Netlify Blobs)." });
  }

  if (req.method === "GET") return json(200, dados);
  if (req.method !== "POST") return json(405, { erro: "Método não permitido" });

  let b;
  try {
    b = await req.json();
  } catch {
    return json(400, { erro: "Corpo da requisição JSON inválido" });
  }
  if (!b || typeof b !== "object") {
    return json(400, { erro: "Corpo da requisição inválido" });
  }

  switch (b.acao) {
    case "criarPedido": {
      const cliente = String(b.cliente || "").trim().slice(0, 100);
      const rawItens = Array.isArray(b.itens) ? b.itens : [];
      const itens = rawItens
        .map((i) => ({
          nome: String(i?.nome || "").trim().slice(0, 100),
          preco: Number(i?.preco),
          qtd: Math.max(1, parseInt(i?.qtd, 10) || 1),
        }))
        .filter((i) => i.nome && Number.isFinite(i.preco) && i.preco >= 0);

      if (!cliente || !itens.length) {
        return json(400, { erro: "Informe o cliente e ao menos um item válido" });
      }
      const numero = dados.pedidos.reduce((m, p) => Math.max(m, p.numero || 0), 0) + 1;
      dados.pedidos.push({
        id: novoId(),
        numero,
        cliente,
        itens,
        total: itens.reduce((s, i) => s + i.preco * i.qtd, 0),
        obs: String(b.obs || "").trim().slice(0, 300),
        pagamento: String(b.pagamento || "").slice(0, 50),
        status: "Novo",
        criadoEm: new Date().toISOString(),
      });
      break;
    }
    case "avancar": {
      const p = dados.pedidos.find((x) => x.id === b.id);
      if (!p) return json(404, { erro: "Pedido não encontrado" });
      p.status = "Pronto";
      break;
    }
    case "excluirPedido":
      dados.pedidos = dados.pedidos.filter((x) => x.id !== b.id);
      break;
    case "criarProduto": {
      const nome = String(b.nome || "").trim().slice(0, 100);
      const preco = Number(b.preco);
      if (!nome || !Number.isFinite(preco) || preco < 0) {
        return json(400, { erro: "Informe um nome e um preço válido" });
      }
      dados.cardapio.push({ id: novoId(), nome, preco });
      break;
    }
    case "editarProduto": {
      const nome = String(b.nome || "").trim().slice(0, 100);
      const preco = Number(b.preco);
      if (!nome || !Number.isFinite(preco) || preco < 0) {
        return json(400, { erro: "Informe um nome e um preço válido" });
      }
      const c = dados.cardapio.find((x) => x.id === b.id);
      if (!c) return json(404, { erro: "Produto não encontrado" });
      c.nome = nome;
      c.preco = preco;
      break;
    }
    case "excluirProduto":
      dados.cardapio = dados.cardapio.filter((x) => x.id !== b.id);
      break;
    default:
      return json(400, { erro: "Ação inválida" });
  }

  try {
    await store.setJSON("dados", dados);
  } catch (err) {
    console.error("Erro ao gravar no Netlify Blobs:", err);
    return json(500, { erro: "Falha ao salvar dados no Netlify Blobs." });
  }

  return json(200, dados);
};

export const config = {
  path: "/api",
};
