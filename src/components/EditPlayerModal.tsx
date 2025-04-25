import React, { useState, useEffect } from 'react';
import { User, Hash, X, Trash2 } from 'lucide-react'; // Added Trash2
import { Player } from '../context/TeamContext';
import ConfirmModal from './ConfirmModal'; // Import ConfirmModal

interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  onUpdatePlayer: (id: string, updates: Partial<Pick<Player, 'firstName' | 'lastName' | 'number'>>) => void;
  onDeletePlayer: (id: string) => void; // Add delete handler prop
}

const EditPlayerModal: React.FC<EditPlayerModalProps> = ({ isOpen, onClose, player, onUpdatePlayer, onDeletePlayer }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [number, setNumber] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false); // State for confirm modal

  useEffect(() => {
    if (isOpen && player) {
      setFirstName(player.firstName);
      setLastName(player.lastName);
      setNumber(player.number);
    } else if (!isOpen) {
        setFirstName('');
        setLastName('');
        setNumber('');
        setIsConfirmDeleteOpen(false); // Ensure confirm modal is closed when main modal closes
    }
  }, [isOpen, player]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (player && (firstName.trim() || lastName.trim())) {
      onUpdatePlayer(player.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        number: number.trim(),
      });
      onClose();
    } else {
      alert("Please enter at least a first or last name.");
    }
  };

  // --- Delete Handlers ---
  const handleDeleteClick = () => {
    setIsConfirmDeleteOpen(true); // Open confirmation modal
  };

  const handleConfirmDelete = () => {
    if (player) {
      onDeletePlayer(player.id);
      setIsConfirmDeleteOpen(false); // Close confirm modal
      onClose(); // Close edit modal
    }
  };
  // --- End Delete Handlers ---

  if (!isOpen || !player) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Edit Player</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input fields (unchanged) */}
            <div>
              <label htmlFor="editFirstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className="text-gray-400" /></span>
                <input type="text" id="editFirstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" placeholder="e.g., John" />
              </div>
            </div>
            <div>
              <label htmlFor="editLastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className="text-gray-400" /></span>
                <input type="text" id="editLastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" placeholder="e.g., Doe" />
              </div>
            </div>
            <div>
              <label htmlFor="editNumber" className="block text-sm font-medium text-gray-700 mb-1">Number (Optional)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Hash size={18} className="text-gray-400" /></span>
                <input type="text" id="editNumber" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" placeholder="e.g., 10" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4">
              {/* Delete Button */}
              <button
                type="button"
                onClick={handleDeleteClick}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition flex items-center space-x-1"
                title="Delete Player"
              >
                <Trash2 size={18} />
                <span>Delete</span>
              </button>
              {/* Cancel and Save Buttons */}
              <div className="flex space-x-3">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition">Save Changes</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal for Delete */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Player"
        message={`Are you sure you want to delete ${player.firstName} ${player.lastName}? This action cannot be undone.`}
        confirmText="Delete Player"
      />
    </>
  );
};

export default EditPlayerModal;
