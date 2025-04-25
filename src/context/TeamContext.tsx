import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number: string;
  location: 'bench' | 'field';
  position?: { x: number; y: number };
}

export interface PlayerLineupState {
  id: string;
  location: 'bench' | 'field' | 'inactive';
  position?: { x: number; y: number };
  playtimeSeconds: number;
  playtimerStartTime: number | null;
  isStarter?: boolean;
  subbedOnCount: number;
  subbedOffCount: number;
}

export type PlayerLineupStructure = Pick<PlayerLineupState, 'id' | 'location' | 'position'>;

// NEW: Game Event Type
export interface GameEvent {
  id: string; // Unique ID for the event
  type: 'goal'; // Currently only 'goal', could expand later (e.g., 'card')
  team: 'home' | 'away'; // Which team scored
  scorerPlayerId: string | null; // Player ID if tracked, null if just score increment
  assistPlayerId?: string | null; // Player ID if tracked
  timestamp: number; // Used for ordering and removal logic
}

export interface Game {
  id: string;
  opponent: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: 'home' | 'away';
  season?: string;
  competition?: string;
  homeScore?: number;
  awayScore?: number;
  timerStatus?: 'stopped' | 'running';
  timerStartTime?: number | null;
  timerElapsedSeconds?: number;
  isExplicitlyFinished?: boolean;
  lineup?: PlayerLineupState[] | null;
  // NEW: Array to store game events (goals, assists)
  events?: GameEvent[];
}

export interface SavedLineup {
  name: string;
  players: Pick<PlayerLineupState, 'id' | 'location' | 'position'>[];
}

export interface GameHistory {
  seasons: string[];
  competitions: string[];
}

interface TeamContextProps {
  teamName: string;
  setTeamName: (name: string) => void;
  teamLogo: string | null;
  setTeamLogo: (logo: string | null) => void;
  players: Player[];
  addPlayer: (firstName: string, lastName: string, number: string) => void;
  updatePlayer: (id: string, updates: Partial<Pick<Player, 'firstName' | 'lastName' | 'number'>>) => void;
  deletePlayer: (id: string) => void;
  games: Game[];
  addGame: (opponent: string, date: string, time: string, location: 'home' | 'away', season?: string, competition?: string) => void;
  updateGame: (id: string, updates: Partial<Omit<Game, 'id' | 'homeScore' | 'awayScore' | 'timerStatus' | 'timerStartTime' | 'timerElapsedSeconds' | 'isExplicitlyFinished' | 'lineup' | 'events'>>) => void; // Exclude events from simple update
  deleteGame: (id: string) => void;
  // updateGameScore: (gameId: string, homeScore: number, awayScore: number) => void; // Replaced by add/remove event
  startGameTimer: (gameId: string) => void;
  stopGameTimer: (gameId: string) => void;
  markGameAsFinished: (gameId: string) => void;
  resetGameLineup: (gameId: string) => PlayerLineupState[];
  movePlayerInGame: (
    gameId: string,
    playerId: string,
    sourceLocation: PlayerLineupState['location'],
    targetLocation: PlayerLineupState['location'],
    newPosition?: { x: number; y: number }
  ) => void;
  startPlayerTimerInGame: (gameId: string, playerId: string) => void;
  stopPlayerTimerInGame: (gameId: string, playerId: string) => void;
  movePlayer: (playerId: string, targetLocation: 'bench' | 'field', position?: { x: number; y: number }) => void;
  swapPlayers: (player1Id: string, player2Id: string) => void;
  savedLineups: SavedLineup[];
  saveLineup: (name: string) => void;
  loadLineup: (name: string) => boolean;
  deleteLineup: (name: string) => void;
  resetLineup: () => void;
  setCurrentPage: (page: string) => void;
  selectGame: (gameId: string) => void;
  gameHistory: GameHistory;
  getMostRecentSeason: () => string | undefined;
  getMostRecentCompetition: () => string | undefined;
  // NEW: Event handling functions
  addGameEvent: (gameId: string, team: 'home' | 'away', scorerPlayerId: string | null, assistPlayerId?: string | null) => void;
  removeLastGameEvent: (gameId: string, team: 'home' | 'away') => void;
}

