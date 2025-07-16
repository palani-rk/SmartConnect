import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabase';
import { Tables } from '../types/supabase';

// Define types for organization and users
type Organization = Tables<'organizations'>;
type User = Tables<'users'>;

interface OrgContextProps {
  organization: Organization | null;
  users: User[];
  channels: Tables<'channels'>[];
  loading: boolean;
  error: string | null;
  createChannel: (name: string, isPrivate: boolean) => Promise<void>;
  inviteUser: (email: string, role: string) => Promise<void>;
}

const OrgContext = createContext<OrgContextProps | undefined>(undefined);

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Tables<'channels'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchOrgData = async () => {
      setLoading(true);
      setError(null);

      try {
        // First get the user's organization ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('organization_id, role')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        
        if (!userData?.organization_id) {
          setError('User not associated with an organization');
          setLoading(false);
          return;
        }

        // Fetch organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', userData.organization_id)
          .single();

        if (orgError) throw orgError;
        setOrganization(orgData);

        // Fetch users in the organization
        const { data: orgUsers, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', userData.organization_id);

        if (usersError) throw usersError;
        setUsers(orgUsers || []);

        // Fetch channels in the organization
        const { data: orgChannels, error: channelsError } = await supabase
          .from('channels')
          .select('*')
          .eq('organization_id', userData.organization_id);

        if (channelsError) throw channelsError;
        setChannels(orgChannels || []);
      } catch (err) {
        console.error('Error fetching organization data:', err);
        setError('Failed to load organization data');
      } finally {
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [user]);

  const createChannel = async (name: string, isPrivate: boolean) => {
    if (!organization) {
      setError('No organization selected');
      return;
    }

    try {
      const { data, error } = await supabase.from('channels').insert({
        name,
        is_private: isPrivate,
        organization_id: organization.id,
        type: 'text'
      });

      if (error) throw error;

      // Refetch channels after creating a new one
      const { data: updatedChannels, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .eq('organization_id', organization.id);

      if (channelsError) throw channelsError;
      setChannels(updatedChannels || []);
    } catch (err) {
      console.error('Error creating channel:', err);
      setError('Failed to create channel');
    }
  };

  const inviteUser = async (email: string, role: string) => {
    if (!organization) {
      setError('No organization selected');
      return;
    }

    try {
      // In a real app, you would send an invitation email
      // For now, just create the user with a placeholder
      const { data, error } = await supabase.from('users').insert({
        email,
        role,
        organization_id: organization.id
      });

      if (error) throw error;

      // Refetch users after inviting a new one
      const { data: updatedUsers, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', organization.id);

      if (usersError) throw usersError;
      setUsers(updatedUsers || []);
    } catch (err) {
      console.error('Error inviting user:', err);
      setError('Failed to invite user');
    }
  };

  const value = {
    organization,
    users,
    channels,
    loading,
    error,
    createChannel,
    inviteUser
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
};

export const useOrg = (): OrgContextProps => {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}; 