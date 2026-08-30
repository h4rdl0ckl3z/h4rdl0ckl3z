import { mkdir, writeFile } from "node:fs/promises";

const username = "h4rdl0ckl3z";
const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const response = await fetch(`https://api.github.com/users/${username}/events/public?per_page=100`, {
  headers,
});

if (!response.ok) {
  throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`);
}

const events = await response.json();
const days = 30;
const today = new Date();
today.setUTCHours(0, 0, 0, 0);

const counts = new Map();
for (let i = 0; i < days; i += 1) {
  const date = new Date(today);
  date.setUTCDate(today.getUTCDate() - (days - 1 - i));
  counts.set(date.toISOString().slice(0, 10), 0);
}

for (const event of events) {
  const date = event.created_at?.slice(0, 10);
  if (date && counts.has(date)) counts.set(date, counts.get(date) + 1);
}

const values = [...counts.values()];
const max = Math.max(...values, 1);
const width = 900;
const height = 220;
const left = 42;
const right = 18;
const top = 38;
const bottom = 34;
const chartWidth = width - left - right;
const chartHeight = height - top - bottom;
const barGap = 5;
const barWidth = (chartWidth - barGap * (days - 1)) / days;

const bars = [...counts.entries()].map(([date, count], index) => {
  const x = left + index * (barWidth + barGap);
  const barHeight = count === 0 ? 2 : Math.max(4, (count / max) * chartHeight);
  const y = top + chartHeight - barHeight;
  return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" rx="3" fill="currentColor" opacity="${count === 0 ? "0.18" : "0.85"}><title>${date}: ${count} public events</title></rect>`;
}).join("\n");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">GitHub Activity — ${username}</title>
  <desc id="desc">Public GitHub events over the last ${days} days.</desc>
  <rect width="100%" height="100%" rx="14" fill="#0d1117"/>
  <g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" fill="#f0f6fc">
    <text x="${left}" y="25" font-size="15" font-weight="600">GitHub Activity</text>
    <text x="${width - right}" y="25" text-anchor="end" font-size="12" fill="#8b949e">${days} days</text>
  </g>
  <g color="#58a6ff">
    ${bars}
  </g>
  <g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="10" fill="#8b949e">
    <text x="${left}" y="${height - 10}">${[...counts.keys()][0]}</text>
    <text x="${width - right}" y="${height - 10}" text-anchor="end">${[...counts.keys()][days - 1]}</text>
  </g>
</svg>
`;

await mkdir("assets", { recursive: true });
await writeFile("assets/github-activity.svg", svg, "utf8");
console.log(`Updated assets/github-activity.svg from ${events.length} public GitHub events.`);
