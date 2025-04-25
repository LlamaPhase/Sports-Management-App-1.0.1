import React, { useState, useContext, useEffect, useMemo, useRef } from 'react'; // Added useRef
import { Plus, Shield } from 'lucide-react';
import { TeamContext, Game } from '../context/TeamContext';
import AddGameModal from '../components/AddGameModal';
import TeamDisplay from '../components/TeamDisplay';

const SchedulePage: React.FC = () => {
  const { games, addGame, teamName, teamLogo, selectGame } = useContext(TeamContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const ongoingSectionRef = useRef<HTMLDivElement>(null); // Ref for scrolling to Ongoing
  const upcomingSectionRef = useRef<HTMLDivElement>(null); // Ref for scrolling to Upcoming

  const now = useMemo(() => new Date(), []); // Memoize 'now' as well if it doesn't need to update frequently

  // Categorize games - Updated Logic & Dependency
  const { ongoingGames, upcomingGames, previousGames } = useMemo(() => {
    console.log("Recalculating game categories..."); // Debug log
    const ongoing: Game[] = [];
    const upcoming: Game[] = [];
    const previous: Game[] = [];
    const validGames = games || []; // Derive inside useMemo or ensure games is always an array

    validGames.forEach(game => {
      const gameDateTime = new Date(`${game.date}T${game.time || '00:00'}`);
      const isExplicitlyFinished = game.isExplicitlyFinished === true;
      const isRunning = game.timerStatus === 'running';
      const isPaused = game.timerStatus === 'stopped' && (game.timerElapsedSeconds ?? 0) > 0 && !isExplicitlyFinished;
      const isNotStarted = game.timerStatus === 'stopped' && (game.timerElapsedSeconds ?? 0) === 0 && !isExplicitlyFinished;

      // Log game state for debugging
      // console.log(`Game ${game.id}: Status=${game.timerStatus}, Elapsed=${game.timerElapsedSeconds}, Finished=${isExplicitlyFinished}, isRunning=${isRunning}, isPaused=${isPaused}, isNotStarted=${isNotStarted}`);

      if (isRunning || isPaused) {
        // console.log(` -> Categorized as ONGOING`);
        ongoing.push(game);
      } else if (isNotStarted && gameDateTime >= now) {
        // console.log(` -> Categorized as UPCOMING`);
        upcoming.push(game);
      } else {
        // console.log(` -> Categorized as PREVIOUS`);
        previous.push(game);
      }
    });

    // Sort sections by date, oldest first (ascending)
    const sortByDateAsc = (a: Game, b: Game) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime();

    ongoing.sort(sortByDateAsc);
    upcoming.sort(sortByDateAsc);
    previous.sort(sortByDateAsc);

    return { ongoingGames: ongoing, upcomingGames: upcoming, previousGames: previous };
  // Explicitly depend on the 'games' array from context
  }, [games, now]);

  // Scroll to Ongoing section on load if it exists, otherwise scroll to Upcoming
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ongoingGames.length > 0 && ongoingSectionRef.current) {
        ongoingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (upcomingGames.length > 0 && upcomingSectionRef.current) {
        // Fallback to upcoming if no ongoing games
        upcomingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100); // 100ms delay

    return () => clearTimeout(timer); // Cleanup timeout on unmount or change
  // Depend on both ongoing and upcoming games length to trigger scroll logic correctly
  }, [ongoingGames.length, upcomingGames.length]);


  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + 'T00:00:00');
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString || !timeString.includes(':')) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      if (isNaN(date.getTime())) return "Invalid Time";
      return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      console.error("Error formatting time:", timeString, e);
      return "Invalid Time";
    }
  };

  // GameRow component
  const GameRow: React.FC<{ game: Game; status: 'previous' | 'ongoing' | 'upcoming' }> = ({ game, status }) => {
    const currentTeamName = teamName || 'Your Team';
    // Determine home and away team details based on game location
    const isUserHome = game.location === 'home';
    const homeTeam = isUserHome ? { name: currentTeamName, logo: teamLogo } : { name: game.opponent, logo: null };
    const awayTeam = !isUserHome ? { name: currentTeamName, logo: teamLogo } : { name: game.opponent, logo: null };

    const scoreHome = game.homeScore ?? 0;
    const scoreAway = game.awayScore ?? 0;
    const scoreAvailable = typeof game.homeScore === 'number';
    // Use explicit flag to determine if game is finished for display purposes
    const isFinished = game.isExplicitlyFinished === true;

    // Determine result and score color
    const userScore = isUserHome ? scoreHome : scoreAway;
    const opponentScore = isUserHome ? scoreAway : scoreHome;
    const isWin = userScore > opponentScore;
    const isLoss = userScore < opponentScore;
    const isDraw = userScore === opponentScore;

    let scoreBg = 'bg-gray-400'; // Default for previous (Draw or score not available)
    let scoreColorOngoing = 'text-gray-600'; // Default for ongoing (Draw)

    // Color logic for previous games now relies on isFinished flag
    if (status === 'previous' && scoreAvailable && isFinished) {
        if (isWin) scoreBg = 'bg-green-500';
        else if (isLoss) scoreBg = 'bg-red-500';
    } else if (status === 'ongoing' && scoreAvailable) { // Ongoing color logic remains the same
        if (isWin) scoreColorOngoing = 'text-green-600';
        else if (isLoss) scoreColorOngoing = 'text-red-600';
    }

    // Determine what to display between teams
    let middleText: React.ReactNode;
    // Adjusted middleClass: removed fixed width, added margin for spacing
    let middleClass = "text-sm font-semibold text-gray-700 px-2 mx-2 flex-shrink-0 text-center";

    if (status === 'ongoing') {
        middleText = `${scoreHome} - ${scoreAway}`;
        // Adjusted middleClass for ongoing: removed fixed width, added margin
        middleClass = `text-sm font-bold ${scoreColorOngoing} px-2 mx-2 flex-shrink-0 text-center`;
    } else if (status === 'previous' && scoreAvailable && isFinished) { // Check isFinished here
        middleText = (
            <span className={`px-2 py-0.5 rounded text-white text-xs font-bold ${scoreBg}`}>
                {scoreHome} - {scoreAway}
            </span>
        );
        // Adjusted middleClass for previous: removed fixed width, added margin, kept flex for centering span
        middleClass = "text-sm font-semibold px-2 mx-2 flex-shrink-0 text-center flex justify-center items-center";
    } else if (status === 'upcoming' && game.time) {
        middleText = formatTime(game.time);
    } else { // Default for previous games without score or upcoming without time
        middleText = 'vs';
    }

    return (
      <button
        onClick={() => selectGame(game.id)}
        className={`w-full text-left py-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition rounded ${status === 'previous' ? 'opacity-70' : ''}`}
      >
        <p className="text-sm text-gray-500 mb-2 text-center">
          {formatDate(game.date)}
        </p>
        {/* Updated flex layout: Removed space-x-2, using margins on middle element */}
        <div className="flex justify-between items-center px-2">
          {/* Home Team Display (Image + Name) */}
          <TeamDisplay
            name={homeTeam.name}
            logo={homeTeam.logo}
            isOpponentTeam={!isUserHome} // True if the home team is the opponent
            // Removed flex-1, added width constraint to prevent excessive growth
            className="w-2/5 justify-end text-right"
          />
          {/* Middle Text (Time/Score/vs) */}
          <span className={`${middleClass}`}>
            {middleText}
          </span>
          {/* Away Team Display (Name + Image) */}
          <TeamDisplay
            name={awayTeam.name}
            logo={awayTeam.logo}
            isOpponentTeam={isUserHome} // True if the away team is the opponent
             // Removed flex-1, added width constraint to prevent excessive growth
            className="w-2/5 justify-start text-left"
          />
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setIsModalOpen(true)} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition flex items-center space-x-1">
          <Plus size={18} />
          <span>Add Game</span>
        </button>
      </div>

      {/* Previous Games Section - Moved to top */}
      {previousGames.length > 0 && (
         <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Previous</h2>
           <div className="space-y-0">
            {previousGames.map((game) => <GameRow key={game.id} game={game} status="previous" />)}
          </div>
        </div>
      )}

      {/* Ongoing Games Section - Added ref and id */}
      {ongoingGames.length > 0 && (
        <div ref={ongoingSectionRef} id="ongoing-games" className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500 scroll-mt-16"> {/* Added scroll-mt */}
          <h2 className="text-xl font-semibold mb-2 text-red-600">Ongoing</h2>
          <div className="space-y-0">
            {ongoingGames.map((game) => <GameRow key={game.id} game={game} status="ongoing" />)}
          </div>
        </div>
      )}

      {/* Upcoming Games Section - Moved to bottom, added ref and id */}
      {upcomingGames.length > 0 && (
        <div ref={upcomingSectionRef} id="upcoming-games" className="bg-white p-4 rounded-lg shadow scroll-mt-16"> {/* Added scroll-mt */}
          <h2 className="text-xl font-semibold mb-2">Upcoming</h2>
          <div className="space-y-0">
            {upcomingGames.map((game) => <GameRow key={game.id} game={game} status="upcoming" />)}
          </div>
        </div>
      )}


       {/* No Games Message */}
       {(games || []).length === 0 && ( // Check original games array length
         <div className="bg-white p-4 rounded-lg shadow text-center text-gray-500">
           No games scheduled yet.
         </div>
       )}

      <AddGameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddGame={addGame}
      />
    </div>
  );
};

export default SchedulePage;
