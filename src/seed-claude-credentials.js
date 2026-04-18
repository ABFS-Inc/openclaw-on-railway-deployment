import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Materialize ~/.claude/.credentials.json from CLAUDE_CODE_OAUTH_TOKEN so
// openclaw's anthropic-cli backend can authenticate when it spawns the
// claude CLI. Openclaw v2026.4.14's extensions/anthropic/cli-shared.ts
// (CLAUDE_CLI_CLEAR_ENV) explicitly scrubs CLAUDE_CODE_OAUTH_TOKEN,
// ANTHROPIC_API_KEY, and CLAUDE_CONFIG_DIR from the spawned subprocess's
// env, so the ONLY auth path the claude CLI has is this on-disk file.
//
// The file shape must satisfy both:
//  * openclaw's hasClaudeCliAuth() (src/agents/cli-credentials.ts), which
//    requires claudeAiOauth.accessToken (string) + claudeAiOauth.expiresAt
//    (finite number); refreshToken is optional.
//  * The real `claude` binary's own "logged in" check, which inspects the
//    same file — a bare {accessToken, expiresAt} pair is insufficient and
//    results in "Not logged in · Please run /login". The fuller shape
//    below mirrors what an interactive `claude /login` writes.
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
      // refreshToken is required by the claude CLI's validator even though
      // `claude setup-token` tokens are self-contained and don't need
      // refreshing. Reusing the access token as a placeholder satisfies
      // the presence check; the CLI should not attempt a refresh while
      // expiresAt is still in the future.
      refreshToken: token,
      expiresAt: Date.now() + ONE_YEAR_MS,
      scopes: ["user:inference", "user:profile"],
      // Non-"unknown" subscriptionType is required — see openclaw's own
      // scripts/test-live-cli-backend-docker.sh which rejects "unknown".
      // "max" works for both Max and Pro users; Anthropic's server-side
      // quota check governs actual access.
      subscriptionType: "max",
    },
  };

  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, JSON.stringify(body), { mode: 0o600 });
    console.log(
      `[seed-claude] wrote ${file} (token=${token.length}ch, schema=v2: accessToken+refreshToken+expiresAt+scopes+subscriptionType)`,
    );
  } catch (err) {
    console.warn(`[seed-claude] failed to write ${file}: ${err}`);
  }
}

seedClaudeCredentials();