// --- Context ---
export const TeamContext = createContext<TeamContextProps>({
  teamName: '', setTeamName: () => {},
  teamLogo: null, setTeamLogo: () => {},
  players: [], addPlayer: () => {}, updatePlayer: () => {}, deletePlayer: () => {},
  games: [], addGame: () => {}, updateGame: () => {}, deleteGame: () => {},
  // updateGameScore: () => {}, // Removed
  startGameTimer: () => {}, stopGameTimer: () => {}, markGameAsFinished: () => {},
  resetGameLineup: () => [],
  movePlayerInGame: () => {},
  startPlayerTimerInGame: () => {},
  stopPlayerTimerInGame: () => {},
  movePlayer: () => {}, swapPlayers: () => {},
  savedLineups: [], saveLineup: () => {}, loadLineup: () => false, deleteLineup: () => {}, resetLineup: () => {},
  setCurrentPage: () => { console.warn("Default setCurrentPage context function called."); },
  selectGame: () => { console.warn("Default selectGame context function called."); },
  gameHistory: { seasons: [], competitions: [] },
  getMostRecentSeason: () => undefined,
  getMostRecentCompetition: () => undefined,
  // NEW: Default event functions
  addGameEvent: () => { console.warn("Default addGameEvent context function called."); },
  removeLastGameEvent: () => { console.warn("Default removeLastGameEvent context function called."); },
});

// --- Provider ---
interface TeamProviderProps {
  children: ReactNode;
  setCurrentPage: (page: string) => void;
  selectGame: (gameId: string) => void;
}

const getCurrentDate = (): string => new Date().toISOString().split('T')[0];
const getCurrentTime = (): string => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

const createDefaultLineup = (players: Player[]): PlayerLineupState[] => {
    return players.map(p => ({
        id: p.id, location: 'bench', position: undefined, playtimeSeconds: 0, playtimerStartTime: null, isStarter: false, subbedOnCount: 0, subbedOffCount: 0,
    }));
};

