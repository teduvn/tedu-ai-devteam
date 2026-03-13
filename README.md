# TEDU AI Dev Team 🤖

An AI-powered development team that automates the Software Development Life Cycle (SDLC) — from reading a Jira ticket all the way to merging a tested, human-approved Pull Request and deploying to production.

## Tổng quan kiến trúc

```
Jira Ticket
    │
    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│  BA Agent   │───▶  │  PM Agent   │───▶  │ Coder Agent │───▶  │  DevOps Agent    │
│             │      │             │      │             │      │  (staging deploy) │
│ - Quét To Do│      │ - Đọc Jira  │      │ - Viết code │      │ - Tạo branch     │
│ - Viết story│      │ - Lập kế    │      │ - Review    │      │ - Commit & PR    │
│ - Ready Dev │      │   hoạch     │      │   code      │      │ - Deploy staging │
└─────────────┘      └─────────────┘      └─────────────┘      └──────────────────┘
                                                    │
                        ┌───────────────────────────┘
                        ▼
              ┌──────────────────┐
              │  Tester Agent    │
              │                  │
              │ - Chạy test suite│
              │ - Check endpoints│
              │ - Pass / Fail    │
              └──────────────────┘
                        │
           ┌────────────┴────────────┐
           │ Fail                    │ Pass
           ▼                         ▼
     Coder Agent             ┌───────────────┐
     (rework)                │ Human Review  │
                             │               │
                             │ Approve →     │
                             │ Production 🚀 │
                             └───────────────┘
                                     │
                                     ▼
                          ┌──────────────────┐
                          │  DevOps Agent    │
                          │ (production)     │
                          │ - Merge PR       │
                          │ - Jira → Done    │
                          └──────────────────┘
```

### Các thành phần chính

| Thành phần | Công nghệ | Mô tả |
|---|---|---|
| **BA Agent** | LangGraph Node + Jira MCP | Quét ticket `To Do`, sinh User Story tiếng Việt, cập nhật description và chuyển `Ready for Dev` |
| **Orchestration** | LangGraph.js | Điều phối luồng giữa các agent |
| **LLM** | Claude Sonnet / OpenAI (configurable) | Não xử lý của từng agent |
| **MCP Servers** | Model Context Protocol | "Tay" của agent — gọi Jira, GitHub, Filesystem |
| **Dashboard** | Next.js 15 + React 19 | Giao diện theo dõi realtime qua SSE |
| **Styling** | Tailwind CSS | Dark GitHub-style theme |
| **Validation** | Zod | Schema cho env vars và MCP tools |

### Jira Ticket Statuses

`To Do` → `Ready for Dev` → `In Progress` → `Ready for Testing` → `Testing` → `Ready for Release` → `Done`

(hoặc `Canceled` nếu bị từ chối)

---

## Yêu cầu hệ thống

- **Node.js** >= 22
- **pnpm** >= 10 (`npm install -g pnpm`)
- Tài khoản **Anthropic** (Claude API key) hoặc **DeepSeek** (API key)
- Tài khoản **Jira Cloud** với API token
- Tài khoản **GitHub** với Personal Access Token (scopes: `repo`, `workflow`)

---

## Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/<your-org>/tedu-ai-devteam.git
cd tedu-ai-devteam
```

### 2. Cài đặt dependencies

```bash
pnpm install
```

### 3. Cấu hình biến môi trường

Mac/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Mở `.env` và điền thông tin:

```env
# LLM Provider
LLM_PROVIDER=anthropic
# LLM_MODEL=claude-sonnet-4-5

# Anthropic (bắt buộc khi LLM_PROVIDER=anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# DeepSeek (bắt buộc khi LLM_PROVIDER=deepseek)
DEEPSEEK_API_KEY=sk-your_deepseek_key_here

# Jira
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=TEDU

# GitHub
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=your_github_username_or_org
GITHUB_REPO=your_repository_name
GITHUB_BASE_BRANCH=main

# Filesystem
WORKSPACE_DIR=/tmp/tedu-workspace

