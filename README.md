# 职教办学专家群聊台（一人 OPC 路演 demo）

把职教办学专家团 9 成员（总策划 + 8 专家）改写成「多 AI 角色群聊」形态：
- 你提问 → **调度器**（qwen-turbo）自动路由到最合适的专家 → 该专家（qwen-plus/max）流式回答。
- 也可 `@姓名` 指定某位专家单独回答。

## 架构（一人可运维）
- 纯静态前端（index.html，原生 JS 无构建）+ Cloudflare Pages Functions（functions/chat.js）。
- 后端无 Go/Redis/MySQL，单文件，依赖只有通义千问 API Key。
- 免费额度：Cloudflare Pages 每月 10 万次请求免费；通义千问新用户有免费 tokens。

## 目录
```
index.html          前端单文件（群聊 UI + 调度 + 流式）
assets/characters.json   9 成员角色卡（五字段：id/name/model/custom_prompt/tags）
functions/chat.js   Cloudflare Pages Function（调度器 + 通义千问）
wrangler.toml       部署配置
.env.example        key 模板
```

## 本地预览（可选）
1. `npm i -D wrangler`
2. `wrangler pages dev . --port 8788`（带 env：`DASHSCOPE_API_KEY=... npx wrangler pages dev .`）

## 上线（一键，免装服务器）
1. 用 GitHub 托管本目录，在 Cloudflare 控制台 Pages 关联仓库，build 命令留空。
2. 控制台 Pages -> Settings -> Environment variables 配置 `DASHSCOPE_API_KEY`（通义千问百炼申请）。
3. 部署完成即得 https://<project>.pages.dev，群里 9 专家同屏在线。

## 收费化（可选，后续）
- 现无多租户/计费。要收费可嫁接已有 ecom-payskill-backend 402 后端做 A2M 按量付费门禁。
