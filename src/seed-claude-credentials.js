import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Materialize ~/.claude/.credentials.json from CLAUDE_CODE_OAUTH_TOKEN so
// openclaw's anthropic-cli backend (hasClaudeCliAuth) finds a logged-in
// Claude CLI session and registers subscription-backed Claude models.
// Schema matched against openclaw v2026.4.14 src/agents/cli-credentials.ts:
//   { "claudeAiOauth": { "accessToken": string, "expiresAt": number } }
// expiresAt is a finite positive number in epoch milliseconds; accessToken
// must be a non-empty string. refreshToken is optional.
function seedClaudeCredentials() {
  const token = (process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "").trim();
  if (!token) {
    console.log("[seed-claude] CLAUDE_CODE_OAUTH_TOKEN not set; skipping credentials seed");
    return;
  }

  const home = process.env.HOME || os.homedir();
  if (!home) {
    console.warn("[seed-claude] HOME not resolvable; skipping credentials seed");
    return;
  }

  const dir = path.join(home, ".claude");
  const file = path.join(dir, ".credentials.json");

  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const body = {
    claudeAiOauth: {
      accessToken: token,
      expiresAt: Date.now() + ONE_YEAR_MS,
    },
  };

  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, JSON.stringify(body), { mode: 0o600 });
    console.log(`[seed-claude] wrote ${file} (token=${token.length}ch)`);
  } catch (err) {
    console.warn(`[seed-claude] failed to write ${file}: ${err}`);
  }
}

seedClaudeCredentials();
