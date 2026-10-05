// Cloudflare Pages Function: 职教专家群聊台 后端（调度器路由 + 通义千问流式）
export async function onRequest(req, env) {
  if (req.method === 'OPTIONS') return new Response(null, {
    status: 204,
    headers: corsHeaders(env)
  });
  if (req.method !== 'POST') return json({ ok:false, error:'method' }, env);
  let body;
  try { body = await req.json(); } catch (e) {
    return json({ ok:false, error:'bad-json' }, env);
  }
  const message = String(body.message || '');
  const target = body.target || '__route__';
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  if (!message) return json({ ok:false, error:'empty' }, env);

  const key = env.DASHSCOPE_API_KEY;
  if (!key) return json({ ok:false, error:'missing DASHSCOPE_API_KEY env' }, env);

  // 角色配置静态读取
  let chars = [];
  try {
    const cr = await fetch(new URL('/characters.json', req.url));
    chars = await cr.json();
  } catch (e) { chars = []; }
  const chars2 = (chars && chars.llm_characters) ? chars.llm_characters : [];

  // 路由模式：只返回 target
  if (target === '__route__') {
    const ids = chars2.filter(c => c.id !== 'scheduler').map(c => c.id + ': ' + (c.name||'') + ' tags=' + (c.tags||[]).join('/'));
    const sys = '你是调度器。用户问题："' + message + '"。可选专家：\n' + ids.join('\n') +
      '\n只输出最匹配的一个专家 id（纯 id，无解释）。默认输出 lead。';
    let out = await qwen(key, 'qwen-turbo', [
      { role:'system', content: sys },
      { role:'user', content: message }
    ]);
    out = out.trim();
    const valid = chars2.find(c => c.id === out);
    return sse({ target: valid ? out : 'lead' });
  }

  // 正常回答模式
  const c = chars2.find(x => x.id === target) || chars2.find(x => x.id === 'lead');
  const model = c.model || 'qwen-plus';
  const sys = (c.custom_prompt || c.name) + '\n你是职教办学专家团「' + (c.name||'') + '」。回答要专业、可落地、紧扣教育部职成〔2026〕1号口径。';
  const msgs = [{ role:'system', content: sys }];
  for (const h of history) msgs.push({ role: h.role, content: h.content });
  msgs.push({ role:'user', content: message });

  // 流式输出
  const res = new Response(new ReadableStream({
    async start(controller) {
      const send = (o) => controller.enqueue('data: ' + JSON.stringify(o) + '\n');
      try {
        send({ target: c.id });
        const text = await qwen(key, model, msgs);
        // 分块发送（逐字流式近似）
        for (let i = 0; i < text.length; i += 24) send({ delta: text.slice(i, i+24) });
        send({ delta: '' });
        controller.enqueue('data: __END__\n');
      } catch (e) {
        send({ error: String(e.message || e) });
      } finally {
        controller.close();
      }
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      ...corsHeaders(env)
    }
  });
  return res;
}

async function qwen(apiKey, model, msgs) {
  const r = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({ model, messages: msgs, temperature: 0.7, max_tokens: 1024 })
  });
  if (!r.ok) {
    const t = await r.text().catch(()=>'');
    throw new Error('dashscope ' + r.status + ' ' + t.slice(0,160));
  }
  const d = await r.json();
  const ch = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
  return ch;
}

function sse(payload) {
  return new Response('data: ' + JSON.stringify(payload) + '\ndata: __END__\n', {
    status:200, headers:{ 'Content-Type':'text/event-stream', ...corsHeaders() }
  });
}
function json(obj, env) {
  return new Response(JSON.stringify(obj), { status:200, headers:{ 'Content-Type':'application/json', ...corsHeaders(env) } });
}
function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
