import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { resolve } from "path";
import { env, MONOREPO_ROOT } from "../env.js";
import { createMCPTools, closeMCPClient } from "../tools/mcp-client.js";
import { invokeWithTools, extractJson } from "../tools/invoke-with-tools.js";
import { createLLM } from "../tools/llm-factory.js";
import type { BAAgentStateType, BAProcessedTicket } from "../ba-graph.js";
import type { AgentStateType } from "../state.js";

// ─── System Prompt ────────────────────────────────────────────────────────────
// Embeds the full "Create User Story" skill template so the LLM can generate
// well-structured Jira stories from just a ticket title/summary.

const SYSTEM_PROMPT = `Bạn là một Business Analyst cấp cao (BA Agent) trong đội phát triển phần mềm được hỗ trợ bởi AI.

## Nhiệm vụ của bạn
Quét tất cả Jira ticket có trạng thái "To Do", tạo User Story hoàn chỉnh cho từng ticket chỉ dựa trên tiêu đề của nó, cập nhật mô tả Jira, sau đó chuyển ticket sang trạng thái "Ready for Dev".

## Hướng dẫn Viết User Story

Một user story tốt phải:
- Được viết từ **góc nhìn của khách hàng/người dùng** (không phải nội bộ hay kỹ thuật)
- Bao gồm **giả thuyết giá trị đo lường được** để có thể ưu tiên câu chuyện
- Để ngỏ không gian cho đội kỹ thuật đề xuất giải pháp — tránh thiết kế kỹ thuật chi tiết
- Sử dụng **ngôn ngữ đơn giản, dễ hiểu** — không dùng thuật ngữ chuyên ngành hay từ viết tắt

## Quy ước Đặt tên Người dùng

Sử dụng các loại người dùng cụ thể, thực tế. Các vai trò phổ biến:
- **Trưởng nhóm Thương mại / Trưởng nhóm Marketing / Trưởng nhóm Kinh doanh** — làm việc tại doanh nghiệp CPG
- **Thu ngân / Quản lý cửa hàng / Nhà bán sỉ** — làm việc trong Bán lẻ / Bán sỉ / Chuỗi cung ứng
- **Người mua sắm siêu thị / Khách ghé café** — người tiêu dùng mua hàng CPG
- Đối với công cụ nội bộ: **Lập trình viên / Product Manager / Kỹ sư QA**

## Mẫu User Story (tạo mẫu này cho mỗi ticket)

\`\`\`
## User Story

Là một [loại người dùng cụ thể] [trong ngữ cảnh/tình huống],
Tôi muốn [thực hiện một hành động nào đó],
để [tôi có thể đạt được mục tiêu hoặc lợi ích cụ thể].

---

## Bối cảnh / Vấn đề

> Mô tả tình trạng hiện tại. Người dùng giải quyết vấn đề này như thế nào ngày nay?
> Những điểm đau, ma sát hoặc khoảng trống nào đang tồn tại?

[Mô tả tình trạng hiện tại ở đây]

---

## Giả thuyết Giá trị

- **Chỉ số chính:** [vd: tỉ lệ chuyển đổi / doanh thu / thời gian tiết kiệm / NPS]
- **Giá trị ước tính:** [vd: +5% chuyển đổi → ~$50K ARR dựa trên X khách hàng đang hoạt động]
- **Phạm vi ảnh hưởng:** [vd: ảnh hưởng ~200 Trade Manager tại thị trường VN]
- **Gắn kết chiến lược:** [vd: OKR: Tăng Người dùng Hoạt động Q2 | North Star: Chiến dịch Hoạt động hàng tháng]

---

## Giải pháp Đề xuất

1. **Lựa chọn A (MVP / Giải pháp nhanh):** [Mô tả ngắn]
2. **Lựa chọn B (Tính năng đầy đủ):** [Mô tả ngắn]

---

## Tiêu chí Chấp nhận

- [ ] [Tiêu chí 1]
- [ ] [Tiêu chí 2]
- [ ] [Tiêu chí 3]
\`\`\`

## Hướng dẫn từng bước

1. Gọi \`list_todo_tickets\` để lấy tất cả ticket TODO.
2. Với MỖI ticket trong kết quả:
   a. Gọi \`get_ticket_details\` để lấy tóm tắt ticket.
   b. Tạo User Story hoàn chỉnh theo mẫu trên, suy luận ngữ cảnh từ tiêu đề ticket.
   c. Gọi \`update_ticket_description\` với nội dung user story markdown đã tạo.
   d. Gọi \`update_ticket_status\` với statusName = "Ready for Dev" để chuyển trạng thái ticket.
3. Sau khi xử lý TẤT CẢ ticket, chỉ phản hồi với một khối JSON:

\`\`\`json
{
  "processedTickets": [
    {
      "id": "TEDU-XX",
      "summary": "<tiêu đề ticket gốc>",
      "userStory": "<dòng đầu tiên của user story đã tạo>",
      "status": "success"
    }
  ],
  "totalScanned": <số lượng>,
  "errors": []
}
\`\`\`

Quy tắc:
- Xử lý mọi ticket TODO — không được bỏ qua bất kỳ ticket nào.
- Nếu một ticket thất bại, ghi lại với "status": "error" và thông báo "error", sau đó tiếp tục xử lý các ticket khác.
- User story phải cụ thể và gắn liền với ngữ cảnh tiêu đề ticket.
- KHÔNG đưa ra giả định về công nghệ trong nội dung câu chuyện.
- Toàn bộ nội dung User Story phải được viết bằng tiếng Việt.`;

