import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { resolve } from "path";
import { env, MONOREPO_ROOT } from "../env.js";
import { createMCPTools, closeMCPClient } from "../tools/mcp-client.js";
import { invokeWithTools, extractJson } from "../tools/invoke-with-tools.js";
import { createLLM } from "../tools/llm-factory.js";

const SYSTEM_PROMPT = `Bạn là Senior Solution Architect (SA Agent) trong đội AI Dev Team.

## Mục tiêu
Với các ticket Jira có trạng thái "Ready for Dev" và chưa được assign, bạn cần:
1. Phân tích ticket (title + description hiện có).
2. Nghiên cứu cấu trúc codebase từ GitHub bằng các tool có sẵn.
3. Đề xuất thiết kế kỹ thuật chi tiết (technical design solution).
4. Cập nhật vào Jira description.
5. Comment vào Jira xác nhận đã hoàn thành bước Solution Architecture.

## Nguồn dữ liệu cần dùng
- Jira:
  - \`list_ready_for_dev_tickets\`
  - \`get_ticket_details\`
  - \`update_ticket_description\`
  - \`add_comment\`
- GitHub:
  - \`inspect_repository_structure\` để nắm tổng quan cấu trúc mã nguồn
  - \`read_repository_file\` để đọc các file quan trọng liên quan ticket

## Quy tắc xử lý
- Chỉ xử lý ticket thỏa điều kiện: status = "Ready for Dev" và assignee = null.
- Nếu ticket đã có section technical design (ví dụ chứa tiêu đề "## Technical Design Solution" hoặc "## Thiết kế kỹ thuật"), đánh dấu \`status: "skipped"\` và không ghi đè.
- Luôn giữ lại nội dung business/user story hiện có; chỉ enrich thêm phần technical design.
- Nội dung technical design phải cụ thể, bám vào cấu trúc repo thực tế đã đọc từ GitHub tool.
- Không đưa ra giải pháp mơ hồ kiểu "refactor code"; phải nêu rõ module/file hướng tác động.
- Toàn bộ nội dung thêm vào Jira phải bằng tiếng Việt.

## Mẫu section cần thêm vào Jira description
\`\`\`
## Technical Design Solution

### 1) Kiến trúc đề xuất
- [Mô tả approach kỹ thuật]

### 2) Thành phần / module ảnh hưởng
- [Liệt kê file/folder/module liên quan]

### 3) Thiết kế chi tiết
- [Luồng xử lý chính]
- [Hợp đồng dữ liệu / interface quan trọng]
- [Validation / error handling]

### 4) Kế hoạch implement đề xuất
1. [Bước 1]
2. [Bước 2]
3. [Bước 3]

### 5) Rủi ro & điểm cần làm rõ
- [Risk/assumption/open question]
\`\`\`

## Comment Jira sau khi cập nhật description
Dùng \`add_comment\` với format:
"🤖 SA Agent đã hoàn thành Technical Design cho ticket này. Đã cập nhật phần 'Technical Design Solution' trong description để đội Dev có thể bắt đầu implement." 

## Output bắt buộc
Sau khi xử lý xong toàn bộ ticket, chỉ trả về JSON:
\`\`\`json
{
  "processedTickets": [
    {
      "id": "TEDU-XX",
      "summary": "...",
      "technicalDesign": "<tóm tắt 1 dòng>",
      "status": "success"
    }
  ],
  "totalScanned": 0,
  "errors": []
}
\`\`\`

Nếu lỗi từng ticket thì vẫn tiếp tục ticket khác, và ghi:\n- \`status: "error"\`\n- \`error\`: thông điệp lỗi.`;

export async function saNode(
  _state: unknown,
) {
  const { tools: jiraTools, client: jiraClient } = await createMCPTools({
    command: "npx",
    args: [
      "tsx",
      resolve(MONOREPO_ROOT, "packages/mcp-servers/src/jira-server.ts"),
    ],
    env: {
      JIRA_BASE_URL: env.JIRA_BASE_URL,
      JIRA_EMAIL: env.JIRA_EMAIL,
      JIRA_API_TOKEN: env.JIRA_API_TOKEN,
      JIRA_PROJECT_KEY: env.JIRA_PROJECT_KEY,
    },
  });

  const { tools: ghTools, client: ghClient } = await createMCPTools({
    command: "npx",
    args: [
      "tsx",
      resolve(MONOREPO_ROOT, "packages/mcp-servers/src/github-server.ts"),
    ],
    env: {
      GITHUB_TOKEN: env.GITHUB_TOKEN,
      GITHUB_OWNER: env.GITHUB_OWNER,
      GITHUB_REPO: env.GITHUB_REPO,
      GITHUB_BASE_BRANCH: env.GITHUB_BASE_BRANCH,
      WORKSPACE_DIR: env.WORKSPACE_DIR,
    },
  });

  try {
    const llm = createLLM("SA-SCAN");

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(
        "Bắt đầu SA workflow: lấy các ticket Ready for Dev chưa assign, nghiên cứu codebase từ GitHub tools, " +
          "cập nhật technical design solution vào Jira description và comment xác nhận hoàn thành.",
      ),
    ];

    const response = await invokeWithTools(llm, [...jiraTools, ...ghTools], messages);
    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const parsed = extractJson<{
      processedTickets?: Array<{
        id: string;
        summary: string;
        technicalDesign: string;
        status: string;
        error?: string;
      }>;
      totalScanned?: number;
      errors?: string[];
    }>(text);

    const processedTickets = (parsed?.processedTickets ?? []).map((t) => ({
      id: t.id,
      summary: t.summary,
      technicalDesign: t.technicalDesign,
      status:
        t.status === "error"
          ? "error"
          : t.status === "skipped"
            ? "skipped"
            : "success",
      error: t.error,
    }));

    const totalScanned = parsed?.totalScanned ?? processedTickets.length;

    return {
      processedTickets,
      totalScanned,
      messages: [
        new HumanMessage(
          `[SA Agent] Đã quét ${totalScanned} ticket Ready for Dev. ` +
            `${processedTickets.filter((t) => t.status === "success").length} ticket đã được bổ sung technical design.`,
        ),
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: `[SA Agent] Lỗi nghiêm trọng: ${message}`,
      messages: [new HumanMessage(`[SA Agent] Lỗi: ${message}`)],
    };
  } finally {
    await closeMCPClient(jiraClient);
    await closeMCPClient(ghClient);
  }
}
