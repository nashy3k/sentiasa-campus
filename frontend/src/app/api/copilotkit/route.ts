import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

// Next.js on Cloud Run Runtime Config Standard (dynamic = force-dynamic)
export const dynamic = "force-dynamic";

/**
 * HardenedOpenAIAdapter
 * Overrides getLanguageModel() to force standard /v1/chat/completions (via provider.chat())
 * instead of the OpenAI Responses API (/v1/responses).
 * This eliminates the Pydantic schema validation error (body.input.2.id / ResponseOutputText.annotations)
 * encountered when streaming multi-turn agent conversations against Nebius Token Factory or OpenAI-compatible gateways.
 */
class HardenedOpenAIAdapter extends OpenAIAdapter {
  override getLanguageModel() {
    const openai = this.openai;
    const provider = createOpenAI({
      baseURL: openai.baseURL,
      apiKey: openai.apiKey,
      organization: openai.organization ?? undefined,
      project: openai.project ?? undefined,
    });
    return provider.chat(this.model);
  }
}

function getFallbackNebiusKey(): string {
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), ".env.local"),
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "../.env"),
      path.resolve(process.cwd(), "../../.env"),
      path.resolve(process.cwd(), "../backend/.env"),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, "utf8");
        const match = text.match(/NEBIUS_API_KEY=["']?([^"'\r\n]+)/);
        if (match && match[1] && match[1].trim() !== "mock-key") {
          return match[1].trim();
        }
      }
    }
  } catch {
    // ignore
  }
  return "";
}

export const POST = async (req: NextRequest) => {
  const env = process.env;

  // Bracket notation & dual-key resolution protocol with filesystem fallback
  const nebiusApiKey =
    env.NEBIUS_API_KEY ||
    env["NEXT_PUBLIC_NEBIUS_API_KEY"] ||
    getFallbackNebiusKey();

  const isProduction =
    env.NODE_ENV === "production" ||
    Boolean(env.K_SERVICE) ||
    Boolean(env.PORT);

  const defaultBackendUrl = isProduction
    ? "https://api.sentiasasystems.com"
    : "http://127.0.0.1:8000";

  const backendUrl = (
    env.API_URL ||
    env["NEXT_PUBLIC_API_URL"] ||
    defaultBackendUrl
  ).replace(/\/+$/, "");

  let baseURL: string;
  let apiKey: string;
  let model: string;

  if (nebiusApiKey && nebiusApiKey !== "mock-key") {
    // Direct Nebius Token Factory connection (NVIDIA Nemotron on open cloud infrastructure)
    baseURL =
      env.NEBIUS_BASE_URL ||
      env["NEXT_PUBLIC_NEBIUS_BASE_URL"] ||
      "https://api.tokenfactory.nebius.com/v1";
    apiKey = nebiusApiKey;
    model =
      env.NEBIUS_MODEL ||
      env["NEXT_PUBLIC_NEBIUS_MODEL"] ||
      "nvidia/Nemotron-3_5-Lightning";
  } else {
    // Route through backend OpenAI-compatible completions endpoint with internal token
    baseURL = `${backendUrl}/v1`;
    apiKey = "sentiasa-internal-copilot-2026";
    model = "sentiasa-agent";
  }

  const openai = new OpenAI({
    apiKey,
    baseURL,
  });

  const serviceAdapter = new HardenedOpenAIAdapter({
    openai,
    model,
  });

  const runtime = new CopilotRuntime();

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