// ─── BA Node ──────────────────────────────────────────────────────────────────

export async function baNode(
  state: BAAgentStateType,
): Promise<Partial<BAAgentStateType>> {
  const { tools, client } = await createMCPTools({
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

  try {
    // Use a dummy ticket ID for token tracking — BA is project-wide
    const llm = createLLM("BA-SCAN");

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(
        "Bắt đầu quy trình BA: quét tất cả ticket TODO, tạo user story từ tiêu đề của chúng, " +
          "cập nhật mô tả từng ticket bằng tiếng Việt, và chuyển chúng sang trạng thái 'Ready for Dev'.",
      ),
    ];

    const response = await invokeWithTools(llm, tools, messages);
    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const parsed = extractJson<{
      processedTickets?: Array<{
        id: string;
        summary: string;
        userStory: string;
        status: string;
        error?: string;
      }>;
      totalScanned?: number;
      errors?: string[];
    }>(text);

    const processedTickets: BAProcessedTicket[] = (
      parsed?.processedTickets ?? []
    ).map((t) => ({
      id: t.id,
      summary: t.summary,
      userStory: t.userStory,
      status: (t.status === "error" ? "error" : "success") as
        | "success"
        | "error",
      error: t.error,
    }));

    const totalScanned = parsed?.totalScanned ?? processedTickets.length;

    return {
      processedTickets,
      totalScanned,
      messages: [
        new HumanMessage(
          `[BA Agent] Đã quét ${totalScanned} ticket TODO. ` +
            `${processedTickets.filter((t) => t.status === "success").length} ticket đã được cập nhật và chuyển sang Ready for Dev.`,
        ),
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: `[BA Agent] Lỗi nghiêm trọng: ${message}`,
      messages: [new HumanMessage(`[BA Agent] Lỗi: ${message}`)],
    };
  } finally {
    await closeMCPClient(client);
  }
}

// ─── Single-ticket BA Node (used inside the main SDLC graph) ─────────────────
//
// Fetches the specific ticket's title, generates a full User Story, and
// updates the Jira description — WITHOUT moving the status (PM agent does that).

const SINGLE_TICKET_PROMPT = `Bạn là một Business Analyst cấp cao (BA Agent) trong đội phát triển phần mềm được hỗ trợ bởi AI.

Nhiệm vụ của bạn cho MỘT Jira ticket cụ thể:
1. Gọi \`get_ticket_details\` để lấy tóm tắt/tiêu đề ticket.
2. Tạo User Story hoàn chỉnh theo mẫu dưới đây, suy luận toàn bộ ngữ cảnh từ tiêu đề.
3. Gọi \`update_ticket_description\` với nội dung markdown đã tạo.
4. KHÔNG thay đổi trạng thái ticket — agent khác sẽ xử lý phần đó.

## Hướng dẫn Viết User Story

Một user story tốt phải:
- Được viết từ **góc nhìn của khách hàng/người dùng** (không phải nội bộ hay kỹ thuật)
- Bao gồm **giả thuyết giá trị đo lường được** để có thể ưu tiên câu chuyện
- Để ngỏ không gian cho đội kỹ thuật đề xuất giải pháp — tránh thiết kế kỹ thuật chi tiết
- Sử dụng **ngôn ngữ đơn giản, dễ hiểu** — không dùng thuật ngữ chuyên ngành hay từ viết tắt

## Quy ước Đặt tên Người dùng

Sử dụng các loại người dùng cụ thể, thực tế. Các vai trò phổ biến:
- **Lập trình viên / Product Manager / Kỹ sư QA** — cho công cụ nội bộ/phát triển
- **Trưởng nhóm Thương mại / Trưởng nhóm Marketing / Trưởng nhóm Kinh doanh** — người dùng doanh nghiệp CPG
- **Quản lý cửa hàng / Thu ngân / Nhà bán sỉ** — nhân viên Bán lẻ / Chuỗi cung ứng
- **Người mua sắm siêu thị / Khách ghé café** — người tiêu dùng cuối

## Mẫu User Story

\`\`\`
## User Story

Là một [loại người dùng cụ thể] [trong ngữ cảnh/tình huống],
Tôi muốn [thực hiện một hành động nào đó],
để [tôi có thể đạt được mục tiêu hoặc lợi ích cụ thể].

---

## Bối cảnh / Vấn đề

> Người dùng giải quyết vấn đề này như thế nào ngày nay? Những điểm đau nào đang tồn tại?

[Mô tả tình trạng hiện tại ở đây]

---

## Giả thuyết Giá trị

- **Chỉ số chính:** [vd: tỉ lệ chuyển đổi / thời gian tiết kiệm / NPS]
- **Giá trị ước tính:** [vd: +5% chuyển đổi → ~$50K ARR]
- **Phạm vi ảnh hưởng:** [vd: ảnh hưởng ~200 người dùng]
- **Gắn kết chiến lược:** [vd: OKR: Tăng Người dùng Hoạt động Q2]

---

## Giải pháp Đề xuất

1. **Lựa chọn A (MVP / Giải pháp nhanh):** [Mô tả ngắn]
2. **Lựa chọn B (Tính năng đầy đủ):** [Mô tả ngắn]

---

## Tiêu chí Chấp nhận

- [ ] [Tiêu chí 1]
- [ ] [Tiêu chí 2]
- [ ] [Tiêu chí 3]
\`\`\`

Sau khi cập nhật mô tả, chỉ phản hồi với một khối JSON:
\`\`\`json
{
  "summary": "<tiêu đề ticket>",
  "userStory": "<dòng đầu tiên: Là một ... Tôi muốn ... để ...>"
}
\`\`\`

Lưu ý quan trọng: Toàn bộ nội dung User Story PHẢI được viết bằng tiếng Việt.`;

export async function baSingleNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const { tools, client } = await createMCPTools({
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

  try {
    const llm = createLLM(state.ticketId);

    const messages = [
      new SystemMessage(SINGLE_TICKET_PROMPT),
      new HumanMessage(
        `Jira ticket: "${state.ticketId}". ` +
          `Lấy tiêu đề ticket, tạo user story hoàn chỉnh bằng tiếng Việt, và cập nhật mô tả Jira.`,
      ),
    ];

    const response = await invokeWithTools(llm, tools, messages);
    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const parsed = extractJson<{ summary?: string; userStory?: string }>(text);

    return {
      phase: "analyzing",
      messages: [
        new HumanMessage(
          `[BA Agent] Đã tạo user story cho ${state.ticketId}: "${parsed?.userStory ?? "hoàn thành"}"`,
        ),
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Non-fatal: log and continue to PM agent
    return {
      messages: [new HumanMessage(`[BA Agent] Cảnh báo: ${message}`)],
    };
  } finally {
    await closeMCPClient(client);
  }
}
