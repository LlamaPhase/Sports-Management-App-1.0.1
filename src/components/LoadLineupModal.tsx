import React, { useState } from 'react';
import { Download, Trash2, X } from 'lucide-react';
import { SavedLineup } from '../context/TeamContext';

interface LoadLineupModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedLineups: SavedLineup[];
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
}

const LoadLineupModal: React.FC<LoadLineupModalProps> = ({ isOpen, onClose, savedLineups, onLoad, onDelete }) => {
  const [selectedLineup, setSelectedLineup] = useState<string | null>(null);

  const handleLoad = () => {
    if (selectedLineup) {
      onLoad(selectedLineup);
      onClose();
    } else {
      alert('Please select a lineup to load.');
    }
  };

  const handleDelete = (e: React.MouseEvent, name: string) => {
    e.stopPropagation(); // Prevent row selection when clicking delete
    if (window.confirm(`Are you sure you want to delete the lineup "${name}"?`)) {
      onDelete(name);
      // If the deleted lineup was selected, deselect it
      if (selectedLineup === name) {
        setSelectedLineup(null);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Load Lineup</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4 max-h-60 overflow-y-auto mb-4 pr-2">
          {savedLineups.length === 0 ? (
            <p className="text-gray-500 text-center">No saved lineups found.</p>
          ) : (
            savedLineups.map((lineup) => (
              <div
                key={lineup.name}
                onClick={() => setSelectedLineup(lineup.name)}
                className={`flex justify-between items-center p-3 border rounded-md cursor-pointer transition-colors ${
                  selectedLineup === lineup.name
                    ? 'bg-red-100 border-red-300'
                    : 'hover:bg-gray-100 border-gray-200'
                }`}
              >
                <span className="font-medium">{lineup.name}</span>
                <button
                  onClick={(e) => handleDelete(e, lineup.name)}
                  className="text-gray-400 hover:text-red-600 transition-colors p-1 -mr-1"
                  aria-label={`Delete lineup ${lineup.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLoad}
            disabled={!selectedLineup || savedLineups.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span>Load</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadLineupModal;
