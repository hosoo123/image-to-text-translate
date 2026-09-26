import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export type AiProvider = "gemini" | "groq" | "openrouter" | "ollama" | "openai";

type AiImage = {
  base64: string;
  mimeType: string;
};

type GenerateJsonOptions<T> = {
  prompt: string;
  image?: AiImage;
  validate: (value: unknown) => T;
};

const DEFAULT_PROVIDERS: AiProvider[] = ["gemini", "groq", "openrouter"];
const SUPPORTED_PROVIDERS = new Set<AiProvider>([
  "gemini",
  "groq",
  "openrouter",
  "ollama",
  "openai",
]);

function getProviderOrder(): AiProvider[] {
  const configured = process.env.AI_PROVIDERS?.split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
  const providers = configured?.length ? configured : DEFAULT_PROVIDERS;
  const uniqueProviders = [...new Set(providers)];
  const unsupported = uniqueProviders.filter(
    (provider) => !SUPPORTED_PROVIDERS.has(provider as AiProvider),
  );

  if (unsupported.length > 0) {
    throw new Error(
      `AI_PROVIDERS тохиргоонд дэмжигдэхгүй provider байна: ${unsupported.join(", ")}`,
    );
  }

  return uniqueProviders as AiProvider[];
}

function parseJsonOutput(output: string): unknown {
  const cleanedOutput = output
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  return JSON.parse(cleanedOutput);
}

function getModel(provider: AiProvider) {
  switch (provider) {
    case "gemini":
      return process.env.GEMINI_MODEL || "gemini-3.8-flash";
    case "groq":
      return process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
    case "openrouter":
      return process.env.OPENROUTER_MODEL || "qwen/qwen3.8-27b:free";
    case "ollama":
      return process.env.OLLAMA_MODEL || "qwen3-vl:8b";
    case "openai":
      return process.env.OPENAI_MODEL || "gpt-4o-mini";
  }
}

function getApiKey(provider: AiProvider) {
  switch (provider) {
    case "gemini":
      return process.env.GEMINI_API_KEY;
    case "groq":
      return process.env.GROQ_API_KEY;
    case "openrouter":
      return process.env.OPENROUTER_API_KEY;
    case "ollama":
      return process.env.OLLAMA_API_KEY || "ollama";
    case "openai":
      return process.env.OPENAI_API_KEY;
  }
}

function getBaseUrl(provider: AiProvider) {
  switch (provider) {
    case "groq":
      return "https://api.groq.com/openai/v1";
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    case "ollama":
      return process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1/";
    case "openai":
      return undefined;
    case "gemini":
      return undefined;
  }
}

async function requestOpenAiCompatible(
  provider: Exclude<AiProvider, "gemini">,
  prompt: string,
  image?: AiImage,
) {
  const apiKey = getApiKey(provider);

  if (!apiKey) {
    throw new Error(`${provider} API key тохируулаагүй.`);
  }

  const defaultHeaders =
    provider === "openrouter"
      ? {
          "HTTP-Referer":
            process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME || "Manhwa AI Translator",
        }
      : undefined;
  const client = new OpenAI({
    apiKey,
    baseURL: getBaseUrl(provider),
    defaultHeaders,
    timeout: 15_000,
    maxRetries: 0,
  });
  const content = image
    ? [
        { type: "text" as const, text: prompt },
        {
          type: "image_url" as const,
          image_url: {
            url: `data:${image.mimeType};base64,${image.base64}`,
          },
        },
      ]
    : prompt;
  const completion = await client.chat.completions.create({
    model: getModel(provider),
    messages: [{ role: "user", content }],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 6000,
  });
  const output = completion.choices[0]?.message.content;

  if (typeof output !== "string" || !output.trim()) {
    throw new Error(`${provider} хоосон хариу буцаалаа.`);
  }

  return output;
}

async function requestGemini(prompt: string, image?: AiImage) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY тохируулаагүй.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const input = [
    { type: "text" as const, text: prompt },
    ...(image
      ? [
          {
            type: "image" as const,
            data: image.base64,
            mime_type: image.mimeType,
          },
        ]
      : []),
  ];
  const interaction = await ai.interactions.create({
    model: getModel("gemini"),
    input,
  });

  if (!interaction.output_text?.trim()) {
    throw new Error("Gemini хоосон хариу буцаалаа.");
  }

  return interaction.output_text;
}

function getSafeFailureReason(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return `HTTP ${error.status}`;
  }

  return "холболт, тохиргоо эсвэл JSON хариуны алдаа";
}

export async function generateJsonWithFallback<T>(
  options: GenerateJsonOptions<T>,
): Promise<{ provider: AiProvider; result: T }> {
  const failures: string[] = [];

  for (const provider of getProviderOrder()) {
    try {
      const output =
        provider === "gemini"
          ? await requestGemini(options.prompt, options.image)
          : await requestOpenAiCompatible(
              provider,
              options.prompt,
              options.image,
            );
      const result = options.validate(parseJsonOutput(output));

      console.info(`[ai] ${provider} provider амжилттай.`);
      return { provider, result };
    } catch (error) {
      const reason = getSafeFailureReason(error);
      failures.push(`${provider}: ${reason}`);
      console.warn(
        `[ai] ${provider} амжилтгүй (${reason}), дараагийн provider руу шилжинэ.`,
      );
    }
  }

  throw new Error(
    `Бүх AI provider амжилтгүй боллоо (${failures.join("; ")}). AI_PROVIDERS болон provider API key-үүдээ шалгана уу.`,
  );
}
