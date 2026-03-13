import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envRaw = readFileSync(resolve(__dirname, '.env'), 'utf8');
const envVars = Object.fromEntries(
  envRaw.split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => { const idx = l.indexOf('='); return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]; })
);

const base = envVars.JIRA_BASE_URL;
const email = envVars.JIRA_EMAIL;
const token = envVars.JIRA_API_TOKEN;
const projectKey = envVars.JIRA_PROJECT_KEY ?? 'TEDU';
const auth = Buffer.from(`${email}:${token}`).toString('base64');
const headers = { Authorization: `Basic ${auth}`, Accept: 'application/json' };
console.log(`Using: ${email} @ ${base} (project: ${projectKey})`);

// 0. Who am I?
console.log('\n=== GET /rest/api/3/myself ===');
const meResp = await fetch(`${base}/rest/api/3/myself`, { headers });
console.log('HTTP status:', meResp.status);
const meText = await meResp.text();
try { const me = JSON.parse(meText); console.log('Authenticated as:', me.displayName, '/', me.emailAddress); } catch { console.log('Response:', meText.slice(0, 300)); }

// 1. List all statuses in the project
console.log(`\n=== GET /rest/api/3/project/${projectKey}/statuses ===`);
const statusResp = await fetch(`${base}/rest/api/3/project/${projectKey}/statuses`, { headers });
console.log('HTTP status:', statusResp.status);
const statuses = await statusResp.json();
if (Array.isArray(statuses)) {
  const names = [...new Set(statuses.flatMap(s => s.statuses?.map(x => x.name) ?? []))];
  console.log('All status names:', names);
} else {
  console.log('Response:', JSON.stringify(statuses).slice(0, 500));
}

// 2. Fetch issues with any status to see actual values
console.log(`\n=== Issues in ${projectKey} (all statuses) ===`);
const issResp = await fetch(`${base}/rest/api/3/search/jql`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ jql: `project = ${projectKey} ORDER BY created DESC`, maxResults: 10, fields: ['summary', 'status'] }),
});
console.log('HTTP status:', issResp.status);
const issData = await issResp.json();
if (issData.issues?.length > 0) {
  issData.issues.forEach(i => console.log(` - ${i.key}: [${i.fields.status.name}] ${i.fields.summary}`));
} else {
  console.log('No issues found or error:', JSON.stringify(issData).slice(0, 500));
}
