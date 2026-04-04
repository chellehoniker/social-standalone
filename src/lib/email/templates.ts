const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://authorautomations.social";

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(body: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      ${body}
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="font-size: 12px; color: #888;">
        This notification was sent by <a href="${APP_URL}" style="color: #888;">Author Automations</a>.
        You can manage your posts from your <a href="${APP_URL}/dashboard" style="color: #888;">dashboard</a>.
      </p>
    </div>
  `;
}

export interface FailedPost {
  postId: string;
  content: string;
  platform: string;
  accountName: string;
  errorMessage: string;
  scheduledFor: string;
}

/**
 * Email to the user about their failed post(s).
 */
export function postFailureUserEmail(failures: FailedPost[]): string {
  const postRows = failures.map((f) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${esc(f.platform)}</strong> (${esc(f.accountName)})</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(f.errorMessage)}</td>
    </tr>
  `).join("");

  const rawPreview = failures[0]?.content
    ? failures[0].content.substring(0, 120) + (failures[0].content.length > 120 ? "..." : "")
    : "Your post";

  return layout(`
    <h2 style="color: #dc2626;">Post Failed to Publish</h2>
    <p><strong>Post:</strong> "${esc(rawPreview)}"</p>
    <p><strong>Scheduled for:</strong> ${esc(failures[0]?.scheduledFor || "N/A")}</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background: #f9f9f9;">
          <th style="padding: 8px; text-align: left;">Platform</th>
          <th style="padding: 8px; text-align: left;">Error</th>
        </tr>
      </thead>
      <tbody>${postRows}</tbody>
    </table>

    <h3>What you can do:</h3>
    <ul>
      <li><a href="${APP_URL}/dashboard/calendar?status=failed">View and retry your failed posts</a></li>
      <li><a href="${APP_URL}/dashboard/accounts">Check your account connections</a> to make sure they're still active</li>
    </ul>

    <p>If the problem persists, please <a href="${APP_URL}/dashboard/support">contact support</a>.</p>
  `);
}

/**
 * Admin summary email for failed posts.
 */
export function postFailureAdminEmail(userEmail: string, failures: FailedPost[]): string {
  const postRows = failures.map((f) => `
    <tr>
      <td style="padding: 4px 8px;">${esc(f.platform)}</td>
      <td style="padding: 4px 8px;">${esc(f.accountName)}</td>
      <td style="padding: 4px 8px;">${esc(f.errorMessage)}</td>
      <td style="padding: 4px 8px; font-family: monospace; font-size: 11px;">${esc(f.postId)}</td>
    </tr>
  `).join("");

  return layout(`
    <h2>Post Failure Alert</h2>
    <p><strong>User:</strong> ${esc(userEmail)}</p>
    <p><strong>Post count:</strong> ${failures.length} platform(s) failed</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
      <thead>
        <tr style="background: #f9f9f9;">
          <th style="padding: 4px 8px; text-align: left;">Platform</th>
          <th style="padding: 4px 8px; text-align: left;">Account</th>
          <th style="padding: 4px 8px; text-align: left;">Error</th>
          <th style="padding: 4px 8px; text-align: left;">Post ID</th>
        </tr>
      </thead>
      <tbody>${postRows}</tbody>
    </table>

    <p><a href="${APP_URL}/admin">View in Admin Panel</a></p>
  `);
}

export interface DisconnectedAccount {
  accountId: string;
  platform: string;
  displayName: string;
}

/**
 * Email to the user about disconnected accounts.
 */
export function accountDisconnectUserEmail(accounts: DisconnectedAccount[]): string {
  const rows = accounts.map((a) => `
    <li><strong>${esc(a.platform)}</strong> &mdash; ${esc(a.displayName)}</li>
  `).join("");

  return layout(`
    <h2 style="color: #d97706;">Account Connection Issue</h2>
    <p>The following social media account(s) need to be reconnected:</p>
    <ul>${rows}</ul>

    <p>Posts scheduled to these accounts won't publish until the connection is restored.</p>

    <p><a href="${APP_URL}/dashboard/accounts" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Reconnect Accounts</a></p>

    <p>If you didn't disconnect these accounts, it may be because the platform revoked access (e.g., password change, expired token). Simply reconnect and your scheduled posts will resume.</p>
  `);
}

/**
 * Admin email for disconnected accounts.
 */
export function accountDisconnectAdminEmail(userEmail: string, accounts: DisconnectedAccount[]): string {
  const rows = accounts.map((a) => `<li>${esc(a.platform)} &mdash; ${esc(a.displayName)} (${esc(a.accountId)})</li>`).join("");

  return layout(`
    <h2>Account Disconnect Alert</h2>
    <p><strong>User:</strong> ${esc(userEmail)}</p>
    <p><strong>Accounts needing reconnection:</strong></p>
    <ul>${rows}</ul>
    <p><a href="${APP_URL}/admin">View in Admin Panel</a></p>
  `);
}

/**
 * Email to user when campaign media generation is complete.
 */
export function mediaGenerationCompleteEmail(campaignName: string, campaignId: string, completed: number, failed: number): string {
  const total = completed + failed;
  return layout(`
    <h2 style="color: #16a34a;">Your campaign media is ready!</h2>
    <p><strong>Campaign:</strong> ${esc(campaignName)}</p>
    <p>${completed} of ${total} media items generated successfully.${failed > 0 ? ` ${failed} failed and can be regenerated.` : ""}</p>
    <p style="margin-top: 16px;">
      <a href="${APP_URL}/dashboard/create?id=${esc(campaignId)}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Review &amp; Schedule Campaign</a>
    </p>
  `);
}
