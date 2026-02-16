import React from 'react';
import PokemonImage from '../../PokemonImage';

interface ProfileCardProps {
  user: any;
  profile: any;
  formData: { username: string };
  setFormData: (data: { username: string }) => void;
  status: { type: 'success' | 'error' | null; message: string };
  friendCode: string;
  onSignOut: () => void;
  onCopyCode: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  profile,
  formData,
  setFormData,
  status,
  friendCode,
  onSignOut,
  onCopyCode,
  onSubmit
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Profile</h2>
        <button onClick={onSignOut} className="text-red-500 hover:text-red-700 text-sm font-medium">
          Sign Out
        </button>
      </div>

      {status.type && (
        <div className={`p-3 mb-4 rounded text-sm ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {status.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Avatar */}
        <div className="text-center sm:text-left">
          <div className="w-20 h-20 mx-auto sm:mx-0 rounded-full overflow-hidden bg-gray-100">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PokemonImage pokemonId={25} alt="Pokemon" className="w-14 h-14" />
              </div>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-2">{user?.email}</p>

          {/* Friend Code */}
          <button
            onClick={onCopyCode}
            className="mt-2 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded font-mono"
            title="Click to copy"
          >
            Code: <span className="font-bold text-blue-600">{friendCode || '--------'}</span>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1">
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ username: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-medium"
            >
              Save
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
