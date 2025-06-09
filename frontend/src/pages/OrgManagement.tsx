import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useOrg } from '../contexts/OrgContext';

interface InviteUserFormData {
  email: string;
  role: string;
}

interface CreateChannelFormData {
  name: string;
  isPrivate: boolean;
}

const OrgManagement: React.FC = () => {
  const { t } = useTranslation();
  const { organization, users, channels, loading, error, inviteUser, createChannel } = useOrg();
  const [activeTab, setActiveTab] = useState<'users' | 'channels'>('users');
  
  const {
    register: registerUserForm,
    handleSubmit: handleUserSubmit,
    formState: { errors: userErrors },
    reset: resetUserForm,
  } = useForm<InviteUserFormData>();

  const {
    register: registerChannelForm,
    handleSubmit: handleChannelSubmit,
    formState: { errors: channelErrors },
    reset: resetChannelForm,
  } = useForm<CreateChannelFormData>();

  const onInviteUser = async (data: InviteUserFormData) => {
    await inviteUser(data.email, data.role);
    resetUserForm();
  };

  const onCreateChannel = async (data: CreateChannelFormData) => {
    await createChannel(data.name, data.isPrivate);
    resetChannelForm();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="max-w-lg p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-500">{t('org.noOrgError')}</h2>
          <p className="mt-4">{t('org.contactAdmin')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">{organization.name}</h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('dashboard.users')}
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`ml-8 py-2 px-4 text-center border-b-2 font-medium text-sm ${
              activeTab === 'channels'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('dashboard.channels')}
          </button>
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">{t('org.inviteUsers')}</h2>
            <form
              onSubmit={handleUserSubmit(onInviteUser)}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  {...registerUserForm('email', {
                    required: String(t('auth.emailRequired')),
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: String(t('auth.invalidEmail')),
                    },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                {userErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{userErrors.email.message}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  {t('org.role')}
                </label>
                <select
                  {...registerUserForm('role', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="admin">{t('org.admin')}</option>
                  <option value="user">{t('org.user')}</option>
                  <option value="client">{t('org.client')}</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {t('dashboard.inviteUser')}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-4">{t('dashboard.users')}</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {users.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <li key={user.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.email}</p>
                          <p className="text-sm text-gray-500">{t(`org.${user.role}`)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-6 py-4 text-gray-500">{t('dashboard.noUsers')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">{t('channels.createNew')}</h2>
            <form
              onSubmit={handleChannelSubmit(onCreateChannel)}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  {t('channels.name')}
                </label>
                <input
                  type="text"
                  {...registerChannelForm('name', {
                    required: 'Channel name is required',
                    minLength: {
                      value: 3,
                      message: 'Channel name must be at least 3 characters',
                    },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                {channelErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{channelErrors.name.message}</p>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    {...registerChannelForm('isPrivate')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-900">
                    {t('channels.private')}
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {t('channels.createNew')}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-4">{t('dashboard.channels')}</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {channels.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {channels.map((channel) => (
                    <li key={channel.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{channel.name}</p>
                          <p className="text-sm text-gray-500">
                            {channel.is_private
                              ? t('channels.private')
                              : t('channels.public')}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-6 py-4 text-gray-500">{t('dashboard.noChannels')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgManagement; 