// LocalStorage Helpers
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const storedValue = localStorage.getItem(key);
    if (!storedValue) return defaultValue;
    const parsedValue = JSON.parse(storedValue);

    // --- Game Data Validation ---
    if (key === 'games' && Array.isArray(parsedValue)) {
      return (parsedValue as any[]).map(g => {
        if (typeof g !== 'object' || g === null || !g.id) { console.warn(`Invalid game data (no id), skipping:`, g); return null; }
        const validLineup = Array.isArray(g.lineup) ? g.lineup.map((p: any) => {
          if (typeof p !== 'object' || p === null || !p.id) { console.warn(`Invalid player lineup data in game ${g.id}, skipping player:`, p); return null; }
          const location = ['field', 'bench', 'inactive'].includes(p.location) ? p.location : 'bench';
          return {
            id: p.id, location: location, position: p.position,
            playtimeSeconds: typeof p.playtimeSeconds === 'number' ? p.playtimeSeconds : 0,
            playtimerStartTime: typeof p.playtimerStartTime === 'number' ? p.playtimerStartTime : null,
            isStarter: typeof p.isStarter === 'boolean' ? p.isStarter : false,
            subbedOnCount: typeof p.subbedOnCount === 'number' ? p.subbedOnCount : 0,
            subbedOffCount: typeof p.subbedOffCount === 'number' ? p.subbedOffCount : 0,
          };
        }).filter(p => p !== null) : null;
        // NEW: Validate events array
        const validEvents = Array.isArray(g.events) ? g.events.map((ev: any) => {
            if (typeof ev !== 'object' || ev === null || !ev.id || ev.type !== 'goal' || !ev.team || typeof ev.timestamp !== 'number') {
                console.warn(`Invalid game event data in game ${g.id}, skipping event:`, ev); return null;
            }
            return {
                id: ev.id,
                type: 'goal',
                team: ['home', 'away'].includes(ev.team) ? ev.team : 'home', // Default to home if invalid
                scorerPlayerId: typeof ev.scorerPlayerId === 'string' ? ev.scorerPlayerId : null,
                assistPlayerId: typeof ev.assistPlayerId === 'string' ? ev.assistPlayerId : undefined, // Allow undefined if not present
                timestamp: ev.timestamp,
            };
        }).filter(ev => ev !== null) : []; // Default to empty array if not present or invalid

        return {
          id: g.id,
          opponent: typeof g.opponent === 'string' ? g.opponent : 'Unknown',
          date: typeof g.date === 'string' ? g.date : getCurrentDate(),
          time: typeof g.time === 'string' ? g.time : '',
          location: ['home', 'away'].includes(g.location) ? g.location : 'home',
          season: typeof g.season === 'string' ? g.season : '',
          competition: typeof g.competition === 'string' ? g.competition : '',
          homeScore: typeof g.homeScore === 'number' ? g.homeScore : 0,
          awayScore: typeof g.awayScore === 'number' ? g.awayScore : 0,
          timerStatus: ['stopped', 'running'].includes(g.timerStatus) ? g.timerStatus : 'stopped',
          timerStartTime: typeof g.timerStartTime === 'number' ? g.timerStartTime : null,
          timerElapsedSeconds: typeof g.timerElapsedSeconds === 'number' ? g.timerElapsedSeconds : 0,
          isExplicitlyFinished: typeof g.isExplicitlyFinished === 'boolean' ? g.isExplicitlyFinished : false,
          lineup: validLineup,
          events: validEvents, // Assign validated events
        };
      }).filter(g => g !== null) as T;
    }

    // --- Player Data Validation (Unchanged) ---
    if (key === 'players' && Array.isArray(parsedValue)) {
      return (parsedValue as any[]).map(p => {
        if (typeof p !== 'object' || p === null || !p.id) { console.warn(`Invalid player data (no id), skipping:`, p); return null; }
        return {
          id: p.id,
          firstName: typeof p.firstName === 'string' ? p.firstName : '',
          lastName: typeof p.lastName === 'string' ? p.lastName : '',
          number: typeof p.number === 'string' ? p.number : '',
          location: ['field', 'bench'].includes(p.location) ? p.location : 'bench',
          position: p.position,
        };
      }).filter(p => p !== null) as T;
    }

    // --- Game History Validation (Unchanged) ---
    if (key === 'gameHistory' && typeof parsedValue === 'object' && parsedValue !== null) {
        const seasons = Array.isArray(parsedValue.seasons)
            ? parsedValue.seasons.filter((s: any): s is string => typeof s === 'string' && s.trim() !== '')
            : [];
        const competitions = Array.isArray(parsedValue.competitions)
            ? parsedValue.competitions.filter((c: any): c is string => typeof c === 'string' && c.trim() !== '')
            : [];
        return { seasons, competitions } as T;
    }

    return parsedValue ?? defaultValue;
  } catch (error) {
    console.error(`Error reading/parsing localStorage key “${key}”:`, error);
    try { localStorage.removeItem(key); console.warn(`Removed potentially corrupted localStorage key "${key}".`); }
    catch (removeError) { console.error(`Failed to remove corrupted key "${key}":`, removeError); }
    return defaultValue;
  }
};

const saveToLocalStorage = <T,>(key: string, value: T): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) { console.error(`Error setting localStorage key “${key}”:`, error); }
};

