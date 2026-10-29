const { test } = require("node:test");
const assert = require("node:assert/strict");
const { getAIConfig, generateText } = require("./ai_provider.cjs");

test('Gemini quota or overload switches to Typhoon with the same prompt', async () => {
  for (const status of [429,503]) {
    const calls=[];
    const result=await generateText('เปิดไฟ', {env:{AI_PROVIDER:'gemini',AI_FALLBACK_PROVIDER:'typhoon',GEMINI_API_KEY:'primary',TYPHOON_API_KEY:'backup'},
      http:{post:async(url,body,options)=>{
        calls.push(url);
        if(url.includes('googleapis')) throw Object.assign(new Error('limited'),{response:{status}});
        assert.equal(body.messages[0].content,'เปิดไฟ');
        assert.equal(options.headers.Authorization,'Bearer backup');
        return {data:{choices:[{message:{content:'OK'}}]}};
      }}});
    assert.equal(calls.length,2);
    assert.equal(result.provider,'typhoon');
    assert.equal(result.fallbackFrom,'gemini');
    assert.equal(result.priceInput,null);
  }
});

test('healthy Gemini does not call the backup, even when configured',async()=>{
  let calls=0;
  const result=await generateText('test',{env:{GEMINI_API_KEY:'primary',AI_FALLBACK_PROVIDER:'typhoon',TYPHOON_API_KEY:'backup'},
    http:{post:async url=>{calls++;assert.ok(url.includes('googleapis'));return {data:{candidates:[{content:{parts:[{text:'OK'}]}}]}};}}});
  assert.equal(calls,1);
  assert.equal(result.provider,'gemini');
});

test('authentication errors and absent backup keys do not create extra requests',async()=>{
  for(const [status,backup] of [[401,'backup'],[403,'backup'],[400,'backup'],[429,'']]) {
    let calls=0;
    const error=Object.assign(new Error('failure'),{response:{status}});
    await assert.rejects(generateText('test',{env:{GEMINI_API_KEY:'primary',AI_FALLBACK_PROVIDER:'typhoon',TYPHOON_API_KEY:backup},
      http:{post:async()=>{calls++;throw error;}}}),e=>e===error);
    assert.equal(calls,1);
  }
});

test('a failed backup is returned to the existing rule-fallback path without recursion',async()=>{
  let calls=0;
  await assert.rejects(generateText('test',{env:{GEMINI_API_KEY:'primary',AI_FALLBACK_PROVIDER:'typhoon',TYPHOON_API_KEY:'backup'},
    http:{post:async()=>{calls++;throw Object.assign(new Error('limited'),{response:{status:429}});}}}),/limited/);
  assert.equal(calls,2);
});

test("Typhoon sends Thai prompts with Bearer auth and normalizes its response", async () => {
  let captured;
  const result = await generateText('เปิดไฟห้องนอน', {
    env: { AI_PROVIDER: 'typhoon', TYPHOON_API_KEY: 'test-key' },
    http: { post: async (...args) => {
      captured = args;
      return { data: { choices: [{ message: { content: '{"intent":"turn_on"}' } }], usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 } } };
    } },
  });
  assert.equal(captured[0], 'https://api.opentyphoon.ai/v1/chat/completions');
  assert.equal(captured[1].messages[0].content, 'เปิดไฟห้องนอน');
  assert.equal(captured[1].model, 'typhoon-v2.5-30b-a3b-instruct');
  assert.equal(captured[1].stream, false);
  assert.equal(captured[2].headers.Authorization, 'Bearer test-key');
  assert.equal(captured[2].timeout, 20000);
  assert.equal(result.text, '{"intent":"turn_on"}');
  assert.equal(result.totalTokens, 30);
  assert.equal(result.priceInput, null);
  assert.equal(result.priceOutput, null);
});

test("Gemini remains the default and still normalizes text and usage", async () => {
  const result = await generateText('test', {
    env: { GEMINI_API_KEY: 'test-gemini' },
    http: { post: async (url, body, options) => {
      assert.ok(!url.includes('test-gemini'));
      assert.equal(options.headers['x-goog-api-key'], 'test-gemini');
      assert.equal(body.generationConfig.maxOutputTokens, 500);
      return { data: { candidates: [{ content: { parts: [{text:'hello'}, {text:' world'}] } }], usageMetadata: {promptTokenCount:2,candidatesTokenCount:3} } };
    } },
  });
  assert.equal(result.provider, 'gemini');
  assert.equal(result.text, 'hello world');
  assert.equal(result.totalTokens, 5);
});

test("Typhoon works without a Gemini key and accepts model and price configuration", () => {
  const config = getAIConfig({AI_PROVIDER:'typhoon', TYPHOON_API_KEY:'test', TYPHOON_MODEL:'custom-model', TYPHOON_PRICE_INPUT_PER_M:'0', TYPHOON_PRICE_OUTPUT_PER_M:'1.2'});
  assert.equal(config.model, 'custom-model');
  assert.equal(config.priceInput, 0);
  assert.equal(config.priceOutput, 1.2);
  assert.throws(() => getAIConfig({AI_PROVIDER:'unknown'}), /AI_PROVIDER/);
  assert.throws(() => getAIConfig({AI_PROVIDER:'typhoon',TYPHOON_PRICE_INPUT_PER_M:'oops'}), /prices/);
});

test("missing credentials are rejected before any request", async () => {
  let called = false;
  await assert.rejects(generateText('test', {env:{AI_PROVIDER:'typhoon'}, http:{post:async()=>{called=true;}}}), /TYPHOON_API_KEY/);
  assert.equal(called, false);
});

test("invalid responses fail and HTTP errors retain status for existing retry/fallback", async () => {
  const env = {AI_PROVIDER:'typhoon',TYPHOON_API_KEY:'test'};
  await assert.rejects(generateText('test',{env,http:{post:async()=>({data:{choices:[]}})}}), /no text/);
  const error = Object.assign(new Error('rate limit'),{response:{status:429}});
  await assert.rejects(generateText('test',{env,http:{post:async()=>{throw error;}}}), e=>e===error);
});

test("prediction requests pass their own token limit and temperature", async () => {
  await generateText('predict', {env:{AI_PROVIDER:'typhoon',TYPHOON_API_KEY:'test'},temperature:0.2,maxTokens:100,
    http:{post:async(_,body)=>{assert.equal(body.temperature,0.2);assert.equal(body.max_tokens,100);return {data:{choices:[{message:{content:'NONE'}}]}};}}});
});
