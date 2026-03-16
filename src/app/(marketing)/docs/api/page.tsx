import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Guide - Author Automations Social",
  description:
    "API documentation for Author Automations Social. Create posts, manage accounts, upload media, and schedule content via the REST API.",
};

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
      {children}
    </code>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border">
      {title && (
        <div className="border-b border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          {title}
        </div>
      )}
      <pre className="overflow-x-auto bg-muted/30 p-4 text-xs leading-relaxed font-mono text-foreground">
        {children}
      </pre>
    </div>
  );
}

function Endpoint({
  method,
  path,
}: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
}) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    POST: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    PATCH: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
      <span
        className={`rounded px-2 py-0.5 text-xs font-bold font-mono ${colors[method]}`}
      >
        {method}
      </span>
      <span className="text-sm font-mono text-foreground">{path}</span>
    </div>
  );
}

function ParamTable({
  params,
}: {
  params: { name: string; type: string; required?: boolean; description: string }[];
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              Parameter
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              Type
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-b border-border last:border-0">
              <td className="px-4 py-2 font-mono text-xs text-foreground">
                {p.name}
                {p.required && (
                  <span className="ml-1 text-red-500">*</span>
                )}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">
                {p.type}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">
                {p.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-6">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            &larr; Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold">API Guide</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create posts, manage accounts, upload media, and schedule content
          programmatically.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Base URL:{" "}
          <Code>https://authorautomations.social/api/v1</Code>
        </p>

        <div className="mt-8 space-y-12 text-sm leading-relaxed text-muted-foreground">
          {/* ── Authentication ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Authentication
            </h2>
            <p className="mt-2">
              All requests require a Bearer token in the{" "}
              <Code>Authorization</Code> header.
            </p>
            <CodeBlock>{`Authorization: Bearer aa_sk_your_api_key_here`}</CodeBlock>
            <p className="mt-3">
              Get your API key from{" "}
              <strong className="text-foreground">Settings &gt; API Key</strong>{" "}
              in the dashboard. The key is shown once when created &mdash; store
              it securely.
            </p>
            <p className="mt-2">
              <strong className="text-foreground">Multi-profile access:</strong>{" "}
              If your account has access to multiple profiles, pass the{" "}
              <Code>X-Profile-Id</Code> header to specify which profile to use.
              Otherwise your default profile is used automatically.
            </p>
          </section>

          {/* ── Quick Start ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Quick Start
            </h2>
            <CodeBlock title="1. List your connected accounts to get account IDs">
              {`curl -H "Authorization: Bearer aa_sk_..." \\
  https://authorautomations.social/api/v1/accounts`}
            </CodeBlock>
            <CodeBlock title="2. Create a post using an account ID from step 1">
              {`curl -X POST \\
  -H "Authorization: Bearer aa_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Hello from the API!",
    "accountIds": ["682..."],
    "publishNow": true
  }' \\
  https://authorautomations.social/api/v1/posts`}
            </CodeBlock>
          </section>

          {/* ── Accounts ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">Accounts</h2>

            <h3 className="mt-6 text-base font-semibold text-foreground">
              List Accounts
            </h3>
            <Endpoint method="GET" path="/accounts" />
            <p className="mt-3">
              Returns all connected social media accounts. Use the{" "}
              <Code>_id</Code> field from each account as the{" "}
              <Code>accountIds</Code> value when creating posts.
            </p>
            <ParamTable
              params={[
                {
                  name: "platform",
                  type: "string",
                  description:
                    "Filter by platform (e.g., instagram, twitter, facebook)",
                },
              ]}
            />
            <CodeBlock title="Response">
              {`{
  "accounts": [
    {
      "_id": "682a1b2c3d4e5f6a7b8c9d0e",
      "platform": "instagram",
      "username": "mybookaccount",
      "displayName": "My Book Account",
      "profileUrl": "https://instagram.com/mybookaccount",
      "isActive": true
    }
  ],
  "hasAnalyticsAccess": false
}`}
            </CodeBlock>

            <h3 className="mt-6 text-base font-semibold text-foreground">
              Get Account
            </h3>
            <Endpoint method="GET" path="/accounts/:id" />
            <p className="mt-3">Returns a single account by its ID.</p>
          </section>

          {/* ── Posts ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">Posts</h2>

            <h3 className="mt-6 text-base font-semibold text-foreground">
              List Posts
            </h3>
            <Endpoint method="GET" path="/posts" />
            <ParamTable
              params={[
                {
                  name: "status",
                  type: "string",
                  description: "scheduled, published, or failed",
                },
                {
                  name: "dateFrom",
                  type: "string",
                  description: "ISO 8601 date",
                },
                {
                  name: "dateTo",
                  type: "string",
                  description: "ISO 8601 date",
                },
                { name: "page", type: "number", description: "Page number" },
                {
                  name: "limit",
                  type: "number",
                  description: "Results per page",
                },
              ]}
            />

            <h3 className="mt-6 text-base font-semibold text-foreground">
              Create Post
            </h3>
            <Endpoint method="POST" path="/posts" />
            <ParamTable
              params={[
                {
                  name: "content",
                  type: "string",
                  description: "Post text (max 25,000 chars)",
                },
                {
                  name: "accountIds",
                  type: "string[]",
                  required: true,
                  description: "Array of account _id values",
                },
                {
                  name: "publishNow",
                  type: "boolean",
                  description: "Publish immediately (default: true)",
                },
                {
                  name: "scheduledAt",
                  type: "string",
                  description: "ISO 8601 datetime for scheduling",
                },
                {
                  name: "mediaItems",
                  type: "array",
                  description:
                    'Media attachments: [{ "type": "image", "url": "..." }]',
                },
                {
                  name: "timezone",
                  type: "string",
                  description: "IANA timezone (e.g., America/Chicago)",
                },
              ]}
            />
            <CodeBlock title="Publish now">
              {`{
  "content": "Check out my new book!",
  "accountIds": ["682a1b2c3d4e5f6a7b8c9d0e"],
  "publishNow": true
}`}
            </CodeBlock>
            <CodeBlock title="Schedule for later">
              {`{
  "content": "Coming soon!",
  "accountIds": ["682a1b2c3d4e5f6a7b8c9d0e"],
  "publishNow": false,
  "scheduledAt": "2026-03-20T14:00:00Z",
  "timezone": "America/Chicago"
}`}
            </CodeBlock>

            <h3 className="mt-6 text-base font-semibold text-foreground">
              Get Post
            </h3>
            <Endpoint method="GET" path="/posts/:id" />

            <h3 className="mt-6 text-base font-semibold text-foreground">
              Update Post
            </h3>
            <Endpoint method="PATCH" path="/posts/:id" />
            <p className="mt-3">
              Update a scheduled post&apos;s content or scheduled time.
            </p>
            <ParamTable
              params={[
                {
                  name: "content",
                  type: "string",
                  description: "New post text",
                },
                {
                  name: "scheduledAt",
                  type: "string",
                  description: "New ISO 8601 scheduled datetime",
                },
              ]}
            />

            <h3 className="mt-6 text-base font-semibold text-foreground">
              Delete Post
            </h3>
            <Endpoint method="DELETE" path="/posts/:id" />
          </section>

          {/* ── Queue ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">Queue</h2>
            <p className="mt-2">
              The queue lets you set up recurring time slots so posts are
              automatically scheduled at your preferred times. Instead of picking
              a specific date and time for each post, you add posts to the queue
              and they fill the next available slot.
            </p>

            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="text-sm font-semibold text-foreground">
                How Queuing Works
              </h4>
              <ol className="mt-2 list-decimal pl-5 space-y-1 text-xs">
                <li>
                  <strong className="text-foreground">Queue schedules</strong>{" "}
                  define recurring time slots (e.g., &quot;Monday at 9:00 AM,
                  Wednesday at 2:00 PM&quot;).
                </li>
                <li>
                  <strong className="text-foreground">Preview</strong> shows you
                  the next available times in your queue.
                </li>
                <li>
                  <strong className="text-foreground">Queue a post</strong> by
                  creating a post without <Code>scheduledAt</Code> or{" "}
                  <Code>publishNow</Code> &mdash; it will be placed in the next
                  available queue slot.
                </li>
              </ol>
            </div>

            <h3 className="mt-6 text-base font-semibold text-foreground">
              List Queue Schedules
            </h3>
            <Endpoint method="GET" path="/queue" />
            <p className="mt-3">
              Returns your queue configuration with all time slots.
            </p>
            <ParamTable
              params={[
                {
                  name: "all",
                  type: "string",
                  description: 'Set to "true" to list all queues',
                },
                {
                  name: "queueId",
                  type: "string",
                  description: "Get a specific queue by ID",
                },
              ]}
            />
            <CodeBlock title="Response — single queue">
              {`{
  "exists": true,
  "schedule": {
    "_id": "queue_abc123",
    "name": "Default Queue",
    "timezone": "America/Chicago",
    "active": true,
    "isDefault": true,
    "slots": [
      { "dayOfWeek": 1, "time": "09:00" },
      { "dayOfWeek": 1, "time": "14:00" },
      { "dayOfWeek": 3, "time": "09:00" },
      { "dayOfWeek": 5, "time": "11:00" }
    ]
  },
  "nextSlots": [
    "2026-03-17T09:00:00-05:00",
    "2026-03-17T14:00:00-05:00",
    "2026-03-19T09:00:00-05:00"
  ]
}`}
            </CodeBlock>
            <p className="mt-3">
              <strong className="text-foreground">Days of week:</strong> 0 =
              Sunday, 1 = Monday, &hellip; 6 = Saturday. Times are in 24-hour
              format in the queue&apos;s timezone.
            </p>
            <CodeBlock title="Response — all queues (GET /queue?all=true)">
              {`{
  "queues": [
    {
      "_id": "queue_abc123",
      "name": "Morning Posts",
      "active": true,
      "isDefault": true,
      "slots": [...]
    },
    {
      "_id": "queue_def456",
      "name": "Evening Content",
      "active": true,
      "isDefault": false,
      "slots": [...]
    }
  ],
  "count": 2
}`}
            </CodeBlock>

            <h3 className="mt-6 text-base font-semibold text-foreground">
              Preview Queue
            </h3>
            <Endpoint method="GET" path="/queue/preview" />
            <p className="mt-3">
              Shows the next available posting times in your queue. Use this to
              see when your next posts will go out.
            </p>
            <ParamTable
              params={[
                {
                  name: "count",
                  type: "number",
                  description: "Number of upcoming slots to show",
                },
                {
                  name: "queueId",
                  type: "string",
                  description:
                    "Preview a specific queue (default queue if omitted)",
                },
              ]}
            />
            <CodeBlock title="Response">
              {`{
  "profileId": "69821296e40fdedc04fa993f",
  "count": 5,
  "slots": [
    "2026-03-17T09:00:00-05:00",
    "2026-03-17T14:00:00-05:00",
    "2026-03-19T09:00:00-05:00",
    "2026-03-21T11:00:00-05:00",
    "2026-03-24T09:00:00-05:00"
  ]
}`}
            </CodeBlock>
          </section>

          {/* ── Media Upload ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Media Upload
            </h2>
            <p className="mt-2">
              Uploading media is a two-step process: get a presigned URL from the
              API, then upload your file directly to that URL.
            </p>

            <h3 className="mt-6 text-base font-semibold text-foreground">
              Step 1: Get Presigned URL
            </h3>
            <Endpoint method="POST" path="/media/presign" />
            <ParamTable
              params={[
                {
                  name: "filename",
                  type: "string",
                  required: true,
                  description: "Name of your file",
                },
                {
                  name: "contentType",
                  type: "string",
                  required: true,
                  description: "MIME type (see supported types below)",
                },
                {
                  name: "size",
                  type: "number",
                  description: "File size in bytes (max 5 GB)",
                },
              ]}
            />

            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                      Supported MIME Types
                    </th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b border-border">
                    <td className="px-4 py-2 text-foreground">Images</td>
                    <td className="px-4 py-2 font-mono">
                      image/jpeg, image/png, image/webp, image/gif
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2 text-foreground">Videos</td>
                    <td className="px-4 py-2 font-mono">
                      video/mp4, video/mpeg, video/quicktime, video/webm
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-foreground">Documents</td>
                    <td className="px-4 py-2 font-mono">application/pdf</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <CodeBlock title="Request">
              {`{
  "filename": "book-cover.jpg",
  "contentType": "image/jpeg",
  "size": 245000
}`}
            </CodeBlock>
            <CodeBlock title="Response">
              {`{
  "uploadUrl": "https://storage.example.com/presigned-put-url...",
  "publicUrl": "https://cdn.example.com/media/book-cover.jpg",
  "key": "media/abc123/book-cover.jpg",
  "type": "image"
}`}
            </CodeBlock>

            <h3 className="mt-6 text-base font-semibold text-foreground">
              Step 2: Upload Your File
            </h3>
            <p className="mt-3">
              Upload your file to the <Code>uploadUrl</Code> using an HTTP PUT
              request with the file as the body. The presigned URL expires after
              1 hour.
            </p>
            <CodeBlock title="Upload via curl">
              {`curl -X PUT \\
  -H "Content-Type: image/jpeg" \\
  --data-binary @book-cover.jpg \\
  "https://storage.example.com/presigned-put-url..."`}
            </CodeBlock>

            <h3 className="mt-6 text-base font-semibold text-foreground">
              Step 3: Use in a Post
            </h3>
            <p className="mt-3">
              Use the <Code>publicUrl</Code> from step 1 in your post&apos;s{" "}
              <Code>mediaItems</Code> array. Each item needs a{" "}
              <Code>type</Code> (<Code>image</Code> or <Code>video</Code>) and
              the <Code>url</Code>.
            </p>
            <CodeBlock title="Create post with uploaded media">
              {`curl -X POST \\
  -H "Authorization: Bearer aa_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "My new book is here!",
    "accountIds": ["682a1b2c3d4e5f6a7b8c9d0e"],
    "publishNow": true,
    "mediaItems": [
      {
        "type": "image",
        "url": "https://cdn.example.com/media/book-cover.jpg"
      }
    ]
  }' \\
  https://authorautomations.social/api/v1/posts`}
            </CodeBlock>
          </section>

          {/* ── Full Workflow ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Full Workflow Example
            </h2>
            <p className="mt-2">
              Upload an image and schedule a post to your next queue slot:
            </p>
            <CodeBlock>
              {`# 1. Get your accounts
ACCOUNTS=$(curl -s -H "Authorization: Bearer $API_KEY" \\
  https://authorautomations.social/api/v1/accounts)

ACCOUNT_ID=$(echo $ACCOUNTS | jq -r '.accounts[0]._id')

# 2. Get a presigned upload URL
PRESIGN=$(curl -s -X POST \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"filename":"promo.jpg","contentType":"image/jpeg"}' \\
  https://authorautomations.social/api/v1/media/presign)

UPLOAD_URL=$(echo $PRESIGN | jq -r '.uploadUrl')
PUBLIC_URL=$(echo $PRESIGN | jq -r '.publicUrl')

# 3. Upload the file
curl -X PUT -H "Content-Type: image/jpeg" \\
  --data-binary @promo.jpg "$UPLOAD_URL"

# 4. Check queue for next available time
curl -s -H "Authorization: Bearer $API_KEY" \\
  https://authorautomations.social/api/v1/queue/preview?count=3

# 5. Create the post with the uploaded image
curl -X POST \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"content\\": \\"New release day! Grab your copy now.\\",
    \\"accountIds\\": [\\"$ACCOUNT_ID\\"],
    \\"scheduledAt\\": \\"2026-03-20T14:00:00Z\\",
    \\"publishNow\\": false,
    \\"mediaItems\\": [{\\"type\\": \\"image\\", \\"url\\": \\"$PUBLIC_URL\\"}]
  }" \\
  https://authorautomations.social/api/v1/posts`}
            </CodeBlock>
          </section>

          {/* ── Rate Limits ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Rate Limits
            </h2>
            <p className="mt-2">
              The API allows <strong className="text-foreground">100 requests per hour</strong>{" "}
              per API key. When exceeded, you&apos;ll receive a{" "}
              <Code>429</Code> response with a <Code>resetAt</Code> timestamp.
            </p>
          </section>

          {/* ── Errors ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Error Responses
            </h2>
            <p className="mt-2">All errors follow this format:</p>
            <CodeBlock>
              {`{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "requestId": "req_abc123"
  }
}`}
            </CodeBlock>

            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                      Code
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                      Meaning
                    </th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b border-border">
                    <td className="px-4 py-2 font-mono text-foreground">400</td>
                    <td className="px-4 py-2 font-mono">VALIDATION_ERROR</td>
                    <td className="px-4 py-2">Invalid request body or params</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2 font-mono text-foreground">401</td>
                    <td className="px-4 py-2 font-mono">UNAUTHORIZED</td>
                    <td className="px-4 py-2">Missing or invalid API key</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2 font-mono text-foreground">403</td>
                    <td className="px-4 py-2 font-mono">FORBIDDEN</td>
                    <td className="px-4 py-2">
                      Subscription inactive or expired
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2 font-mono text-foreground">404</td>
                    <td className="px-4 py-2 font-mono">NOT_FOUND</td>
                    <td className="px-4 py-2">Resource not found</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2 font-mono text-foreground">429</td>
                    <td className="px-4 py-2 font-mono">RATE_LIMITED</td>
                    <td className="px-4 py-2">Too many requests</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2 font-mono text-foreground">500</td>
                    <td className="px-4 py-2 font-mono">INTERNAL_ERROR</td>
                    <td className="px-4 py-2">Server error</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-foreground">502</td>
                    <td className="px-4 py-2 font-mono">BAD_GATEWAY</td>
                    <td className="px-4 py-2">Upstream API unavailable</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
