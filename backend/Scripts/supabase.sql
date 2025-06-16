-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('god', 'admin', 'user', 'client')),
    whatsapp_id TEXT,
    instagram_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channels table (renamed from conversations)
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('channel', 'direct')),
    name TEXT,
    is_private BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channel_members table (updated from conversation_members)
CREATE TABLE channel_members (
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (channel_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    type TEXT NOT NULL CHECK (type IN ('text', 'audio', 'image')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY god_user_select_organizations ON organizations FOR SELECT USING (auth.jwt()->>'is_god_user' = 'true');
CREATE POLICY org_admin_select_organizations ON organizations FOR SELECT USING (id::text = auth.jwt()->>'organization_id');
CREATE POLICY god_user_insert_organizations ON organizations FOR INSERT WITH CHECK (auth.jwt()->>'is_god_user' = 'true');
CREATE POLICY god_user_update_organizations ON organizations FOR UPDATE USING (auth.jwt()->>'is_god_user' = 'true');
CREATE POLICY god_user_delete_organizations ON organizations FOR DELETE USING (auth.jwt()->>'is_god_user' = 'true');

-- RLS Policies for users
CREATE POLICY god_user_select_users ON users FOR SELECT USING (auth.jwt()->>'is_god_user' = 'true');
CREATE POLICY org_select_users ON users FOR SELECT USING (organization_id::text = auth.jwt()->>'organization_id');
CREATE POLICY org_admin_insert_users ON users FOR INSERT WITH CHECK (
    organization_id::text = auth.jwt()->>'organization_id'
    AND role = 'admin'
    AND auth.jwt()->>'role' = 'admin'
);
CREATE POLICY org_admin_update_users ON users FOR UPDATE USING (
    organization_id::text = auth.jwt()->>'organization_id'
    AND auth.jwt()->>'role' = 'admin'
);
CREATE POLICY org_admin_delete_users ON users FOR DELETE USING (
    organization_id::text = auth.jwt()->>'organization_id'
    AND auth.jwt()->>'role' = 'admin'
);

-- RLS Policies for channels
CREATE POLICY public_channel_select ON channels FOR SELECT USING (
    type = 'channel'
    AND is_private = FALSE
    AND organization_id::text = auth.jwt()->>'organization_id'
);
CREATE POLICY member_channel_select ON channels FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM channel_members
        WHERE channel_id = channels.id
        AND user_id = auth.uid()
    )
);
CREATE POLICY create_channel ON channels FOR INSERT WITH CHECK (
    organization_id::text = auth.jwt()->>'organization_id'
    AND type = 'channel'
    AND auth.jwt()->>'role' IN ('admin', 'user')
);
CREATE POLICY create_direct_message ON channels FOR INSERT WITH CHECK (
    organization_id::text = auth.jwt()->>'organization_id'
    AND type = 'direct'
    AND auth.jwt()->>'role' IN ('admin', 'user')
);

-- RLS Policies for channel_members
CREATE POLICY member_select_channel_members ON channel_members FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM channel_members cm
        WHERE cm.channel_id = channel_members.channel_id
        AND cm.user_id = auth.uid()
    )
);
CREATE POLICY org_admin_insert_channel_members ON channel_members FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1
        FROM channels
        WHERE id = channel_id
        AND organization_id::text = auth.jwt()->>'organization_id'
    )
    AND auth.jwt()->>'role' = 'admin'
);
CREATE POLICY user_insert_direct_message_members ON channel_members FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1
        FROM channels
        WHERE id = channel_id
        AND type = 'direct'
        AND organization_id::text = auth.jwt()->>'organization_id'
    )
    AND auth.jwt()->>'role' IN ('admin', 'user')
);

-- RLS Policies for messages
CREATE POLICY member_select_messages ON messages FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM channel_members
        WHERE channel_id = messages.channel_id
        AND user_id = auth.uid()
    )
);
CREATE POLICY member_insert_messages ON messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1
        FROM channel_members
        WHERE channel_id = messages.channel_id
        AND user_id = auth.uid()
    )
    AND auth.jwt()->>'role' != 'client'
);
CREATE POLICY client_insert_messages ON messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1
        FROM channel_members
        WHERE channel_id = messages.channel_id
        AND user_id = auth.uid()
    )
    AND EXISTS (
        SELECT 1
        FROM channels
        WHERE id = messages.channel_id
        AND type = 'channel'
    )
    AND auth.jwt()->>'role' = 'client'
);

-- Create trigger to sync auth.users with users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, organization_id, role)
    VALUES (
        NEW.id,
        NEW.email,
        (NEW.raw_user_meta_data->>'organization_id')::UUID,
        NEW.raw_user_meta_data->>'role'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = NEW.email,
        organization_id = (NEW.raw_user_meta_data->>'organization_id')::UUID,
        role = NEW.raw_user_meta_data->>'role';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

