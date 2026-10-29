const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function isolatedParser(text, resolvedDevice = null) {
  const routes = new Map();
  const sent = [];
  const writes = new Map();
  const app = {use(){}, get(route, fn){routes.set(route,fn);}, post(route, fn){routes.set(route,fn);}, listen(){}};
  const express = Object.assign(() => app, {json:()=>()=>{}});
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'ai.cjs'),'utf8'), {
    __dirname, process:{env:{HA_TOKEN:'test'},exit(){throw new Error('unexpected exit');}}, console:{log(){},error(){}},
    setTimeout,
    require(name) {
      if(name==='dotenv') return {config(){}};
      if(name==='express') return express;
      if(name==='path') return path;
      if(name==='fs') return {readFileSync:()=> '[]',writeFileSync:(file,value)=>writes.set(file,value)};
      if(name==='./ai_provider.cjs') return {
        getAIConfig:()=>({provider:'gemini',fallbackProvider:'typhoon',apiKey:'test',model:'gemini-2.5-flash',priceInput:0.15,priceOutput:0.6}),
        generateText:async()=>({text,provider:'typhoon',model:'test-typhoon',fallbackFrom:'gemini',priceInput:null,priceOutput:null,inputTokens:4,outputTokens:5,totalTokens:9}),
      };
      if(name==='./ai_fallback.cjs') return {
        normalize:value=>value, resolveDevice:()=>resolvedDevice,
        sendToHA:async command=>sent.push(command),
        handleRules:(_t,_m,_d,res)=>res.json({fallback:true}),
        LIGHT_MODES:{}, MODE_TH:{}, luxToBrightness:value=>value,
      };
      throw new Error('Unexpected import '+name);
    },
  });
  return {routes,sent,writes};
}

test('normalized Typhoon response reaches the existing command route and records unknown cost',async()=>{
  const {routes,sent,writes}=isolatedParser('{"intent":"turn_on","entity_id":"switch.test","speech":"เปิดแล้วค่ะ"}');
  let response;
  await routes.get('/parse')({body:{message:'เปิดไฟ',devices:[{id:'switch.test',name:'ไฟห้องนอน'}]}},{json:value=>response=value});
  assert.equal(response.commands[0].entity_id,'switch.test');
  assert.equal(response.speech,'เปิดแล้วค่ะ');
  assert.equal(sent.length,1);
  const costs=JSON.parse(writes.get(path.join(__dirname,'ai_cost_log.json')));
  assert.equal(costs[0].provider,'typhoon');
  assert.equal(costs[0].cost_usd,null);
  assert.equal(costs[0].price_input,null);
  assert.equal(costs[0].fallback_from,'gemini');
});

test('malformed AI text falls back without executing a device',async()=>{
  const {routes,sent}=isolatedParser('not JSON');
  let response;
  await routes.get('/parse')({body:{message:'test',devices:[]}},{json:value=>response=value});
  assert.equal(response.fallback,true);
  assert.equal(sent.length,0);
});

test('a direct Thai on or off command skips the AI provider and reaches Home Assistant',async()=>{
  const device={id:'switch.bedroom',name:'ไฟห้องนอน'};
  const {routes,sent,writes}=isolatedParser('this must not be used',device);
  let response;
  await routes.get('/parse')({body:{message:'เปิดไฟห้องนอน',devices:[device]}},{json:value=>response=value});
  assert.equal(response.commands.length,1);
  assert.equal(response.commands[0].action,'on');
  assert.equal(response.commands[0].entity_id,'switch.bedroom');
  assert.equal(response.commands[0].delay,0);
  assert.equal(sent.length,1);
  assert.equal(writes.has(path.join(__dirname,'ai_cost_log.json')),false);
});
