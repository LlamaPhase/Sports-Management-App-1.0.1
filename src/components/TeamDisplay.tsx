import React from 'react';
import { Shield } from 'lucide-react';

interface TeamDisplayProps {
  name: string;
  logo: string | null;
  /** Determines if this team is the opponent relative to the user's team */
  isOpponentTeam: boolean;
  size?: 'small' | 'medium' | 'large';
  /** Controls layout (e.g., text alignment, justification) */
  className?: string;
}

const TeamDisplay: React.FC<TeamDisplayProps> = ({
  name,
  logo,
  isOpponentTeam, // Renamed for clarity
  size = 'medium',
  className = '',
}) => {
  const logoSizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-6 h-6',
    large: 'w-10 h-10',
  };
  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };
  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

  // Determine if rendering the home team (icon first) or away team (icon last) based on className
  const isRenderingHomeTeam = className?.includes('justify-end'); // Heuristic based on current usage

  return (
    // className passed from parent controls alignment (justify-end/start) and text alignment (text-right/left)
    <div className={`flex items-center space-x-2 flex-shrink ${className}`}>
      {/* Render User Team Logo/Placeholder First (if rendering home team layout) */}
      {isRenderingHomeTeam && !isOpponentTeam && (
        logo ? (
          <img src={logo} alt={name} className={`${logoSizeClasses[size]} object-contain flex-shrink-0`} />
        ) : (
          // Placeholder for user's team if no logo
          <div className={`${logoSizeClasses[size]} bg-gray-300 rounded-full flex-shrink-0`}></div>
        )
      )}
       {/* Render Opponent Shield First (if rendering home team layout) - Removed Circle */}
       {isRenderingHomeTeam && isOpponentTeam && (
         <Shield size={iconSize} className="text-gray-400 flex-shrink-0" />
       )}


      {/* Team Name - allow wrapping if necessary, but prioritize showing full name */}
      <span className={`font-medium ${textSizeClasses[size]} break-words`}>{name}</span>

      {/* Render User Team Logo/Placeholder Last (if rendering away team layout) */}
      {!isRenderingHomeTeam && !isOpponentTeam && (
         logo ? (
           <img src={logo} alt={name} className={`${logoSizeClasses[size]} object-contain flex-shrink-0`} />
         ) : (
           // Placeholder for user's team if no logo
           <div className={`${logoSizeClasses[size]} bg-gray-300 rounded-full flex-shrink-0`}></div>
         )
       )}
      {/* Render Opponent Shield Icon Last (if rendering away team layout) - Removed Circle */}
      {!isRenderingHomeTeam && isOpponentTeam && (
         <Shield size={iconSize} className="text-gray-400 flex-shrink-0" />
      )}
    </div>
  );
};

export default TeamDisplay;
