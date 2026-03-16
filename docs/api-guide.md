# Author Automation Social — API Guide

Base URL: `https://authorautomations.social/api/v1`

## Authentication

All requests require a Bearer token in the `Authorization` header.

```
Authorization: Bearer aa_sk_your_api_key_here
```

Get your API key from **Settings > API Key** in the Author Automation Social dashboard. The key is shown once when created — store it securely.

**Multi-profile access:** If your account has access to multiple profiles, pass the `X-Profile-Id` header to specify which profile to use. Otherwise, your default profile is used automatically.

---

## Quick Start

```bash
# 1. List your connected accounts to get account IDs
curl -H "Authorization: Bearer aa_sk_..." \
  https://authorautomations.social/api/v1/accounts

# 2. Create a post using an account ID from step 1
curl -X POST \
  -H "Authorization: Bearer aa_sk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello from the API!",
    "accountIds": ["682..."],
    "publishNow": true
  }' \
  https://authorautomations.social/api/v1/posts
```

---

## Endpoints

### Accounts

#### List Accounts

```
GET /accounts
```

Returns all connected social media accounts. Use the `_id` field from each account as the `accountIds` value when creating posts.

**Query parameters:**

| Parameter  | Type   | Description                          |
|------------|--------|--------------------------------------|
| `platform` | string | Filter by platform (e.g., `instagram`, `twitter`, `facebook`) |

**Response:**

```json
{
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
}
```

#### Get Account

```
GET /accounts/:id
```

Returns a single account by its ID.

---

### Posts

#### List Posts

```
GET /posts
```

**Query parameters:**

| Parameter  | Type   | Description                          |
|------------|--------|--------------------------------------|
| `status`   | string | `scheduled`, `published`, or `failed` |
| `dateFrom` | string | ISO 8601 date                        |
| `dateTo`   | string | ISO 8601 date                        |
| `page`     | number | Page number                          |
| `limit`    | number | Results per page                     |

#### Create Post

```
POST /posts
```

**Request body:**

| Field        | Type     | Required | Description                          |
|--------------|----------|----------|--------------------------------------|
| `content`    | string   | No*      | Post text (max 25,000 chars)         |
| `accountIds` | string[] | Yes      | Array of account `_id` values        |
| `publishNow` | boolean  | No      | Publish immediately (default: `true`) |
| `scheduledAt` | string  | No      | ISO 8601 datetime for scheduling     |
| `mediaItems` | array    | No      | Media attachments (see Media section) |
| `timezone`   | string   | No      | IANA timezone (e.g., `America/Chicago`) |

*Either `content` or `mediaItems` is required depending on the platform.

**Example — publish now:**

```json
{
  "content": "Check out my new book!",
  "accountIds": ["682a1b2c3d4e5f6a7b8c9d0e"],
  "publishNow": true
}
```

**Example — schedule for later:**

```json
{
  "content": "Coming soon!",
  "accountIds": ["682a1b2c3d4e5f6a7b8c9d0e", "682f1a2b3c4d5e6f7a8b9c0d"],
  "publishNow": false,
  "scheduledAt": "2026-03-20T14:00:00Z",
  "timezone": "America/Chicago"
}
```

#### Get Post

```
GET /posts/:id
```

#### Update Post

```
PATCH /posts/:id
```

Update a scheduled post's content or scheduled time.

**Request body:**

| Field        | Type   | Description                      |
|--------------|--------|----------------------------------|
| `content`    | string | New post text                    |
| `scheduledAt` | string | New ISO 8601 scheduled datetime |

#### Delete Post

```
DELETE /posts/:id
```

---

### Queue

The queue lets you set up recurring time slots so posts are automatically scheduled to go out at your preferred times. Instead of picking a specific date and time for each post, you add posts to the queue and they fill in the next available slot.

#### How Queuing Works

1. **Queue schedules** define recurring time slots (e.g., "Monday at 9:00 AM, Wednesday at 2:00 PM").
2. **Preview** shows you the next available times in your queue.
3. **Queue a post** by creating a post without `scheduledAt` or `publishNow` — it will be placed in the next available queue slot.

#### List Queue Schedules

```
GET /queue
```

Returns your queue configuration with all time slots.

**Query parameters:**

| Parameter | Type   | Description                              |
|-----------|--------|------------------------------------------|
| `all`     | string | Set to `true` to list all queues         |
| `queueId` | string | Get a specific queue by ID              |

**Response:**

```json
{
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
}
```

**Days of week:** 0 = Sunday, 1 = Monday, ..., 6 = Saturday

**Listing all queues** (if you have multiple):

```
GET /queue?all=true
```

```json
{
  "queues": [
    {
      "_id": "queue_abc123",
      "name": "Morning Posts",
      "timezone": "America/Chicago",
      "active": true,
      "isDefault": true,
      "slots": [...]
    },
    {
      "_id": "queue_def456",
      "name": "Evening Content",
      "timezone": "America/Chicago",
      "active": true,
      "isDefault": false,
      "slots": [...]
    }
  ],
  "count": 2
}
```

#### Preview Queue

