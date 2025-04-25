import React from 'react';
import { Player } from '../context/TeamContext';
import PlayerIcon from './PlayerIcon';

interface PlayerCardProps {
  player: Player;
  onClick: () => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-3 p-2 border-b last:border-b-0 w-full text-left hover:bg-gray-50 transition rounded"
    >
      {/* Pass context="roster" */}
      <PlayerIcon player={player} showName={false} size="medium" context="roster" />
      <div className="flex-grow">
        <span className="font-medium">{player.firstName} {player.lastName}</span>
      </div>
      {player.number && (
        <span className="text-sm text-gray-500 font-semibold">#{player.number}</span>
      )}
    </button>
  );
};

export default PlayerCard;
