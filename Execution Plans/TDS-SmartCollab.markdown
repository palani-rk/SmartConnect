# Technical Design Specification: SmartCollab

## 1. Project Overview and Requirements Summary

SmartCollab is a multi-tenant collaboration platform designed to facilitate real-time communication and collaboration within organizations, similar to Slack. The platform supports multiple organizations (tenants), each with isolated users, channels, and messaging capabilities. It integrates with external platforms like WhatsApp and Instagram, enabling extended messaging and multi-modal communication (text, audio, images). The platform is built using Supabase for backend services and React for the frontend, ensuring a secure, scalable, and cost-efficient solution.

### Key Requirements
- **Multi-Tenancy**: Isolated data and operations for each organization.
- **User Roles**: 
  - God User: Platform-wide visibility (cannot view messages).
  - Org Admin: Manages organization users, channels, and external integrations.
  - Org User: Interacts within assigned channels and 1:1 chats.
  - Org Client User: Limited to assigned channels, interacts via external platforms.
- **Messaging**: Real-time channels and 1:1 chats with multi-modal support.
- **Integrations**: WhatsApp and Instagram for external messaging.
- **Security**: Data isolation, encryption, and secure authentication.
- **Scalability**: Supports 1,000+ organizations, 10,000+ users each, and 5,000+ concurrent users.
- **Cost Efficiency**: Leverage Supabase to minimize development effort and operational costs.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    A[Client (React)] <--> B[Supabase]
    B <--> C[PostgreSQL DB: Multi-tenant schema]
    B <--> D[Auth: User management]
    B <--> E[Real-Time: Messaging]
    B <--> F[Storage: Media files]
    B <--> G[Edge Functions: Integrations, Logic]
    A <--> H[External APIs: WhatsApp Business API, Instagram Graph API]