```
GET /queue/preview
```

Shows the next available posting times in your queue. Use this to see when your next posts will go out.

**Query parameters:**

| Parameter | Type   | Description                              |
|-----------|--------|------------------------------------------|
| `count`   | number | Number of upcoming slots to show         |
| `queueId` | string | Preview a specific queue (default queue if omitted) |

**Response:**

```json
{
  "profileId": "69821296e40fdedc04fa993f",
  "count": 5,
  "slots": [
    "2026-03-17T09:00:00-05:00",
    "2026-03-17T14:00:00-05:00",
    "2026-03-19T09:00:00-05:00",
    "2026-03-21T11:00:00-05:00",
    "2026-03-24T09:00:00-05:00"
  ]
}
```

---

### Media Upload

Uploading media is a two-step process:

1. **Get a presigned URL** from the API
2. **Upload your file directly** to that URL via HTTP PUT

#### Step 1: Get Presigned URL

```
POST /media/presign
```

**Request body:**

| Field        | Type   | Required | Description                |
|--------------|--------|----------|----------------------------|
| `filename`   | string | Yes      | Name of your file          |
| `contentType`| string | Yes      | MIME type (see below)      |
| `size`       | number | No       | File size in bytes (max 5GB) |

**Supported content types:**

| Type       | MIME Types                                                    |
|------------|---------------------------------------------------------------|
| Images     | `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif` |
| Videos     | `video/mp4`, `video/mpeg`, `video/quicktime`, `video/avi`, `video/x-msvideo`, `video/webm`, `video/x-m4v` |
| Documents  | `application/pdf`                                             |

**Example request:**

```json
{
  "filename": "book-cover.jpg",
  "contentType": "image/jpeg",
  "size": 245000
}
```

**Response:**

```json
{
  "uploadUrl": "https://storage.example.com/presigned-put-url...",
  "publicUrl": "https://cdn.example.com/media/book-cover.jpg",
  "key": "media/abc123/book-cover.jpg",
  "type": "image"
}
```

#### Step 2: Upload File

Upload your file to the `uploadUrl` using an HTTP PUT request with the file as the body:

```bash
curl -X PUT \
  -H "Content-Type: image/jpeg" \
  --data-binary @book-cover.jpg \
  "https://storage.example.com/presigned-put-url..."
```

The presigned URL expires after 1 hour.

#### Step 3: Use in a Post

Use the `publicUrl` from step 1 in your post's `mediaItems`:

```bash
curl -X POST \
  -H "Authorization: Bearer aa_sk_..." \
  -H "Content-Type: application/json" \
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
  }' \
  https://authorautomations.social/api/v1/posts
```

**Media items format:**

| Field  | Type   | Description               |
|--------|--------|---------------------------|
| `type` | string | `image` or `video`        |
| `url`  | string | The `publicUrl` from presign |

---

### Full Workflow Example: Upload Image and Schedule Post

```bash
# 1. Get your accounts
ACCOUNTS=$(curl -s -H "Authorization: Bearer $API_KEY" \
  https://authorautomations.social/api/v1/accounts)

ACCOUNT_ID=$(echo $ACCOUNTS | jq -r '.accounts[0]._id')

# 2. Get a presigned upload URL
PRESIGN=$(curl -s -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filename":"promo.jpg","contentType":"image/jpeg"}' \
  https://authorautomations.social/api/v1/media/presign)

UPLOAD_URL=$(echo $PRESIGN | jq -r '.uploadUrl')
PUBLIC_URL=$(echo $PRESIGN | jq -r '.publicUrl')

# 3. Upload the file
curl -X PUT -H "Content-Type: image/jpeg" \
  --data-binary @promo.jpg "$UPLOAD_URL"

# 4. Check queue for next available time
curl -s -H "Authorization: Bearer $API_KEY" \
  https://authorautomations.social/api/v1/queue/preview?count=3

# 5. Create the post with the uploaded image
curl -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": \"New release day! Grab your copy now.\",
    \"accountIds\": [\"$ACCOUNT_ID\"],
    \"scheduledAt\": \"2026-03-20T14:00:00Z\",
    \"publishNow\": false,
    \"mediaItems\": [{\"type\": \"image\", \"url\": \"$PUBLIC_URL\"}]
  }" \
  https://authorautomations.social/api/v1/posts
```

---

## Rate Limits

- **100 requests per hour** per API key
- When exceeded, you'll receive a `429` response with a `resetAt` timestamp

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "requestId": "req_abc123"
  }
}
```

| Status | Code                | Meaning                          |
|--------|---------------------|----------------------------------|
| 400    | `VALIDATION_ERROR`  | Invalid request body or params   |
| 401    | `UNAUTHORIZED`      | Missing or invalid API key       |
| 403    | `FORBIDDEN`         | Subscription inactive or expired |
| 404    | `NOT_FOUND`         | Resource not found               |
| 429    | `RATE_LIMITED`      | Too many requests                |
| 500    | `INTERNAL_ERROR`    | Server error                     |
| 502    | `BAD_GATEWAY`       | Upstream API unavailable         |
