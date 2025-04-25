import React from 'react';
import { Player, PlayerLineupState, GameEvent } from '../context/TeamContext'; // Import PlayerLineupState, GameEvent
import { ArrowUp, ArrowDown, Goal, Footprints } from 'lucide-react'; // Import arrows, Goal (soccer ball), Footprints (for assist)

// Helper function (can be moved to a utils file)
const formatTimer = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};


interface PlayerIconProps {
  player: Player;
  showName?: boolean;
  size?: 'small' | 'medium' | 'large';
  context?: PlayerLineupState['location'] | 'roster';
  playtimeDisplaySeconds?: number;
  totalGameSeconds?: number;
  isStarter?: boolean;
  subbedOnCount?: number;
  subbedOffCount?: number;
  goalCount?: number;
  assistCount?: number;
}

const PlayerIcon: React.FC<PlayerIconProps> = ({
  player,
  showName = true,
  size = 'medium',
  context = 'roster',
  playtimeDisplaySeconds = 0,
  totalGameSeconds = 0,
  isStarter = false,
  subbedOnCount = 0,
  subbedOffCount = 0,
  goalCount = 0,
  assistCount = 0,
}) => {
  const getInitials = (first: string, last: string) => `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();

  const sizeClasses = { small: 'w-8 h-8 text-[10px] md:w-10 md:h-10 md:text-sm', medium: 'w-10 h-10 text-sm md:w-12 md:h-12 md:text-base', large: 'w-12 h-12 text-base md:w-14 md:h-14 md:text-lg', };
  const nameTextSizeClass = size === 'small' ? 'text-[10px] md:text-xs' : 'text-xs md:text-sm';
  const numberTextSizeClass = size === 'small' ? 'text-[9px] md:text-xs' : 'text-xs md:text-sm';
  const containerSpacing = size === 'small' ? 'space-y-0.5 md:space-y-1' : 'space-y-1';

  const circleBgClass = context === 'inactive' ? 'bg-gray-400' : 'bg-gray-100';
  const circleBorderClass = context === 'inactive' ? 'border border-gray-500' : 'border border-white';
  const circleTextColorClass = context === 'inactive' ? 'text-gray-600' : 'text-black';
  const nameColorClass = context === 'field' ? 'text-white' : (context === 'inactive' ? 'text-gray-600' : 'text-black');
  const numberColorClass = context === 'field' ? 'text-gray-300' : 'text-gray-500';

  const playtimePercent = totalGameSeconds > 0 ? (playtimeDisplaySeconds / totalGameSeconds) * 100 : 0;
  let playtimeBgColor = 'bg-red-500';
  if (playtimePercent >= 50) { playtimeBgColor = 'bg-green-500'; }
  else if (playtimePercent >= 25) { playtimeBgColor = 'bg-orange-500'; }

  const showSubCounters = (context === 'field' || context === 'bench' || context === 'inactive');
  const showSubOn = showSubCounters && subbedOnCount > 0;
  const showSubOff = showSubCounters && subbedOffCount > 0;

  const counterTopOffset = '16px';
  const counterLeftOffset = '-12px';
  const counterSpacing = '18px';

  // --- Goal/Assist Icon Rendering ---
  const showGoalAssistIcons = (context === 'field' || context === 'bench' || context === 'inactive') && (goalCount > 0 || assistCount > 0);
  const goalIcons = Array.from({ length: goalCount }, (_, i) => (
    <Goal key={`goal-${i}`} size={12} className="text-black" />
  ));
  const assistIcons = Array.from({ length: assistCount }, (_, i) => (
    <Footprints key={`assist-${i}`} size={12} className="text-blue-600" /> // Using Footprints for assist
  ));
  const eventIcons = [...goalIcons, ...assistIcons];
  // --- End Goal/Assist Icon Rendering ---

  // Calculate bottom offset for icons based on size to position above name
  const iconBottomOffset = size === 'small' ? 'bottom-5 md:bottom-6' : size === 'medium' ? 'bottom-6 md:bottom-7' : 'bottom-7 md:bottom-8';

  return (
    <div className={`relative flex flex-col items-center ${showName ? containerSpacing : ''}`}>
      {/* Player Circle - Make it relative to position icons against it */}
      <div
        className={`relative ${sizeClasses[size]} ${circleBgClass} ${circleTextColorClass} ${circleBorderClass} rounded-full flex items-center justify-center font-semibold shadow-sm`}
        title={`${player.firstName} ${player.lastName} #${player.number}`}
      >
        {getInitials(player.firstName, player.lastName)}

        {/* --- Goal/Assist Icons Container - Positioned relative to the circle --- */}
        {showGoalAssistIcons && (
          <div
            // Position near bottom-right edge of the circle, overlapping slightly
            // Using bottom-0 and right-0 places it inside the bottom-right corner
            // Adjusting with small negative values pushes it slightly outside
            className="absolute bottom-[-2px] right-[-2px] flex space-x-[-4px] z-10"
            title={`Goals: ${goalCount}, Assists: ${assistCount}`}
          >
            {eventIcons.map((icon, index) => (
              <div key={index} className="bg-white/70 rounded-full p-0.5 shadow">
                {icon}
              </div>
            ))}
          </div>
        )}
         {/* --- End Goal/Assist Icons Container --- */}

      </div> {/* End of Player Circle */}


      {/* Starter Indicator */}
      {isStarter && showSubCounters && (
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-black border border-white rounded-full flex items-center justify-center shadow z-20" title="Starter">
              <span className="text-white text-[9px] font-bold leading-none">S</span>
          </div>
      )}

      {/* Subbed On Counter */}
      {showSubOn && (
          <div className="absolute w-6 h-[16px] bg-gray-200 rounded-full flex items-center justify-between px-1 shadow-sm z-10" style={{ top: counterTopOffset, left: counterLeftOffset }} title={`Subbed On: ${subbedOnCount}`}>
              <span className="text-[10px] font-semibold text-gray-700">{subbedOnCount}</span>
              <div className="w-3 h-3 bg-green-500 rounded-full border border-white flex items-center justify-center"><ArrowUp size={8} className="text-white" /></div>
          </div>
      )}

      {/* Subbed Off Counter */}
      {showSubOff && (
          <div className={`absolute w-6 h-[16px] bg-gray-200 rounded-full flex items-center justify-between px-1 shadow-sm`} style={{ top: `calc(${counterTopOffset} + ${counterSpacing})`, left: counterLeftOffset }} title={`Subbed Off: ${subbedOffCount}`}>
              <span className="text-[10px] font-semibold text-gray-700">{subbedOffCount}</span>
              <div className="w-3 h-3 bg-red-500 rounded-full border border-white flex items-center justify-center"><ArrowDown size={8} className="text-white" /></div>
          </div>
      )}

      {/* Playtime Timer */}
      {(context === 'field' || context === 'bench' || context === 'inactive') && (
          <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 ${playtimeBgColor} text-white text-[9px] md:text-[10px] font-bold rounded-full shadow leading-tight z-20`} title={`Played: ${formatTimer(playtimeDisplaySeconds)}`}>
              {formatTimer(playtimeDisplaySeconds)}
          </div>
      )}


      {/* Player Name & Number */}
      {showName && (
        // Added pt-1 to give space below the circle/icons
        <span className={`text-center ${nameColorClass} ${nameTextSizeClass} font-medium leading-tight max-w-[50px] md:max-w-[60px] truncate pt-1`}>
          {player.firstName}
          {player.number && <span className={`block ${numberColorClass} ${numberTextSizeClass}`}>#{player.number}</span>}
        </span>
      )}
    </div>
  );
};

export default PlayerIcon;
