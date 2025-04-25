import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

interface SaveLineupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

const SaveLineupModal: React.FC<SaveLineupModalProps> = ({ isOpen, onClose, onSave }) => {
  const [lineupName, setLineupName] = useState('');

  const handleSave = () => {
    if (lineupName.trim()) {
      onSave(lineupName.trim());
      setLineupName(''); // Reset name after save
      onClose();
    } else {
      alert('Please enter a name for the lineup.');
    }
  };

  const handleClose = () => {
    setLineupName(''); // Reset name on close
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Save Lineup</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="lineupName" className="block text-sm font-medium text-gray-700 mb-1">
              Lineup Name
            </label>
            <input
              type="text"
              id="lineupName"
              value={lineupName}
              onChange={(e) => setLineupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., Starting Lineup"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center space-x-1"
            >
              <Save size={18} />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveLineupModal;
