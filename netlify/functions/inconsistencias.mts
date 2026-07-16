import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

interface InconsistenciaRecord {
  id: string;
  data: string; // YYYY-MM-DD
  analista: string;
  naoConformidadeCriada: string; // "Sim" | "Nao"
  setorCausador: string;
  oQueCausou: string;
  descricao: string;
  atendimentoResolveu: string; // "Sim" | "Nao"
  criadoEm: string;
}

function getBlobStore() {
  return getStore("inconsistencias");
}

export default async (req: Request, context: Context) => {
  const store = getBlobStore();

  if (req.method === "GET") {
    const records = (await store.get("records", { type: "json" })) as InconsistenciaRecord[] | null;
    return new Response(JSON.stringify(records || []), {
      headers: { "content-type": "application/json" },
    });
  }

  if (req.method === "POST") {
    const body = await req.json();

    const required = ["data", "analista", "naoConformidadeCriada", "setorCausador", "oQueCausou", "descricao", "atendimentoResolveu"];
    for (const field of required) {
      if (!body[field] || String(body[field]).trim() === "") {
        return new Response(JSON.stringify({ error: `Campo obrigatorio ausente: ${field}` }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
    }

    const existing = ((await store.get("records", { type: "json" })) as InconsistenciaRecord[] | null) || [];

    const record: InconsistenciaRecord = {
      id: crypto.randomUUID(),
      data: String(body.data),
      analista: String(body.analista),
      naoConformidadeCriada: String(body.naoConformidadeCriada),
      setorCausador: String(body.setorCausador),
      oQueCausou: String(body.oQueCausou),
      descricao: String(body.descricao),
      atendimentoResolveu: String(body.atendimentoResolveu),
      criadoEm: new Date().toISOString(),
    };

    existing.push(record);
    await store.setJSON("records", existing);

    return new Response(JSON.stringify(record), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(JSON.stringify({ error: "id obrigatorio" }), { status: 400 });
    }
    const existing = ((await store.get("records", { type: "json" })) as InconsistenciaRecord[] | null) || [];
    const filtered = existing.filter((r) => r.id !== id);
    await store.setJSON("records", filtered);
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/inconsistencias",
};
