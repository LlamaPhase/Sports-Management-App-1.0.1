import React, { useState, useContext, useMemo, useEffect } from 'react';
import { Plus, Shield, ChevronDown } from 'lucide-react';
import { TeamContext, Player, Game, PlayerLineupState, GameEvent } from '../context/TeamContext'; // Added GameEvent
import AddPlayerModal from '../components/AddPlayerModal';
import EditPlayerModal from '../components/EditPlayerModal';
import TeamDisplay from '../components/TeamDisplay';
import PlayerIcon from '../components/PlayerIcon';

// --- Helper Functions (Unchanged) ---
const formatDate = (dateString: string, options: Intl.DateTimeFormatOptions) => {
  try { const date = new Date(dateString + 'T00:00:00'); if (isNaN(date.getTime())) return "Invalid Date"; return date.toLocaleDateString(undefined, options); }
  catch (e) { console.error("Error formatting date:", dateString, e); return "Invalid Date"; }
};
const formatTime = (timeString: string) => {
  if (!timeString || !timeString.includes(':')) return '';
  try { const [hours, minutes] = timeString.split(':'); const date = new Date(); date.setHours(parseInt(hours, 10)); date.setMinutes(parseInt(minutes, 10)); if (isNaN(date.getTime())) return "Invalid Time"; return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch (e) { console.error("Error formatting time:", timeString, e); return "Invalid Time"; }
};
const formatPlayTime = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
// --- End Helper Functions ---

// --- Player Stats Calculation ---
interface PlayerStats {
  pt: number; // Play Time (seconds)
  ga: number; // Games Attended
  gp: number; // Games Played (pt > 0)
  s: number;  // Starts
  // Updated stats
  g: number;  // Goals
  a: number;  // Assists
  yc: number; // Yellow Cards (Placeholder)
  rc: number; // Red Cards (Placeholder)
}

// UPDATED: Calculate stats including Goals (G) and Assists (A) from game events
const calculatePlayerStats = (
  playerId: string,
  filteredGames: Game[]
): PlayerStats => {
  let pt = 0;
  let ga = 0;
  let gp = 0;
  let s = 0;
  let g = 0; // Initialize goals
  let a = 0; // Initialize assists

  filteredGames.forEach(game => {
    // Calculate lineup-based stats (PT, GA, GP, S)
    const playerState = game.lineup?.find(p => p.id === playerId);
    if (playerState) {
      if (playerState.location === 'field' || playerState.location === 'bench') ga++;
      pt += playerState.playtimeSeconds || 0;
      if ((playerState.playtimeSeconds || 0) > 0) gp++;
      if (playerState.isStarter) s++;
    }

    // Calculate event-based stats (G, A)
    game.events?.forEach(event => {
      if (event.type === 'goal') {
        if (event.scorerPlayerId === playerId) g++;
        if (event.assistPlayerId === playerId) a++;
      }
      // Add logic for cards here if/when implemented
    });
  });

  return { pt, ga, gp, s, g, a, yc: 0, rc: 0 }; // Return calculated stats
};
// --- End Player Stats Calculation ---


const TeamPage: React.FC = () => {
  const { players, addPlayer, updatePlayer, deletePlayer, games, teamName, teamLogo, selectGame, gameHistory } = useContext(TeamContext);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');

  // --- Memoized Data (Largely Unchanged, but playerStatsMap uses updated calculation) ---
  const sortedPlayers = useMemo(() =>
    [...players].sort((a, b) => a.firstName.localeCompare(b.firstName)),
    [players]
  );
  const now = useMemo(() => new Date(), []);
  const validGames = useMemo(() => games || [], [games]);
  const upcomingGames = useMemo(() => validGames.filter(game => { const gameDateTime = new Date(`${game.date}T${game.time || '00:00'}`); const isFinished = game.isExplicitlyFinished === true; return game.timerStatus !== 'running' && !isFinished && gameDateTime >= now; }).sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime()), [validGames, now]);
  const previousGames = useMemo(() => validGames.filter(game => game.isExplicitlyFinished === true).sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime()), [validGames]);
  const nextGame = upcomingGames[0];
  const lastFiveGames = previousGames.slice(0, 5);
  const lastFiveGamesReversed = useMemo(() => [...lastFiveGames].reverse(), [lastFiveGames]);
  const filteredGamesForStats = useMemo(() => {
    return validGames.filter(game => {
      const seasonMatch = !selectedSeason || game.season === selectedSeason;
      const competitionMatch = !selectedCompetition || game.competition === selectedCompetition;
      return game.isExplicitlyFinished === true && seasonMatch && competitionMatch;
    });
  }, [validGames, selectedSeason, selectedCompetition]);
  const availableCompetitions = useMemo(() => {
    if (!selectedSeason) return [];
    const competitionsInSeason = new Set<string>();
    validGames.forEach(game => { if (game.season === selectedSeason && game.competition && game.competition.trim()) { competitionsInSeason.add(game.competition.trim()); } });
    return Array.from(competitionsInSeason).sort();
  }, [selectedSeason, validGames]);
  useEffect(() => { if (selectedCompetition && !availableCompetitions.includes(selectedCompetition)) { setSelectedCompetition(''); } }, [selectedSeason, selectedCompetition, availableCompetitions]);

  // Uses the updated calculatePlayerStats function
  const playerStatsMap = useMemo(() => {
    const statsMap = new Map<string, PlayerStats>();
    players.forEach(player => {
      statsMap.set(player.id, calculatePlayerStats(player.id, filteredGamesForStats));
    });
    return statsMap;
  }, [players, filteredGamesForStats]); // Depends on the filtered games which include events
  // --- End Memoized Data ---

  // --- Handlers (Unchanged) ---
  const handleEditPlayerClick = (player: Player) => { setPlayerToEdit(player); setIsEditModalOpen(true); };
  const handleCloseEditModal = () => { setIsEditModalOpen(false); setPlayerToEdit(null); };
  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedSeason(e.target.value); setSelectedCompetition(''); };
  const handleCompetitionChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedCompetition(e.target.value); };
  // --- End Handlers ---

  return (
    <div className="space-y-6">
      {/* Next Game Section (Unchanged) */}
      {nextGame && ( <button onClick={() => selectGame(nextGame.id)} className="w-full text-left bg-white p-4 rounded-lg shadow hover:bg-gray-50 transition"> <h2 className="text-lg font-semibold mb-3 text-gray-700">Next Game</h2> <p className="text-sm text-gray-500 mb-3"> {formatDate(nextGame.date, { weekday: 'short', month: 'short', day: 'numeric' })} </p> <div className="flex justify-center items-center space-x-2"> <TeamDisplay name={nextGame.location === 'home' ? (teamName || 'Your Team') : nextGame.opponent} logo={nextGame.location === 'home' ? teamLogo : null} isOpponentTeam={nextGame.location === 'away'} className="flex-1 justify-end text-right" /> <span className="text-sm font-semibold text-gray-800 px-1 flex-shrink-0 w-16 text-center"> {formatTime(nextGame.time)} </span> <TeamDisplay name={nextGame.location === 'away' ? (teamName || 'Your Team') : nextGame.opponent} logo={nextGame.location === 'away' ? teamLogo : null} isOpponentTeam={nextGame.location === 'home'} className="flex-1 justify-start text-left" /> </div> </button> )}

      {/* Last 5 Games Section (Unchanged) */}
      {lastFiveGamesReversed.length > 0 && ( <div className="bg-white p-4 rounded-lg shadow"> <h2 className="text-lg font-semibold mb-4 text-gray-700">Last 5 Games</h2> <div className="flex justify-around items-start space-x-2 text-center"> {lastFiveGamesReversed.map((game) => { const scoreHome = game.homeScore ?? 0; const scoreAway = game.awayScore ?? 0; const userScore = game.location === 'home' ? scoreHome : scoreAway; const opponentScore = game.location === 'home' ? scoreAway : scoreHome; const isWin = userScore > opponentScore; const isLoss = userScore < opponentScore; let scoreBg = 'bg-gray-400'; if (isWin) scoreBg = 'bg-green-500'; else if (isLoss) scoreBg = 'bg-red-500'; return ( <button key={game.id} onClick={() => selectGame(game.id)} className="flex flex-col items-center space-y-1 flex-1 min-w-0 hover:opacity-75 transition"> <span className={`px-3 py-1 rounded text-white text-sm font-bold ${scoreBg}`}> {`${scoreHome} - ${scoreAway}`} </span> <TeamDisplay name="" logo={null} isOpponentTeam={true} size="medium" className="mt-1" /> <span className="text-xs text-gray-500 truncate w-full px-1">{game.opponent}</span> </button> ); })} </div> </div> )}

      {/* Players List & Stats Section */}
      <div className="bg-white p-4 rounded-lg shadow">
        {/* Header with Filters and Add Button (Unchanged) */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <h2 className="text-xl font-semibold">Players & Stats</h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select value={selectedSeason} onChange={handleSeasonChange} className="appearance-none bg-gray-100 border border-gray-300 rounded-md pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500">
                <option value="">All Seasons</option>
                {gameHistory.seasons.map(season => (<option key={season} value={season}>{season}</option>))}
              </select>
              <ChevronDown size={16} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={selectedCompetition} onChange={handleCompetitionChange} disabled={!selectedSeason} className={`appearance-none bg-gray-100 border border-gray-300 rounded-md pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 ${!selectedSeason ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <option value="">All Competitions</option>
                {availableCompetitions.map(comp => (<option key={comp} value={comp}>{comp}</option>))}
              </select>
              <ChevronDown size={16} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            <button onClick={() => setIsAddModalOpen(true)} className="bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition flex items-center space-x-1 text-sm">
              <Plus size={16} /><span>Add Player</span>
            </button>
          </div>
        </div>

        {/* Player Stats Table - Updated to display G and A */}
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header Row (Unchanged) */}
            <div className="flex items-center border-b border-gray-200 pb-2 mb-2 text-xs font-medium text-gray-500 sticky top-0 bg-white z-10">
              <div className="w-1/4 pl-2">Player</div>
              <div className="w-1/12 text-center" title="Play Time">PT</div>
              <div className="w-1/12 text-center" title="Play Time per Game Attended">PT/G</div>
              <div className="w-1/12 text-center" title="Games Attended">GA</div>
              <div className="w-1/12 text-center" title="Games Played">GP</div>
              <div className="w-1/12 text-center" title="Starts">S</div>
              <div className="w-1/12 text-center" title="Goals">G</div>
              <div className="w-1/12 text-center" title="Assists">A</div>
              <div className="w-1/12 text-center" title="Yellow Cards">YC</div>
              <div className="w-1/12 text-center" title="Red Cards">RC</div>
            </div>

            {/* Player Rows */}
            <div className="space-y-1">
              {sortedPlayers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No players added yet.</p>
              ) : (
                sortedPlayers.map((player) => {
                  const stats = playerStatsMap.get(player.id) || { pt: 0, ga: 0, gp: 0, s: 0, g: 0, a: 0, yc: 0, rc: 0 };
                  const ptPerGame = stats.ga > 0 ? stats.pt / stats.ga : 0;

                  return (
                    <button key={player.id} onClick={() => handleEditPlayerClick(player)} className="flex items-center p-2 border-b last:border-b-0 w-full text-left hover:bg-gray-50 transition rounded text-sm">
                      {/* Player Info (Unchanged) */}
                      <div className="w-1/4 flex items-center space-x-2 pr-2">
                        <PlayerIcon player={player} showName={false} size="small" context="roster" />
                        <div className="flex-grow truncate">
                          <span className="font-medium">{player.firstName} {player.lastName}</span>
                          {player.number && <span className="text-xs text-gray-500 ml-1">#{player.number}</span>}
                        </div>
                      </div>
                      {/* Stats Columns - Display actual G and A */}
                      <div className="w-1/12 text-center">{formatPlayTime(stats.pt)}</div>
                      <div className="w-1/12 text-center">{formatPlayTime(ptPerGame)}</div>
                      <div className="w-1/12 text-center">{stats.ga}</div>
                      <div className="w-1/12 text-center">{stats.gp}</div>
                      <div className="w-1/12 text-center">{stats.s}</div>
                      <div className="w-1/12 text-center">{stats.g}</div> {/* Display Goal count */}
                      <div className="w-1/12 text-center">{stats.a}</div> {/* Display Assist count */}
                      {/* Placeholder YC/RC */}
                      <div className="w-1/12 text-center text-gray-400">{stats.yc}</div>
                      <div className="w-1/12 text-center text-gray-400">{stats.rc}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
         {/* Note about placeholder stats - Updated */}
         {sortedPlayers.length > 0 && (
            <p className="text-xs text-gray-500 mt-3 text-center">
                Note: Yellow Cards (YC) and Red Cards (RC) are currently placeholders.
            </p>
         )}
      </div>

      {/* Modals (Unchanged) */}
      <AddPlayerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAddPlayer={addPlayer} />
      <EditPlayerModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} player={playerToEdit} onUpdatePlayer={updatePlayer} onDeletePlayer={deletePlayer} />
    </div>
  );
};

export default TeamPage;
