import { z } from "zod";

export function getJiraEnv() {
  return z
    .object({
      JIRA_BASE_URL: z.string().url(),
      JIRA_EMAIL: z.string().email(),
      JIRA_API_TOKEN: z.string().min(1),
      JIRA_PROJECT_KEY: z.string().default("TEDU"),
    })
    .parse(process.env);
}

export function getGithubEnv() {
  return z
    .object({
      GITHUB_TOKEN: z.string().min(1),
      GITHUB_OWNER: z.string().min(1),
      GITHUB_REPO: z.string().min(1),
      GITHUB_BASE_BRANCH: z.string().default("main"),
    })
    .parse(process.env);
}