# App
NODE_ENV=development
PORT=3000
```

Ghi chú nhanh:
- `LLM_PROVIDER` hỗ trợ: `anthropic` (mặc định) hoặc `deepseek`.
- `LLM_MODEL` là tùy chọn để override model mặc định theo provider.
- Trên Windows, nên đổi `WORKSPACE_DIR` sang đường dẫn local, ví dụ: `C:/SourceCodes/tedu-workspace`.

> **Lấy Jira API Token:** https://id.atlassian.com/manage-profile/security/api-tokens  
> **Lấy GitHub PAT:** Settings → Developer settings → Personal access tokens → Tokens (classic)

---

## Chạy dự án

### Development (khuyến nghị)

Mở **2 terminal** chạy song song:

**Terminal 1 — Next.js Dashboard (chạy từ root):**
```bash
pnpm dev
```
Truy cập: http://localhost:3000

**Terminal 2 — Agent package (chạy từ root):**
```bash
pnpm agent:start
```

Ghi chú:
- `pnpm dev` map tới script root: `pnpm --filter @tedu/web dev`
- `pnpm agent:start` map tới script root: `pnpm --filter @tedu/agents dev`

### Build production

```bash
pnpm build
```

---

## Sử dụng Dashboard

1. Mở http://localhost:3000
2. Nhập **Jira Ticket ID** (ví dụ: `TEDU-42`) vào ô input
3. Nhấn **Run Agent**
4. Theo dõi trạng thái realtime:
   - 📋 **Development Plan** — kế hoạch từ PM Agent
   - 💻 **Code Changes** — danh sách file được thay đổi
   - ✅/❌ **Test Results** — kết quả từ Tester Agent (coverage, failed tests, staging URL)
   - ⏸ **Approve Production Deploy** — panel xuất hiện khi test pass, chờ phê duyệt

5. Sau khi review, nhấn:
   - **✅ Approve & Deploy to Production** — merge PR, deploy production, đóng ticket
   - **❌ Reject (Rework)** — trả về Coder Agent để sửa

---

## Cấu trúc thư mục

```
tedu-ai-devteam/
├── apps/
│   └── web/                        # Next.js 15 Dashboard
│       └── src/
│           ├── app/
│           │   ├── api/agent/      # SSE streaming endpoint
│           │   │   ├── route.ts
│           │   │   └── resume/route.ts
│           │   ├── layout.tsx
│           │   └── page.tsx
│           ├── components/
│           │   ├── AgentDashboard.tsx
│           │   ├── StatusBadge.tsx
│           │   └── LogStream.tsx
│           └── lib/
│               └── useAgentStream.ts
│
├── packages/
│   ├── agents/                     # LangGraph orchestration
│   │   └── src/
│   │       ├── graph.ts            # StateGraph definition
│   │       ├── state.ts            # AgentState + types
│   │       ├── env.ts              # Zod-validated env vars
│   │       ├── index.ts            # Public exports
│   │       ├── nodes/
│   │       │   ├── ba-agent.ts     # Business Analyst Agent
│   │       │   ├── pm-agent.ts     # Product Manager Agent
│   │       │   ├── coder-agent.ts  # Coder Agent
│   │       │   ├── devops-agent.ts # DevOps Agent (staging + production)
│   │       │   ├── tester-agent.ts # Tester Agent (QA)
│   │       │   └── human-review.ts # Human-in-the-loop interrupt
│   │       ├── edges/
│   │       │   └── routing.ts      # Conditional routing functions
│   │       └── tools/
│   │           ├── mcp-client.ts   # MCP client factory
│   │           └── invoke-with-tools.ts # ReAct loop helper
│   │
│   └── mcp-servers/                # MCP tool servers
│       └── src/
│           ├── jira-server.ts      # Jira API tools
│           ├── github-server.ts    # GitHub API tools
│           └── filesystem-server.ts # Local filesystem tools
│
├── .env.example
├── .gitignore
├── agent-statuses/                # Runtime status JSON (local only, đã ignore)
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

---

## MCP Servers — Danh sách tools

### Jira Server (`jira-server.ts`)
| Tool | Mô tả |
|---|---|
| `get_ticket_details` | Lấy thông tin chi tiết ticket |
| `update_ticket_status` | Chuyển trạng thái ticket (transition) |
| `add_comment` | Thêm comment vào ticket |

### GitHub Server (`github-server.ts`)
| Tool | Mô tả |
|---|---|
| `create_branch` | Tạo branch mới từ base |
| `commit_files` | Commit nhiều file cùng lúc |
| `create_pull_request` | Tạo PR với title/body |
| `deploy_to_staging` | Trigger workflow deploy staging |
| `run_tests` | Trigger test pipeline |
| `check_endpoints` | Smoke test HTTP endpoints |
| `merge_pull_request` | Merge PR đã được approve |

### Filesystem Server (`filesystem-server.ts`)
| Tool | Mô tả |
|---|---|
| `read_file` | Đọc file (có path-traversal guard) |
| `write_file` | Ghi/tạo file |
| `list_directory` | Liệt kê thư mục |
| `delete_file` | Xoá file |

---

## Tech Stack

- **Runtime:** Node.js 22+ (ESM only)
- **Language:** TypeScript 5 (strict mode)
- **Orchestration:** `@langchain/langgraph` ^1.2
- **LLM Client:** `@langchain/anthropic` (Claude Sonnet 4.5)
- **MCP SDK:** `@modelcontextprotocol/sdk` ^1.27
- **Validation:** `zod` ^4
- **Frontend:** Next.js 15, React 19, Tailwind CSS 3, Shadcn UI
- **Package Manager:** pnpm 10 (monorepo)

---

## Troubleshooting

**File trong `agent-statuses/` vẫn hiện ở Git sau khi thêm `.gitignore`**  
→ Chạy `git rm -r --cached agent-statuses/` một lần để untrack các file đã lỡ track trước đó.

**`Cannot find module '@tedu/agents'`**  
→ Chạy `pnpm install` từ root để link workspace packages.

**`JIRA_BASE_URL is required`**  
→ File `.env` chưa được tạo hoặc thiếu biến. Kiểm tra lại `.env.example`.

**Agent dừng ở `awaiting_approval` không tải SSE**  
→ Trình duyệt có thể đã đóng EventSource. Reload trang và nhập lại ticket ID — workflow sẽ resume từ checkpoint.

**TypeScript errors sau khi pull code mới**  
```bash
pnpm install
cd packages/agents && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

---

## License

MIT © TEDU
