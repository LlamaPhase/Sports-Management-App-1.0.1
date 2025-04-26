import React, { useMemo } from 'react';
import { Game, Player, GameEvent, PlayerLineupState } from '../context/TeamContext';
import { Goal, ArrowRight, ArrowLeft, Square } from 'lucide-react'; // Removed Users icon

interface GameSummaryProps {
  game: Game;
  players: Player[];
  teamName: string; // User's team name (not needed directly for logic, but good context)
  teamLogo: string | null; // User's team logo (not used here)
}

// Helper to get player name
const getPlayerName = (playerId: string | null | undefined, playerMap: Map<string, Player>): string => {
  if (!playerId) return '';
  const player = playerMap.get(playerId);
  return player ? `${player.firstName} ${player.lastName}`.trim() : 'Unknown Player';
};

// Helper to format minute display
const formatMinute = (gameSeconds: number): string => {
  const minute = Math.floor(gameSeconds / 60);
  const extraSeconds = Math.round(gameSeconds % 60);

  // Basic logic for stoppage time (can be refined)
  if (minute >= 90 && extraSeconds > 0) {
    const stoppageMinutes = Math.ceil((gameSeconds - 90 * 60) / 60);
    return `90+${stoppageMinutes}'`; // Added apostrophe
  }
  if (minute >= 45 && minute < 50 && extraSeconds > 0) { // Rough check for HT stoppage
     const htStoppage = Math.ceil((gameSeconds - 45 * 60) / 60);
     if (htStoppage > 0) return `45+${htStoppage}'`; // Added apostrophe
  }
  // Ensure minute 0 is displayed as 1'
  return `${Math.max(1, minute + 1)}'`; // Added apostrophe
};