```

- **Frontend**: React web app for responsive UI.
- **Backend**: Supabase handles database, authentication, real-time updates, storage, and serverless logic.
- **External Integrations**: Edge Functions connect to WhatsApp and Instagram APIs.

---

## 3. Detailed Module/Function Descriptions

### 3.1 Data Model

The data model ensures multi-tenancy through an `organization_id` in relevant tables, with Row-Level Security (RLS) enforcing data isolation.

#### Tables
- **`organizations`**
  - `id` UUID PRIMARY KEY
  - `name` TEXT NOT NULL
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

- **`users`**
  - `id` UUID PRIMARY KEY
  - `organization_id` UUID REFERENCES organizations(id)
  - `email` TEXT UNIQUE NOT NULL
  - `role` TEXT NOT NULL CHECK (role IN ('god', 'admin', 'user', 'client'))
  - `whatsapp_id` TEXT
  - `instagram_id` TEXT
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

- **`conversations`**
  - `id` UUID PRIMARY KEY
  - `organization_id` UUID REFERENCES organizations(id)
  - `type` TEXT NOT NULL CHECK (type IN ('channel', 'direct'))
  - `name` TEXT  -- NULL for direct messages
  - `is_private` BOOLEAN  -- NULL for direct messages
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

- **`conversation_members`**
  - `conversation_id` UUID REFERENCES conversations(id)
  - `user_id` UUID REFERENCES users(id)
  - PRIMARY KEY (conversation_id, user_id)

- **`messages`**
  - `id` UUID PRIMARY KEY
  - `conversation_id` UUID REFERENCES conversations(id)
  - `user_id` UUID REFERENCES users(id)
  - `content` TEXT  -- Text or URL to media in Storage
  - `type` TEXT NOT NULL CHECK (type IN ('text', 'audio', 'image'))
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

#### Notes
- **Direct Messages**: Represented as `conversations` with `type='direct'` and exactly two members.
- **Media Files**: Stored in Supabase Storage; `content` holds the URL for audio and images.

---

### 3.2 Authentication and Authorization

- **Supabase Auth**: Manages user authentication via email/password or OAuth.
- **JWT Claims**:
  - `organization_id`: Links users to their organization.
  - `is_god_user`: Boolean flag for God Users.
- **RLS Policies**:
  - **`organizations` SELECT**:
    - God Users: `auth.jwt()->>'is_god_user' = 'true'`
    - Org Admins: `id = auth.jwt()->>'organization_id'`
  - **`users` SELECT**:
    - God Users: `auth.jwt()->>'is_god_user' = 'true'`
    - Others: `organization_id = auth.jwt()->>'organization_id'`
  - **`conversations` SELECT**:
    - Public channels: `type = 'channel' AND NOT is_private AND organization_id = auth.jwt()->>'organization_id'`
    - Private channels/Direct messages: `EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = id AND user_id = auth.uid())`
  - **`messages` SELECT/INSERT**:
    - `EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())`

- **Role Enforcement**: Application logic ensures Org Client Users cannot initiate 1:1 communications.

---

### 3.3 Real-Time Messaging

- **Supabase Real-Time**: Clients subscribe to changes in the `messages` table, filtered by `conversation_id`.
- **Frontend Example**:
  ```javascript
  supabase
    .channel('messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, (payload) => {
      // Update UI with new message
    })
    .subscribe();
  ```

---

### 3.4 External Integrations

- **Incoming Messages**:
  - Webhooks from WhatsApp/Instagram trigger Edge Functions.
  - Parse the message, identify the user via `whatsapp_id`/`instagram_id`, determine the channel, and store the message in the `messages` table.
- **Outgoing Messages**:
  - Database triggers on `messages` INSERT call Edge Functions to send messages to linked external accounts.
- **Media Handling**: Incoming media is stored in Supabase Storage; outgoing media URLs are sent via external APIs.

---

### 3.5 Multi-Modal Messaging

- **Message Types**: `text`, `audio`, `image`.
- **Storage**: Media files (audio, images) are uploaded to Supabase Storage; the `content` field stores the URL.
- **Frontend**: Handles media uploads and renders messages based on their `type`.

---

### 3.6 User and Channel Management

- **APIs**:
  - `GET /api/users`: List users (RLS restricted).
  - `POST /api/invite-user`: Invite a new user (Org Admin).
  - `POST /api/channels`: Create a new channel (Org Admin/User).
  - `POST /api/add-member`: Add a member to a channel (Org Admin).

---

## 4. Design Decisions with Rationale

- **Supabase**: Chosen for its integrated backend services (database, auth, real-time, storage), reducing development time and operational complexity.
- **Multi-Tenancy**: Using `organization_id` with RLS ensures data isolation without the overhead of separate schemas or databases.
- **Unified Conversations Table**: A single table for both channels and direct messages simplifies the data model and enhances flexibility.
- **Edge Functions**: Serverless functions handle integrations and custom logic, avoiding the need for dedicated servers.

---

## 5. Security, Scalability, and Performance

- **Security**:
  - RLS policies enforce tenant isolation.
  - Data is encrypted in transit (SSL) and at rest (Supabase).
  - Input validation in Edge Functions prevents injection attacks.
- **Scalability**:
  - Supabase auto-scales database and real-time services.
  - Database indexes on `organization_id`, `conversation_id`, and `user_id`.
- **Performance**:
  - Pagination for message history to handle large datasets.
  - Rate limiting for external API calls to avoid exceeding quotas.

---

## 6. Integration Points

- **WhatsApp Business API**:
  - Webhook: `/api/webhook/whatsapp`
  - Send messages: POST to WhatsApp API with media URLs.
- **Instagram Graph API**:
  - Webhook: `/api/webhook/instagram`
  - Send messages: POST to Instagram API.

---

## 7. Risks and Mitigations

- **Risk**: Misconfigured RLS policies leading to data leaks.
  - **Mitigation**: Implement automated tests for RLS policies across different user roles.
- **Risk**: External API rate limits disrupting messaging flows.
  - **Mitigation**: Use message queues and throttling for outgoing messages.

---

## 8. Open Questions and Future Considerations

- **Channel Selection for Org Client Users**: How do Org Client Users specify which channel to interact with if assigned to multiple channels (e.g., via keywords or commands)?
- **Future Enhancements**: The modular design supports future additions like AI features, video messaging, and mobile app development using React Native.