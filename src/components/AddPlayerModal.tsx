import React, { useState, useEffect } from 'react';
import { User, Hash, X } from 'lucide-react';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlayer: (firstName: string, lastName: string, number: string) => void;
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({ isOpen, onClose, onAddPlayer }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [number, setNumber] = useState('');

  useEffect(() => {
    // Reset form when modal opens
    if (isOpen) {
      setFirstName('');
      setLastName('');
      setNumber('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName.trim() || lastName.trim()) { // Require at least one name part
      onAddPlayer(firstName.trim(), lastName.trim(), number.trim());
      onClose(); // Close modal after adding
    } else {
      // Optional: Add some validation feedback
      alert("Please enter at least a first or last name.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Player</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </span>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g., John"
              />
            </div>
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </span>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g., Doe"
              />
            </div>
          </div>
          <div>
            <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
              Number (Optional)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash size={18} className="text-gray-400" />
              </span>
              <input
                type="text" // Use text to allow leading zeros if needed, or number for numeric input
                id="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g., 10"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
            >
              Add Player
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPlayerModal;
