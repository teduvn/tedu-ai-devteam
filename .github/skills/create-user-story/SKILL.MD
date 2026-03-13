# Skill: Create Jira User Story Ticket

## Description

This skill guides you to create a well-structured Jira user story ticket following the WeCheer Product Team's User Story Writing guidelines.

A good user story must:
- Be written from the **customer/user perspective** (not from an internal or technical perspective)
- Include a **measurable value hypothesis** so stories can be prioritised
- Leave room for tech teams to suggest solutions — avoid describing detailed technical designs
- Use **plain, simple language** — no jargon or TLAs (Three-Letter-Acronyms)

---

## How to Use This Skill

Provide the following information and the skill will generate a complete Jira ticket draft:

1. **Who is the user?** — Be specific. Include context: role, market, channel, situation.
2. **What do they want to do?** — The Job-to-be-Done (JTBD). Describe the action, not the solution.
3. **Why do they want it?** — The goal or benefit. This is the most critical part.
4. **What is the current state?** — How do users solve this problem today?
5. **What is the measurable impact?** — Choose 1 primary metric: $, %, conversion rate, NPS, time saved…
6. **Which strategic objective / OKR does this map to?**
7. **Solution ideas** — At least 2 high-level options (think MVP / experimental vs full feature).
8. **Acceptance Criteria** (optional) — When is the story "done"?

---

## User Naming Convention

Use specific, real user types. Avoid writing "As a product owner…" unless the story is truly about internal tooling.

**Customer (works at a CPG business)**
- Trade Manager
- Marketing Manager
- Commercial Manager

**Staff Member (works in Retail / Wholesale / Supply Chain)**
- Cashier
- Store Manager
- Wholesaler

**Consumer (buys CPG items in a retail store, bar, café, online…)**
- Supermarket Shopper
- Café Visitor

---

## User Story Template

```
## User Story

As a [specific type of user] [in context/situation],
I want to [perform some action],
so that [I can achieve a specific goal or benefit].

---

## Context / Problem

> Describe the current state. How does the user solve this problem today?
> What pain points, friction, or gaps exist?

[Describe current state here]

---

## Value Hypothesis

> Choose 1 primary impact measure. Estimate a measurable value with rationale.
> Include Reach (how many users affected?) and Impact (what changes for them?).

- **Primary Metric:** [e.g., conversion rate / revenue / time saved / NPS]
- **Estimated Value:** [e.g., +5% conversion → ~$50K ARR based on X active customers]
- **Reach:** [e.g., affects ~200 Trade Managers across MX and BR markets]
- **Strategic Mapping:** [e.g., OKR: Grow Active Users Q2 | North Star: Monthly Active Campaigns]

---

## Possible Solutions

> Provide at least 2 high-level solution ideas.
> Think: simple/MVP option, experimental approach, vs full feature.
> Do NOT write detailed technical designs here — leave room for the team.

1. **Option A (MVP / Quick Win):** [Short description]
2. **Option B (Full Feature):** [Short description]
3. *(Optional)* **Option C (Experimental):** [Short description]

---

## Supporting Materials (Optional but encouraged)

- [ ] Customer flow / user journey diagram
- [ ] UI/UX designs, wireframes, or rough sketches
- [ ] Screenshots or real examples from other products
- [ ] Client examples most affected by this issue
- [ ] Customer verbatims or stories of when things went wrong

---

## Acceptance Criteria (Optional)

> Define the conditions that must be met for this story to be considered complete.

- [ ] Given [context], when [action], then [expected result]
- [ ] ...
```

---

## ✅ Good Practices

- Write from the **user's perspective**, not the team's perspective
- Be specific about **who** (role + market/channel/context)
- Focus on the **"so that"** — the why is the most important part
- Pick **one measurable metric** for the value hypothesis
- Offer **multiple solution options** — let the tech team decide the best approach
- Include **visuals, real examples, and verbatims** wherever possible

## ❌ Common Mistakes to Avoid

- Writing "As a product owner..." for customer-facing stories
- Describing a detailed technical solution (e.g., "implement an API endpoint that...")
- Including too many value measures or overly complex KPI formulas
- Using jargon, acronyms, or internal terminology without explanation
- Leaving the "so that" clause vague or missing entirely

---

## Example

```
## User Story

As a Trade Manager at a CPG company in Mexico,
I want to see a real-time summary of my active campaign performance on a single dashboard,
so that I can quickly decide which campaigns to boost or pause without switching between multiple reports.

---

## Context / Problem

Currently, Trade Managers must export data from 3 separate screens and manually compile 
an Excel report each week. This takes ~3 hours per manager per week and often results in 
delayed decisions. Campaigns sometimes run past their optimal window due to lack of visibility.

---

## Value Hypothesis

- **Primary Metric:** Campaign decision turnaround time
- **Estimated Value:** Reduce weekly reporting effort by ~3 hrs/manager → ~$15K/year saved 
  across 20 active Trade Managers in MX
- **Reach:** ~20 Trade Managers in MX market (expandable to BR: ~35 users)
- **Strategic Mapping:** OKR: Improve Customer Retention Q2 | North Star: Active Monthly Campaigns

---

## Possible Solutions

1. **Option A (MVP):** Add a summary widget to the existing Campaign List page showing 
   top 5 KPIs (impressions, clicks, redemptions, spend, ROI) with a 24h refresh.
2. **Option B (Full Feature):** Build a dedicated Campaign Performance Dashboard with 
   real-time data, filters by date/region/product, and export capability.
3. **Option C (Experimental):** Send an automated daily WhatsApp/email digest summarising 
   the top 3 campaigns by performance for each Trade Manager.

---

## Acceptance Criteria

- [ ] Given I am on the dashboard, when I open it, then I see performance data refreshed within the last 24 hours
- [ ] Given I have multiple active campaigns, when I view the summary, then I can see at least: impressions, clicks, redemptions, spend
- [ ] Given I am a Trade Manager in MX, when I log in, then I only see campaigns assigned to my account
```