const GameSummary: React.FC<GameSummaryProps> = ({ game, players }) => { // Removed unused teamName, teamLogo
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  const sortedEvents = useMemo(() => {
    const eventsWithMarkers: (GameEvent | { type: 'FT'; gameSeconds: number })[] = [...(game.events || [])];
    eventsWithMarkers.push({ type: 'FT', gameSeconds: game.timerElapsedSeconds ?? 0 });
    return eventsWithMarkers.sort((a, b) => {
        if (a.gameSeconds !== b.gameSeconds) return a.gameSeconds - b.gameSeconds;
        if ('timestamp' in a && 'timestamp' in b) return a.timestamp - b.timestamp;
        if ('timestamp' in a) return -1;
        if ('timestamp' in b) return 1;
        return 0;
    });
  }, [game.events, game.timerElapsedSeconds]);

  const calculateScoreAtTime = (targetSeconds: number): { home: number; away: number } => {
    let home = 0; let away = 0;
    (game.events || []).forEach(event => {
      if (event.type === 'goal' && event.gameSeconds <= targetSeconds) {
        if (event.team === 'home') home++; else away++;
      }
    });
    return { home, away };
  };

  const fullTimeScore = useMemo(() => ({ home: game.homeScore ?? 0, away: game.awayScore ?? 0 }), [game.homeScore, game.awayScore]);

  // --- REMOVED Bench Starters Calculation ---

  // --- Refactored Rendering Logic ---
  const renderTimeline = () => {
    const timelineElements: React.ReactNode[] = [];
    const processedEventIds = new Set<string>();

    sortedEvents.forEach((event, index) => {
      if ('id' in event && processedEventIds.has(event.id)) return;

      const minute = formatMinute(event.gameSeconds);
      const isUserHome = game.location === 'home';

      // --- FT Marker ---
      if (event.type === 'FT') {
        const score = fullTimeScore;
        timelineElements.push(
          <div key={`marker-FT-${index}`} className="flex items-center justify-center my-4">
            <div className="flex-grow border-t border-gray-300"></div>
            <div className="mx-4 flex items-center space-x-2 text-gray-600 font-semibold">
               <span className="border-2 border-gray-400 rounded-full w-8 h-8 flex items-center justify-center text-sm">FT</span>
               <span>{score.home} - {score.away}</span>
            </div>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
        );
        return;
      }

      // --- Regular Game Events ---
      const isHomeEvent = event.team === 'home';
      // Determine if the event belongs to the user's team
      const isUserTeamEvent = (isUserHome && isHomeEvent) || (!isUserHome && !isHomeEvent);
      // *** CORRECTED LOGIC FOR alignRight ***
      // Align right if (user event AND user away) OR (opponent event AND user home)
      const alignRight = (isUserTeamEvent && !isUserHome) || (!isUserTeamEvent && isUserHome);


      let icon: React.ReactNode = null;
      let primaryText: React.ReactNode = null;
      let secondaryText: React.ReactNode = null;

      if (event.type === 'goal') {
        icon = <Goal size={18} className="text-black" />;
        const score = calculateScoreAtTime(event.gameSeconds);
        const scoreText = `(${score.home} - ${score.away})`;

        if (isUserTeamEvent) {
          primaryText = <span className="font-semibold">{getPlayerName(event.scorerPlayerId, playerMap) || 'Goal'} {scoreText}</span>;
          if (event.assistPlayerId) {
            secondaryText = <span className="text-xs text-gray-500">Assist by {getPlayerName(event.assistPlayerId, playerMap)}</span>;
          }
        } else {
          primaryText = <span className="font-semibold">Goal {scoreText}</span>; // Opponent Goal
        }
        processedEventIds.add(event.id);

      } else if (event.type === 'substitution') {
        // Find pair logic remains the same
        const pairEvent = sortedEvents.slice(index + 1).find(e =>
          'id' in e && e.type === 'substitution' && e.gameSeconds === event.gameSeconds && e.team === event.team &&
          ((event.playerInId && e.playerOutId) || (event.playerOutId && e.playerInId))
        ) as GameEvent | undefined;

        if (pairEvent && isUserTeamEvent) { // Only process subs for the user's team
          const playerInEvent = event.playerInId ? event : pairEvent;
          const playerOutEvent = event.playerOutId ? event : pairEvent;

          // REVERTED: Render icon AFTER text when alignRight is true
          primaryText = (
            <div className={`flex items-center ${alignRight ? 'justify-end' : ''}`}>
              {!alignRight && <span className="mr-2 flex-shrink-0"><div className="w-4 h-4 bg-green-500 rounded-full border border-white flex items-center justify-center"><ArrowRight size={10} className="text-white" /></div></span>}
              <span className="text-green-600">{getPlayerName(playerInEvent.playerInId, playerMap)}</span>
              {alignRight && <span className="ml-2 flex-shrink-0"><div className="w-4 h-4 bg-green-500 rounded-full border border-white flex items-center justify-center"><ArrowRight size={10} className="text-white" /></div></span>}
            </div>
          );
          secondaryText = (
            <div className={`flex items-center ${alignRight ? 'justify-end' : ''}`}>
               {!alignRight && <span className="mr-2 flex-shrink-0"><div className="w-4 h-4 bg-red-500 rounded-full border border-white flex items-center justify-center"><ArrowLeft size={10} className="text-white" /></div></span>}
              <span className="text-red-600">{getPlayerName(playerOutEvent.playerOutId, playerMap)}</span>
              {alignRight && <span className="ml-2 flex-shrink-0"><div className="w-4 h-4 bg-red-500 rounded-full border border-white flex items-center justify-center"><ArrowLeft size={10} className="text-white" /></div></span>}
            </div>
          );
          icon = null; // Icon handled within text for pairs
          processedEventIds.add(event.id);
          processedEventIds.add(pairEvent.id);
        } else if (isUserTeamEvent) { // Handle single sub event for user team (shouldn't happen ideally)
          console.warn("Could not find substitution pair for user event:", event);
          const isPlayerIn = !!event.playerInId;
          icon = isPlayerIn
               ? <div className="w-4 h-4 bg-green-500 rounded-full border border-white flex items-center justify-center"><ArrowRight size={10} className="text-white" /></div>
               : <div className="w-4 h-4 bg-red-500 rounded-full border border-white flex items-center justify-center"><ArrowLeft size={10} className="text-white" /></div>;
          primaryText = <span className={isPlayerIn ? "text-green-600" : "text-red-600"}>{getPlayerName(isPlayerIn ? event.playerInId : event.playerOutId, playerMap)}</span>;
          processedEventIds.add(event.id);
        } else {
            // Opponent substitution - skip rendering details for now
             if (pairEvent) {
                 processedEventIds.add(event.id);
                 processedEventIds.add(pairEvent.id);
             } else {
                 processedEventIds.add(event.id);
             }
             return; // Don't render opponent subs for now
        }
      }
      // Add card rendering logic here later

      // --- Render the Event Row ---
      // Apply alignment classes based on alignRight
      timelineElements.push(
        <div key={'id' in event ? event.id : `marker-${event.type}-${index}`} className={`flex items-start my-3 ${alignRight ? 'justify-end text-right' : 'justify-start text-left'}`}>
          {/* Minute (Left) */}
          {!alignRight && (
            <span className="w-12 text-sm font-semibold text-gray-600 mr-3 text-center flex-shrink-0">{minute}</span>
          )}
          {/* Icon (Left) - Only if not a paired sub */}
          {!alignRight && icon && (
            <span className="mr-2 mt-0.5 flex-shrink-0">{icon}</span>
          )}

          {/* Event Text (Primary/Secondary) - REMOVED items-end */}
          {/* The parent text-right should handle text alignment */}
          <div className={`flex flex-col`}>
            {primaryText}
            {secondaryText}
          </div>

           {/* Icon (Right) - Only if not a paired sub */}
           {alignRight && icon && (
            <span className="ml-2 mt-0.5 flex-shrink-0">{icon}</span>
          )}
          {/* Minute (Right) */}
          {alignRight && (
            <span className="w-12 text-sm font-semibold text-gray-600 ml-3 text-center flex-shrink-0">{minute}</span>
          )}
        </div>
      );
    });

    return timelineElements;
  };


  return (
    <div className="mt-6 bg-white p-4 rounded-lg shadow">
      {/* Timeline */}
      <div className="text-sm">
        {renderTimeline()}
      </div>

      {/* --- REMOVED Bench Starters Section --- */}

    </div>
  );
};

export default GameSummary;
