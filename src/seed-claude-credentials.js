import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Materialize ~/.claude/.credentials.json from CLAUDE_CODE_OAUTH_TOKEN.
// openclaw v2026.4.14's CLAUDE_CLI_CLEAR_ENV strips CLAUDE_CODE_OAUTH_TOKEN
// from the spawned `claude` subprocess, so the on-disk file is the only
// auth path. Shape mirrors what `claude /login` writes — a bare
// {accessToken, expiresAt} pair is rejected with "Not logged in".
function seedClaudeCredentials() {
  const token = (process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "").trim();
  if (!token) return;

  const dir = path.join(os.homedir(), ".claude");
  const file = path.join(dir, ".credentials.json");
  const body = {
    claudeAiOauth: {
      accessToken: token,
      // `claude setup-token` tokens are self-contained; reusing the access
      // token as refreshToken satisfies the CLI's presence check without
      // triggering a real refresh while expiresAt is in the future.
      refreshToken: token,
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      scopes: ["user:inference", "user:profile"],
      subscriptionType: "max",
    },
  };

  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, JSON.stringify(body), { mode: 0o600 });
    console.log(`[seed-claude] wrote ${file}`);
  } catch (err) {
    console.warn(`[seed-claude] failed to write ${file}: ${err}`);
  }
}

seedClaudeCredentials();