export const TeamProvider: React.FC<TeamProviderProps> = ({ children, setCurrentPage, selectGame }) => {
  const [teamName, setTeamNameState] = useState<string>(() => loadFromLocalStorage('teamName', 'Your Team'));
  const [teamLogo, setTeamLogoState] = useState<string | null>(() => loadFromLocalStorage('teamLogo', null));
  const [players, setPlayersState] = useState<Player[]>(() => loadFromLocalStorage('players', []));
  const [games, setGamesState] = useState<Game[]>(() => loadFromLocalStorage('games', []));
  const [savedLineups, setSavedLineupsState] = useState<SavedLineup[]>(() => loadFromLocalStorage('savedLineups', []));
  const [gameHistory, setGameHistoryState] = useState<GameHistory>(() => loadFromLocalStorage('gameHistory', { seasons: [], competitions: [] }));

  useEffect(() => { saveToLocalStorage('teamName', teamName); }, [teamName]);
  useEffect(() => { saveToLocalStorage('teamLogo', teamLogo); }, [teamLogo]);
  useEffect(() => { saveToLocalStorage('players', players); }, [players]);
  useEffect(() => { saveToLocalStorage('games', games); }, [games]);
  useEffect(() => { saveToLocalStorage('savedLineups', savedLineups); }, [savedLineups]);
  useEffect(() => { saveToLocalStorage('gameHistory', gameHistory); }, [gameHistory]);

  const setTeamName = (name: string) => setTeamNameState(name);
  const setTeamLogo = (logo: string | null) => setTeamLogoState(logo);

  const addPlayer = (firstName: string, lastName: string, number: string) => {
    const newPlayer: Player = { id: uuidv4(), firstName, lastName, number, location: 'bench' };
    const currentPlayers = loadFromLocalStorage('players', []);
    setPlayersState([...currentPlayers, newPlayer]);
    setGamesState(prevGames => prevGames.map(game => ({
        ...game,
        lineup: game.lineup ? [
            ...game.lineup,
            { id: newPlayer.id, location: 'bench', position: undefined, playtimeSeconds: 0, playtimerStartTime: null, isStarter: false, subbedOnCount: 0, subbedOffCount: 0 }
        ] : createDefaultLineup([...currentPlayers, newPlayer])
    })));
  };

  const updatePlayer = (id: string, updates: Partial<Pick<Player, 'firstName' | 'lastName' | 'number'>>) => {
    setPlayersState((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePlayer = (id: string) => {
    setPlayersState((prev) => prev.filter(p => p.id !== id));
    setGamesState((prevGames) => prevGames.map(game => ({
        ...game,
        lineup: game.lineup ? game.lineup.filter(p => p.id !== id) : null,
        // Also remove player from events if they are deleted
        events: game.events ? game.events.filter(ev => ev.scorerPlayerId !== id && ev.assistPlayerId !== id) : [],
    })));
    setSavedLineupsState((prevSaved) => prevSaved.map(sl => ({
        ...sl, players: sl.players.filter(p => p.id !== id)
    })));
  };

  const updateHistory = (season?: string, competition?: string) => {
    setGameHistoryState(prev => {
        const newSeasons = [...prev.seasons];
        const newCompetitions = [...prev.competitions];
        if (season && season.trim()) { const trimmedSeason = season.trim(); const seasonIndex = newSeasons.indexOf(trimmedSeason); if (seasonIndex > -1) newSeasons.splice(seasonIndex, 1); newSeasons.unshift(trimmedSeason); }
        if (competition && competition.trim()) { const trimmedCompetition = competition.trim(); const compIndex = newCompetitions.indexOf(trimmedCompetition); if (compIndex > -1) newCompetitions.splice(compIndex, 1); newCompetitions.unshift(trimmedCompetition); }
        return { seasons: newSeasons, competitions: newCompetitions };
    });
  };

  const addGame = (opponent: string, date: string, time: string, location: 'home' | 'away', season?: string, competition?: string) => {
    const currentPlayers = loadFromLocalStorage('players', []);
    const newGame: Game = {
        id: uuidv4(), opponent, date, time, location,
        season: season?.trim() || '', competition: competition?.trim() || '',
        homeScore: 0, awayScore: 0, timerStatus: 'stopped', timerStartTime: null, timerElapsedSeconds: 0,
        isExplicitlyFinished: false,
        lineup: createDefaultLineup(currentPlayers),
        events: [], // Initialize events array
    };
    setGamesState((prev) => [...prev, newGame].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    updateHistory(season, competition);
  };

  const updateGame = (id: string, updates: Partial<Omit<Game, 'id' | 'homeScore' | 'awayScore' | 'timerStatus' | 'timerStartTime' | 'timerElapsedSeconds' | 'isExplicitlyFinished' | 'lineup' | 'events'>>) => {
    let seasonToUpdateHistory: string | undefined = undefined;
    let competitionToUpdateHistory: string | undefined = undefined;
    setGamesState((prev) => prev.map((g) => {
        if (g.id === id) {
            const finalUpdates = { ...updates };
            if (typeof updates.season === 'string') { finalUpdates.season = updates.season.trim(); seasonToUpdateHistory = finalUpdates.season; } else { seasonToUpdateHistory = g.season; }
            if (typeof updates.competition === 'string') { finalUpdates.competition = updates.competition.trim(); competitionToUpdateHistory = finalUpdates.competition; } else { competitionToUpdateHistory = g.competition; }
            return { ...g, ...finalUpdates };
        } return g;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    if (seasonToUpdateHistory !== undefined || competitionToUpdateHistory !== undefined) { updateHistory(seasonToUpdateHistory, competitionToUpdateHistory); }
  };

  const deleteGame = (id: string) => { setGamesState((prev) => prev.filter(g => g.id !== id)); };

  // --- NEW: addGameEvent ---
  const addGameEvent = (gameId: string, team: 'home' | 'away', scorerPlayerId: string | null, assistPlayerId?: string | null) => {
    const newEvent: GameEvent = {
        id: uuidv4(),
        type: 'goal',
        team: team,
        scorerPlayerId: scorerPlayerId,
        assistPlayerId: assistPlayerId,
        timestamp: Date.now(),
    };
    setGamesState(prevGames => prevGames.map(game => {
        if (game.id === gameId) {
            const updatedEvents = [...(game.events || []), newEvent];
            const newHomeScore = team === 'home' ? (game.homeScore ?? 0) + 1 : (game.homeScore ?? 0);
            const newAwayScore = team === 'away' ? (game.awayScore ?? 0) + 1 : (game.awayScore ?? 0);
            return { ...game, events: updatedEvents, homeScore: newHomeScore, awayScore: newAwayScore };
        }
        return game;
    }));
  };

  // --- NEW: removeLastGameEvent ---
  const removeLastGameEvent = (gameId: string, team: 'home' | 'away') => {
    setGamesState(prevGames => prevGames.map(game => {
        if (game.id === gameId) {
            const events = game.events || [];
            // Find the index of the last event for the specified team
            let lastEventIndex = -1;
            for (let i = events.length - 1; i >= 0; i--) {
                if (events[i].team === team) {
                    lastEventIndex = i;
                    break;
                }
            }

            if (lastEventIndex !== -1) {
                const updatedEvents = [...events];
                updatedEvents.splice(lastEventIndex, 1); // Remove the last event

                const newHomeScore = team === 'home' ? Math.max(0, (game.homeScore ?? 0) - 1) : (game.homeScore ?? 0);
                const newAwayScore = team === 'away' ? Math.max(0, (game.awayScore ?? 0) - 1) : (game.awayScore ?? 0);

                return { ...game, events: updatedEvents, homeScore: newHomeScore, awayScore: newAwayScore };
            }
        }
        return game;
    }));
  };

  // --- Game Timer (Unchanged) ---
  const startGameTimer = (gameId: string) => {
    const now = Date.now(); const currentDate = getCurrentDate(); const currentTime = getCurrentTime();
    setGamesState((prev) => prev.map((g) => {
        if (g.id === gameId && !g.isExplicitlyFinished) {
          const updates: Partial<Game> = {};
          if (g.date !== currentDate) updates.date = currentDate;
          if (g.time !== currentTime) updates.time = currentTime;
          const isStartingFresh = (g.timerElapsedSeconds ?? 0) === 0;
          const newLineup = g.lineup?.map(p => {
              const isFieldPlayer = p.location === 'field';
              return { ...p, playtimerStartTime: isFieldPlayer ? now : p.playtimerStartTime, isStarter: isStartingFresh ? isFieldPlayer : (p.isStarter ?? false) };
          }) ?? null;
          return { ...g, ...updates, timerStatus: 'running', timerStartTime: now, isExplicitlyFinished: false, lineup: newLineup };
        } return g;
      })
    );
  };
  const stopGameTimer = (gameId: string) => {
    const now = Date.now();
    setGamesState((prev) => prev.map((g) => {
        if (g.id === gameId && g.timerStatus === 'running' && g.timerStartTime) {
          const elapsed = (now - g.timerStartTime) / 1000;
          const newElapsedSeconds = Math.round((g.timerElapsedSeconds || 0) + elapsed);
          const newLineup = g.lineup?.map(p => {
              if ((p.location === 'field' || p.location === 'inactive') && p.playtimerStartTime) {
                  const playerElapsed = (now - p.playtimerStartTime) / 1000;
                  const currentPlaytime = typeof p.playtimeSeconds === 'number' ? p.playtimeSeconds : 0;
                  const newPlaytime = Math.round(currentPlaytime + playerElapsed);
                  return { ...p, playtimeSeconds: newPlaytime, playtimerStartTime: null };
              } return p;
          }) ?? null;
          return { ...g, timerStatus: 'stopped', timerStartTime: null, timerElapsedSeconds: newElapsedSeconds, lineup: newLineup };
        } return g;
      })
    );
  };
  const markGameAsFinished = (gameId: string) => {
     const now = Date.now();
     setGamesState((prev) => prev.map((g) => {
         if (g.id === gameId) {
           let finalElapsedSeconds = g.timerElapsedSeconds ?? 0;
           let finalLineup = g.lineup;
           if (g.timerStatus === 'running' && g.timerStartTime) {
             const elapsed = (now - g.timerStartTime) / 1000;
             finalElapsedSeconds = Math.round((g.timerElapsedSeconds || 0) + elapsed);
             finalLineup = g.lineup?.map(p => {
                 if ((p.location === 'field' || p.location === 'inactive') && p.playtimerStartTime) {
                     const playerElapsed = (now - p.playtimerStartTime) / 1000;
                     const currentPlaytime = typeof p.playtimeSeconds === 'number' ? p.playtimeSeconds : 0;
                     const newPlaytime = Math.round(currentPlaytime + playerElapsed);
                     return { ...p, playtimeSeconds: newPlaytime, playtimerStartTime: null };
                 } return p;
             }) ?? null;
           }
           return { ...g, timerStatus: 'stopped', timerStartTime: null, timerElapsedSeconds: finalElapsedSeconds, isExplicitlyFinished: true, lineup: finalLineup };
         } return g;
       })
     );
   };

   // --- Player Timer (Unchanged) ---
   const startPlayerTimerInGame = (gameId: string, playerId: string) => {
       const now = Date.now();
       setGamesState(prevGames => prevGames.map(game => {
           if (game.id === gameId && game.lineup && game.timerStatus === 'running') {
               const newLineup = game.lineup.map(p => {
                   if (p.id === playerId && p.location === 'field' && !p.playtimerStartTime) {
                       return { ...p, playtimerStartTime: now };
                   } return p;
                });
               return { ...game, lineup: newLineup };
           } return game;
       }));
   };
   const stopPlayerTimerInGame = (gameId: string, playerId: string) => {
       const now = Date.now();
       setGamesState(prevGames => {
           const gameIndex = prevGames.findIndex(g => g.id === gameId);
           if (gameIndex === -1 || !prevGames[gameIndex].lineup) return prevGames;
           const game = prevGames[gameIndex];
           let playerUpdated = false;
           const newLineup = game.lineup.map(p => {
               if (p.id === playerId && p.playtimerStartTime) {
                   const elapsed = (now - p.playtimerStartTime) / 1000;
                   const currentPlaytime = typeof p.playtimeSeconds === 'number' ? p.playtimeSeconds : 0;
                   const newPlaytime = Math.round(currentPlaytime + elapsed);
                   playerUpdated = true;
                   return { ...p, playtimeSeconds: newPlaytime, playtimerStartTime: null };
               } return p;
           });
           if (playerUpdated) {
               const updatedGames = [...prevGames];
               updatedGames[gameIndex] = { ...game, lineup: newLineup };
               return updatedGames;
           } return prevGames;
       });
   };

   // --- Game Lineup (Unchanged) ---
   const resetGameLineup = (gameId: string): PlayerLineupState[] => {
       const currentPlayers = loadFromLocalStorage('players', []);
       const defaultLineup = createDefaultLineup(currentPlayers);
       setGamesState((prevGames) => prevGames.map(game => game.id === gameId ? { ...game, lineup: defaultLineup } : game));
       return defaultLineup;
   };
   const movePlayerInGame = (gameId: string, playerId: string, sourceLocation: PlayerLineupState['location'], targetLocation: PlayerLineupState['location'], newPosition?: { x: number; y: number }) => {
    const now = Date.now();
    setGamesState(prevGames => {
      const gameIndex = prevGames.findIndex(g => g.id === gameId);
      if (gameIndex === -1 || !prevGames[gameIndex].lineup) return prevGames;
      const game = prevGames[gameIndex];
      const isGameRunning = game.timerStatus === 'running';
      let newLineup = [...game.lineup];
      const playerIndex = newLineup.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return prevGames;
      const playerState = { ...newLineup[playerIndex] };
      let updatedPlaytime = playerState.playtimeSeconds;
      let updatedStartTime = playerState.playtimerStartTime;
      if ((sourceLocation === 'field' || sourceLocation === 'inactive') && playerState.playtimerStartTime) {
        const elapsed = (now - playerState.playtimerStartTime) / 1000;
        updatedPlaytime = Math.round(playerState.playtimeSeconds + elapsed);
        updatedStartTime = null;
      }
      if (targetLocation === 'field' && isGameRunning && updatedStartTime === null) {
        updatedStartTime = now;
      } else if (targetLocation !== 'field') {
        updatedStartTime = null;
      }
      let updatedSubbedOnCount = playerState.subbedOnCount;
      let updatedSubbedOffCount = playerState.subbedOffCount;
      if (sourceLocation === 'bench' && targetLocation === 'field') updatedSubbedOnCount++;
      else if (sourceLocation === 'field' && targetLocation === 'bench') updatedSubbedOffCount++;
      playerState.location = targetLocation;
      playerState.position = targetLocation === 'field' ? newPosition : undefined;
      playerState.playtimeSeconds = updatedPlaytime;
      playerState.playtimerStartTime = updatedStartTime;
      playerState.subbedOnCount = updatedSubbedOnCount;
      playerState.subbedOffCount = updatedSubbedOffCount;
      newLineup[playerIndex] = playerState;
      const updatedGames = [...prevGames];
      updatedGames[gameIndex] = { ...game, lineup: newLineup };
      return updatedGames;
    });
  };

  // --- Global Lineup (Unchanged) ---
  const movePlayer = (playerId: string, targetLocation: 'bench' | 'field', position?: { x: number; y: number }) => { setPlayersState((prev) => prev.map((p) => p.id === playerId ? { ...p, location: targetLocation, position: targetLocation === 'field' ? position : undefined } : p)); };
  const swapPlayers = (player1Id: string, player2Id: string) => { setPlayersState((prev) => { const p1 = prev.find(p => p.id === player1Id); const p2 = prev.find(p => p.id === player2Id); if (!p1 || !p2) return prev; if (p1.location === 'field' && p2.location === 'field') { const p1Pos = p1.position; const p2Pos = p2.position; return prev.map((p) => { if (p.id === player1Id) return { ...p, position: p2Pos }; if (p.id === player2Id) return { ...p, position: p1Pos }; return p; }); } if (p1.location !== p2.location) { const p1NewLocation = p2.location; const p1NewPosition = p2.position; const p2NewLocation = p1.location; const p2NewPosition = p1.position; return prev.map((p) => { if (p.id === player1Id) return { ...p, location: p1NewLocation, position: p1NewPosition }; if (p.id === player2Id) return { ...p, location: p2NewLocation, position: p2NewPosition }; return p; }); } return prev; }); };
  const saveLineup = (name: string) => { if (!name.trim()) { alert("Please enter a name."); return; } const lineupToSave: SavedLineup = { name: name.trim(), players: players.map(({ id, location, position }) => ({ id, location, position })), }; setSavedLineupsState((prev) => { const filtered = prev.filter(l => l.name !== lineupToSave.name); return [...filtered, lineupToSave]; }); };
  const loadLineup = (name: string): boolean => { const lineupToLoad = savedLineups.find(l => l.name === name); if (!lineupToLoad) { console.error(`Lineup "${name}" not found.`); return false; } setPlayersState((currentPlayers) => { const savedPlayerStates = new Map( lineupToLoad.players.map(p => [p.id, { location: p.location, position: p.position }]) ); return currentPlayers.map(player => { const savedState = savedPlayerStates.get(player.id); return savedState ? { ...player, location: savedState.location, position: savedState.position } : { ...player, location: 'bench', position: undefined }; }); }); return true; };
  const deleteLineup = (name: string) => { setSavedLineupsState((prev) => prev.filter(l => l.name !== name)); };
  const resetLineup = () => { setPlayersState((prev) => prev.map(p => ({ ...p, location: 'bench', position: undefined }))); };

  // --- History Getters (Unchanged) ---
  const getMostRecentSeason = (): string | undefined => gameHistory.seasons[0];
  const getMostRecentCompetition = (): string | undefined => gameHistory.competitions[0];

  const contextValue: TeamContextProps = {
    teamName, setTeamName, teamLogo, setTeamLogo,
    players, addPlayer, updatePlayer, deletePlayer,
    games, addGame, updateGame, deleteGame,
    // updateGameScore, // Removed
    startGameTimer, stopGameTimer, markGameAsFinished,
    resetGameLineup, movePlayerInGame, startPlayerTimerInGame, stopPlayerTimerInGame,
    movePlayer, swapPlayers,
    savedLineups, saveLineup, loadLineup, deleteLineup, resetLineup,
    setCurrentPage, selectGame,
    gameHistory, getMostRecentSeason, getMostRecentCompetition,
    // NEW: Provide event functions
    addGameEvent, removeLastGameEvent,
  };

  return <TeamContext.Provider value={contextValue}>{children}</TeamContext.Provider>;
};
