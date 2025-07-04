# Messaging System ER Diagram

```mermaid
erDiagram
    %% Core entities
    ORGANIZATIONS {
        uuid id PK
        text name
        text description
        timestamptz created_at
        timestamptz updated_at
    }
    
    USERS {
        uuid id PK
        uuid organization_id FK
        text email
        text display_name
        text avatar_url
        enum role "admin, user, client"
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    
    CHANNELS {
        uuid id PK
        uuid organization_id FK
        text name
        text description
        enum channel_type "public, private, direct"
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    %% New messaging tables
    PLATFORM_INTEGRATIONS {
        uuid id PK
        uuid organization_id FK
        enum platform "whatsapp, instagram"
        text integration_name
        text webhook_url
        text access_token "ENCRYPTED"
        text business_phone
        text business_account_id
        jsonb settings
        boolean is_active
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    CLIENT_CHANNEL_ASSIGNMENTS {
        uuid id PK
        uuid client_user_id FK "UNIQUE"
        uuid channel_id FK
        uuid assigned_by FK
        timestamptz assigned_at
        boolean is_active
    }
    
    CLIENT_PLATFORM_LINKS {
        uuid id PK
        uuid client_user_id FK
        uuid platform_integration_id FK
        text platform_user_id
        text verification_code
        enum verification_status "pending, verified, rejected"
        timestamptz verified_at
        timestamptz created_at
    }
    
    MESSAGES {
        uuid id PK
        uuid channel_id FK
        uuid user_id FK
        text content
        enum message_type "text, image, audio, file"
        jsonb metadata
        uuid thread_id FK
        uuid platform_integration_id FK
        text external_message_id
        enum message_source "internal, whatsapp, instagram"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }
    
    MESSAGE_USER_STATUS {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        enum status "sent, delivered, read, failed"
        timestamptz timestamp
    }
    
    MESSAGE_REACTIONS {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        text emoji
        timestamptz created_at
    }
    
    %% Relationships
    ORGANIZATIONS ||--o{ USERS : "has"
    ORGANIZATIONS ||--o{ CHANNELS : "contains"
    ORGANIZATIONS ||--o{ PLATFORM_INTEGRATIONS : "owns"
    
    USERS ||--o{ CHANNELS : "creates"
    USERS ||--o{ MESSAGES : "sends"
    USERS ||--o{ MESSAGE_USER_STATUS : "has_status_for"
    USERS ||--o{ MESSAGE_REACTIONS : "reacts_with"
    USERS ||--o{ CLIENT_CHANNEL_ASSIGNMENTS : "assigned_to"
    USERS ||--o{ CLIENT_CHANNEL_ASSIGNMENTS : "assigned_by"
    USERS ||--o{ CLIENT_PLATFORM_LINKS : "links_to"
    USERS ||--o{ PLATFORM_INTEGRATIONS : "creates"
    
    CHANNELS ||--o{ MESSAGES : "contains"
    CHANNELS ||--o{ CLIENT_CHANNEL_ASSIGNMENTS : "has_assigned_clients"
    
    PLATFORM_INTEGRATIONS ||--o{ CLIENT_PLATFORM_LINKS : "linked_by_clients"
    PLATFORM_INTEGRATIONS ||--o{ MESSAGES : "routes_through"
    
    MESSAGES ||--o{ MESSAGE_USER_STATUS : "has_status"
    MESSAGES ||--o{ MESSAGE_REACTIONS : "has_reactions"
    MESSAGES ||--o{ MESSAGES : "replies_to"
    
    CLIENT_CHANNEL_ASSIGNMENTS ||--|| USERS : "client_user"
    CLIENT_PLATFORM_LINKS ||--|| USERS : "client_user"
```

## Key Relationships Explained

### **1. Organization Level**
- **Organizations** own **Platform Integrations** (WhatsApp Business, Instagram Business)
- **Organizations** contain **Channels** and **Users**

### **2. User Management**
- **Users** have roles: `admin`, `user`, `client`
- **Client Users** have 1:1 relationship with **Channels** via `CLIENT_CHANNEL_ASSIGNMENTS`
- **Client Users** can link multiple platforms via `CLIENT_PLATFORM_LINKS`

### **3. Message Flow**
- **Messages** belong to **Channels** and are sent by **Users**
- **Messages** can route through **Platform Integrations** (for WhatsApp/Instagram)
- **Messages** have per-user status tracking via `MESSAGE_USER_STATUS`

### **4. Integration Logic**
- **Platform Integrations** are org-level (not channel-level)
- **Client Platform Links** connect client users to platform integrations
- **Client Channel Assignments** determine which channel receives messages

## Data Flow Example

```
WhatsApp Message from +1234567890
    ↓
Look up CLIENT_PLATFORM_LINKS (platform_user_id = +1234567890)
    ↓
Find client_user_id = 'client-123'
    ↓
Look up CLIENT_CHANNEL_ASSIGNMENTS (client_user_id = 'client-123')
    ↓
Route to channel_id = 'support-channel-456'
    ↓
Create MESSAGE record with:
    - channel_id: 'support-channel-456'
    - user_id: 'client-123'
    - platform_integration_id: 'whatsapp-integration-1'
    - message_source: 'whatsapp'
```

## Unique Constraints

1. **CLIENT_CHANNEL_ASSIGNMENTS.client_user_id** - Each client assigned to only one channel
2. **CLIENT_PLATFORM_LINKS(client_user_id, platform_integration_id)** - One link per platform per client
3. **CLIENT_PLATFORM_LINKS(platform_integration_id, platform_user_id)** - One platform account per integration
4. **MESSAGE_USER_STATUS(message_id, user_id)** - One status per user per message

This design ensures clean 1:1 client-to-channel mapping while supporting multiple platform integrations per organization.