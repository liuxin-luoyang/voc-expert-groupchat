export async function onRequest(req, env) {
  let body; try{ body=await req.json(); }catch(e){ return json({ok:false,error:'bad-json'}); }
  const message=String(body.message||''); const target=body.target||'__route__';
  if(target==='__route__'){
    // 模拟调度器：含"实训基地"→geng-jilian，含"专业群"→zhen-yexin，否则 lead
    let t='lead';
    if(/实训基地|实训|虚拟仿真/.test(message)) t='geng-jilian';
    else if(/专业群|专业设置|红黄牌/.test(message)) t='zhen-yexin';
    else if(/课程|能力图谱/.test(message)) t='ke-pucheng';
    return new Response('data: '+JSON.stringify({target:t})+'\ndata: __END__\n',
      {status:200,headers:{'Content-Type':'text/event-stream','Access-Control-Allow-Origin':'*'}});
  }
  const c=CHARS.find(x=>x.id===target)||CHARS.find(x=>x.id==='lead');
  const reply='（stub）我是「'+c.name+'」，正在按你「'+message+'」的需求给出方案：先诊断现状→再定指标→最后落到可执行动作。';
  const stream=new ReadableStream({start(ctrl){
    const send=o=>ctrl.enqueue('data: '+JSON.stringify(o)+'\n');
    send({target:c.id});
    for(let i=0;i<reply.length;i+=12) send({delta:reply.slice(i,i+12)});
    ctrl.enqueue('data: __END__\n'); ctrl.close();
  }});
  return new Response(stream,{status:200,headers:{'Content-Type':'text/event-stream','Access-Control-Allow-Origin':'*'}});
}
const CHARS=[
 {id:'lead',name:'陶成蹊·总策划',model:'qwen-max',tags:['总策划']},
 {id:'zhen-yexin',name:'甄业新·专业群建设',model:'qwen-plus',tags:['专业群']},
 {id:'ke-pucheng',name:'柯谱成·课程体系',model:'qwen-plus',tags:['课程体系']},
 {id:'geng-jilian',name:'耿基联·实训基地',model:'qwen-plus',tags:['实训基地']}
];
function json(o){return new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});}
