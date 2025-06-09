# Pseudocode for SmartCollab Key Modules

This document provides pseudocode for critical functions in the SmartCollab platform, offering a high-level overview of the logic for key operations.

---

## 1. Process Incoming WhatsApp Message

This function handles incoming messages from WhatsApp, parses the content, identifies the user and channel, and stores the message in the database.

```pseudocode
function processIncomingWhatsAppMessage(request):
    if not authenticateWebhook(request):
        return error("Invalid webhook request")
    
    sender_id = request.sender_id
    text = request.text
    media_url = request.media_url
    
    user = db.users.findOne({ whatsapp_id: sender_id })
    if not user:
        return error("User not found")
    
    channel_name = parseChannelName(text)  // e.g., extract "#channel-name" from text
    channel = db.conversations.findOne({ organization_id: user.organization_id, name: channel_name, type: 'channel' })
    if not channel:
        return error("Channel not found")
    
    if media_url:
        media = download(media_url)
        url = storage.upload(media)
        message_type = media.type  // 'audio' or 'image'
        content = url
    else:
        message_type = 'text'
        content = text
    
    db.messages.insert({
        conversation_id: channel.id,
        user_id: user.id,
        content: content,
        type: message_type,
        created_at: now()
    })
    return success
```

---

## 2. Send Message to External Platforms

This function is triggered when a new message is inserted into the `messages` table. It sends the message to users who have linked their WhatsApp or Instagram accounts.

```pseudocode
function onMessageInsert(message):
    members = db.conversation_members.find({ conversation_id: message.conversation_id })
    for member in members:
        user = db.users.findOne({ id: member.user_id })
        if user.whatsapp_id:
            whatsapp_api.send(user.whatsapp_id, message.content, message.type)
        if user.instagram_id:
            instagram_api.send(user.instagram_id, message.content, message.type)
```

---

## 3. Additional Pseudocode

### 3.1 Create a New Channel

```pseudocode
function createChannel(organization_id, name, is_private, creator_id):
    if not hasPermission(creator_id, 'create_channel'):
        return error("Permission denied")
    
    channel = db.conversations.insert({
        organization_id: organization_id,
        type: 'channel',
        name: name,
        is_private: is_private,
        created_at: now()
    })
    
    db.conversation_members.insert({
        conversation_id: channel.id,
        user_id: creator_id
    })
    return channel
```

### 3.2 Add User to Channel

```pseudocode
function addUserToChannel(conversation_id, user_id, admin_id):
    if not hasPermission(admin_id, 'manage_channel_members'):
        return error("Permission denied")
    
    channel = db.conversations.findOne({ id: conversation_id })
    if not channel:
        return error("Channel not found")
    
    db.conversation_members.insert({
        conversation_id: conversation_id,
        user_id: user_id
    })
    return success
```

### 3.3 Send 1:1 Message

```pseudocode
function sendDirectMessage(sender_id, recipient_id, content, message_type):
    if not hasPermission(sender_id, 'send_direct_message'):
        return error("Permission denied")
    
    conversation = findOrCreateDirectConversation(sender_id, recipient_id)
    
    db.messages.insert({
        conversation_id: conversation.id,
        user_id: sender_id,
        content: content,
        type: message_type,
        created_at: now()
    })
    return success
```

### 3.4 Find or Create Direct Conversation

```pseudocode
function findOrCreateDirectConversation(user1_id, user2_id):
    conversation = db.conversations.findOne({
        type: 'direct',
        organization_id: user1.organization_id,
        members: [user1_id, user2_id]
    })
    if not conversation:
        conversation = db.conversations.insert({
            organization_id: user1.organization_id,
            type: 'direct',
            created_at: now()
        })
        db.conversation_members.insert({ conversation_id: conversation.id, user_id: user1_id })
        db.conversation_members.insert({ conversation_id: conversation.id, user_id: user2_id })
    return conversation
```