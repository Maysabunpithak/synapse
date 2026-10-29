const axios = require("axios");

function getAIConfig(env = process.env) {
  const provider = (env.AI_PROVIDER || "gemini").trim().toLowerCase();
  if (!["gemini", "typhoon"].includes(provider)) throw new Error("AI_PROVIDER must be gemini or typhoon");
  const fallbackProvider = (env.AI_FALLBACK_PROVIDER || "").trim().toLowerCase();
  if (fallbackProvider && !["gemini", "typhoon"].includes(fallbackProvider))
    throw new Error("AI_FALLBACK_PROVIDER must be gemini or typhoon");
  const typhoon = provider === "typhoon";
  const keyName = typhoon ? "TYPHOON_API_KEY" : "GEMINI_API_KEY";
  const price = (value, fallback) => {
    if (value === undefined || value === "") return fallback;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new Error("AI token prices must be non-negative numbers");
    return number;
  };
  return {
    provider, fallbackProvider: fallbackProvider === provider ? "" : fallbackProvider,
    keyName, apiKey: (env[keyName] || "").trim(),
    model: typhoon ? (env.TYPHOON_MODEL || "typhoon-v2.5-30b-a3b-instruct") : "gemini-2.5-flash",
    // Unknown pricing must not be logged as Gemini pricing or a free request.
    priceInput: typhoon ? price(env.TYPHOON_PRICE_INPUT_PER_M, null) : 0.15,
    priceOutput: typhoon ? price(env.TYPHOON_PRICE_OUTPUT_PER_M, null) : 0.60,
  };
}

async function generateSingle(prompt, { temperature = 0, maxTokens = 500, env = process.env, http = axios } = {}) {
  const config = getAIConfig(env);
  if (!config.apiKey || config.apiKey.startsWith("replace-with-")) throw new Error(`${config.keyName} is not configured`);
  let data;
  if (config.provider === "typhoon") {
    ({ data } = await http.post("https://api.opentyphoon.ai/v1/chat/completions", {
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature, max_tokens: maxTokens, stream: false,
    }, { headers: { Authorization: `Bearer ${config.apiKey}` }, timeout: 20000 }));
  } else {
    ({ data } = await http.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: maxTokens } },
      { headers: { "x-goog-api-key": config.apiKey }, timeout: 20000 },
    ));
  }
  const typhoon = config.provider === "typhoon";
  const text = typhoon ? data?.choices?.[0]?.message?.content
    : data?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("");
  if (typeof text !== "string" || !text.trim()) throw new Error("AI returned no text");
  const usage = (typhoon ? data.usage : data.usageMetadata) || {};
  const inputTokens = Number((typhoon ? usage.prompt_tokens : usage.promptTokenCount) || 0);
  const outputTokens = Number((typhoon ? usage.completion_tokens : usage.candidatesTokenCount) || 0);
  return {
    text: text.trim(), provider: config.provider, model: config.model,
    priceInput: config.priceInput, priceOutput: config.priceOutput,
    inputTokens, outputTokens,
    totalTokens: Number((typhoon ? usage.total_tokens : usage.totalTokenCount) || inputTokens + outputTokens),
  };
}

async function generateText(prompt, options = {}) {
  const env = options.env || process.env;
  const config = getAIConfig(env);
  try {
    return await generateSingle(prompt, options);
  } catch (error) {
    // Quota/rate limits and temporary overload use the backup immediately.
    // Authentication, invalid prompts and malformed responses keep their errors.
    if (!config.fallbackProvider || ![429, 503].includes(error.response?.status)) throw error;
    const backupEnv = { ...env, AI_PROVIDER: config.fallbackProvider, AI_FALLBACK_PROVIDER: "" };
    const backup = getAIConfig(backupEnv);
    if (!backup.apiKey || backup.apiKey.startsWith("replace-with-")) throw error;
    const result = await generateSingle(prompt, { ...options, env: backupEnv });
    return { ...result, fallbackFrom: config.provider };
  }
}

module.exports = { getAIConfig, generateText };
