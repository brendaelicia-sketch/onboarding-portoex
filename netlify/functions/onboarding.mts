import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

interface OnboardingRecord {
  id: string;
  data: string; // YYYY-MM-DD
  responsavel: string;
  empresa: string;
  classificacao: string;
  comQuemFalou: string;
  telefone: string;
  departamento: string;
  relacionamento: string;
  notaLigacao: string;
  resumo: string;
  criadoEm: string;
}

function getBlobStore() {
  return getStore("onboarding");
}

export default async (req: Request, context: Context) => {
  const store = getBlobStore();

  if (req.method === "GET") {
    const records = (await store.get("records", { type: "json" })) as OnboardingRecord[] | null;
    return new Response(JSON.stringify(records || []), {
      headers: { "content-type": "application/json" },
    });
  }

  if (req.method === "POST") {
    const body = await req.json();

    const required = ["data", "responsavel", "empresa", "classificacao", "comQuemFalou", "departamento", "notaLigacao", "resumo"];
    for (const field of required) {
      if (!body[field] || String(body[field]).trim() === "") {
        return new Response(JSON.stringify({ error: `Campo obrigatorio ausente: ${field}` }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
    }

    if (String(body.resumo).trim().length < 250) {
      return new Response(JSON.stringify({ error: "O resumo da conversa precisa ter no minimo 250 caracteres." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const existing = ((await store.get("records", { type: "json" })) as OnboardingRecord[] | null) || [];

    const record: OnboardingRecord = {
      id: crypto.randomUUID(),
      data: String(body.data),
      responsavel: String(body.responsavel),
      empresa: String(body.empresa),
      classificacao: String(body.classificacao),
      comQuemFalou: String(body.comQuemFalou),
      telefone: String(body.telefone || ""),
      departamento: String(body.departamento),
      relacionamento: String(body.relacionamento || ""),
      notaLigacao: String(body.notaLigacao),
      resumo: String(body.resumo),
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
    const existing = ((await store.get("records", { type: "json" })) as OnboardingRecord[] | null) || [];
    const filtered = existing.filter((r) => r.id !== id);
    await store.setJSON("records", filtered);
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/onboarding",
};
