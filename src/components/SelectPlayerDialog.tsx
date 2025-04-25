import React from 'react';
import { X } from 'lucide-react';
import { Player } from '../context/TeamContext';
import PlayerIcon from './PlayerIcon';

interface SelectPlayerDialogProps {
  isOpen: boolean;
  onClose: () => void; // Called when 'X' is clicked
  onCancel: () => void; // Called when 'Cancel' button is clicked
  onSelectPlayer: (playerId: string) => void;
  title: string;
  playersToShow: Player[];
  cancelText?: string;
}

const SelectPlayerDialog: React.FC<SelectPlayerDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onSelectPlayer,
  title,
  playersToShow,
  cancelText = 'Cancel',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Player List */}
        <div className="max-h-60 overflow-y-auto mb-6 pr-2 space-y-2">
          {playersToShow.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No players currently on the field.</p>
          ) : (
            playersToShow.map((player) => (
              <button
                key={player.id}
                onClick={() => onSelectPlayer(player.id)}
                className="flex items-center w-full p-2 space-x-3 hover:bg-gray-100 rounded-md transition"
              >
                <PlayerIcon player={player} showName={false} size="small" context="roster" />
                <span className="font-medium text-sm">{player.firstName} {player.lastName} {player.number ? `(#${player.number})` : ''}</span>
              </button>
            ))
          )}
        </div>

        {/* Cancel Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectPlayerDialog;
