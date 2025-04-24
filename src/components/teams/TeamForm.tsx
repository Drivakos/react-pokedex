import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface TeamFormProps {
  initialName?: string;
  initialDescription?: string;
  onSubmit: (name: string, description: string) => void;
  onCancel: () => void;
  isCreating?: boolean;
}

const TeamForm: React.FC<TeamFormProps> = ({
  initialName = '',
  initialDescription = '',
  onSubmit,
  onCancel,
  isCreating = true
}) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [errors, setErrors] = useState<{ name?: string }>({});
  
  // Reset form when dialog reopens with new initial values
  useEffect(() => { 
    setName(initialName); 
    setDescription(initialDescription); 
  }, [initialName, initialDescription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: { name?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Team name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(name, description);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-700">
          Team Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={`
            w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
            focus:border-blue-500 outline-none transition-all
            ${errors.name ? 'border-red-500' : 'border-gray-300'}
          `}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) {
              setErrors({...errors, name: undefined});
            }
          }}
          placeholder="Enter team name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name}</p>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-700">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter team description"
          rows={2}
        />
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-300 flex items-center"
          onClick={onCancel}
        >
          <X size={16} className="mr-2" /> Cancel
        </button>
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center"
        >
          <Save size={16} className="mr-2" /> {isCreating ? 'Create' : 'Save'} Team
        </button>
      </div>
    </form>
  );
};

export default TeamForm;
