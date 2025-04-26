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
  // NEW: Store initial position for post-game display
  initialPosition?: { x: number; y: number };
  playtimeSeconds: number;
  playtimerStartTime: number | null;
  isStarter?: boolean; // Flag to indicate if player was part of the starting lineup (field or bench)
  subbedOnCount: number;
  subbedOffCount: number;
}

export type PlayerLineupStructure = Pick<PlayerLineupState, 'id' | 'location' | 'position'>;

// UPDATED: Game Event Type
export interface GameEvent {
  id: string; // Unique ID for the event
  // UPDATED: Event types
  type: 'goal' | 'substitution'; // | 'yellow_card' | 'red_card'; // Deferring cards
  team: 'home' | 'away'; // Which team scored (for goals) or whose player was involved (for subs)
  // Goal specific
  scorerPlayerId?: string | null;
  assistPlayerId?: string | null;
  // Substitution specific
  playerInId?: string;
  playerOutId?: string;
  // Card specific (Deferred)
  // cardPlayerId?: string;
  // cardType?: 'yellow' | 'red';
  timestamp: number; // Used for ordering if seconds are identical
  // NEW: Store game seconds at the time of the event
  gameSeconds: number;
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
  // UPDATED: Lineup state includes initialPosition and isStarter
  lineup?: PlayerLineupState[] | null;
  // UPDATED: Events store gameSeconds and new types
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
  updateGame: (id: string, updates: Partial<Omit<Game, 'id' | 'homeScore' | 'awayScore' | 'timerStatus' | 'timerStartTime' | 'timerElapsedSeconds' | 'isExplicitlyFinished' | 'lineup' | 'events'>>) => void;
  deleteGame: (id: string) => void;
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
  // UPDATED: Event handling functions signature might change if needed
  addGameEvent: (gameId: string, team: 'home' | 'away', scorerPlayerId: string | null, assistPlayerId?: string | null) => void;
  removeLastGameEvent: (gameId: string, team: 'home' | 'away') => void;
  // addCardEvent: (gameId: string, playerId: string, cardType: 'yellow' | 'red') => void; // Deferred
}

// --- Context ---
export const TeamContext = createContext<TeamContextProps>({
  teamName: '', setTeamName: () => {},
  teamLogo: null, setTeamLogo: () => {},
  players: [], addPlayer: () => {}, updatePlayer: () => {}, deletePlayer: () => {},
  games: [], addGame: () => {}, updateGame: () => {}, deleteGame: () => {},
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
  addGameEvent: () => { console.warn("Default addGameEvent context function called."); },
  removeLastGameEvent: () => { console.warn("Default removeLastGameEvent context function called."); },
  // addCardEvent: () => { console.warn("Default addCardEvent context function called."); }, // Deferred
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
        id: p.id, location: 'bench', position: undefined, initialPosition: undefined, // Initialize initialPosition
        playtimeSeconds: 0, playtimerStartTime: null, isStarter: false, subbedOnCount: 0, subbedOffCount: 0,
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
            initialPosition: p.initialPosition, // Load initialPosition
            playtimeSeconds: typeof p.playtimeSeconds === 'number' ? p.playtimeSeconds : 0,
            playtimerStartTime: typeof p.playtimerStartTime === 'number' ? p.playtimerStartTime : null,
            isStarter: typeof p.isStarter === 'boolean' ? p.isStarter : false, // Load isStarter
            subbedOnCount: typeof p.subbedOnCount === 'number' ? p.subbedOnCount : 0,
            subbedOffCount: typeof p.subbedOffCount === 'number' ? p.subbedOffCount : 0,
          };
        }).filter(p => p !== null) : null;
        // UPDATED: Validate events array with new fields/types
        const validEvents = Array.isArray(g.events) ? g.events.map((ev: any) => {
            if (typeof ev !== 'object' || ev === null || !ev.id || !ev.type || !ev.team || typeof ev.timestamp !== 'number' || typeof ev.gameSeconds !== 'number') {
                console.warn(`Invalid game event data in game ${g.id}, skipping event:`, ev); return null;
            }
            const baseEvent = {
                id: ev.id,
                type: ev.type,
                team: ['home', 'away'].includes(ev.team) ? ev.team : 'home',
                timestamp: ev.timestamp,
                gameSeconds: ev.gameSeconds,
            };
            if (ev.type === 'goal') {
                return {
                    ...baseEvent,
                    scorerPlayerId: typeof ev.scorerPlayerId === 'string' ? ev.scorerPlayerId : null,
                    assistPlayerId: typeof ev.assistPlayerId === 'string' ? ev.assistPlayerId : undefined,
                };
            } else if (ev.type === 'substitution') {
                 return {
                    ...baseEvent,
                    playerInId: typeof ev.playerInId === 'string' ? ev.playerInId : undefined,
                    playerOutId: typeof ev.playerOutId === 'string' ? ev.playerOutId : undefined,
                };
            }
            // Add card validation here if implemented later
            else {
                 console.warn(`Unknown event type "${ev.type}" in game ${g.id}, skipping event:`, ev);
                 return null;
            }
        }).filter(ev => ev !== null) : [];

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
          events: validEvents,
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
            { id: newPlayer.id, location: 'bench', position: undefined, initialPosition: undefined, playtimeSeconds: 0, playtimerStartTime: null, isStarter: false, subbedOnCount: 0, subbedOffCount: 0 }
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
        events: game.events ? game.events.filter(ev => ev.scorerPlayerId !== id && ev.assistPlayerId !== id && ev.playerInId !== id && ev.playerOutId !== id) : [],
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
        events: [],
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

  // --- UPDATED: addGameEvent (Goal) ---
  const addGameEvent = (gameId: string, team: 'home' | 'away', scorerPlayerId: string | null, assistPlayerId?: string | null) => {
    setGamesState(prevGames => {
        const gameIndex = prevGames.findIndex(g => g.id === gameId);
        if (gameIndex === -1) return prevGames;
        const game = prevGames[gameIndex];

        // Calculate current game seconds
        let currentSeconds = game.timerElapsedSeconds ?? 0;
        if (game.timerStatus === 'running' && game.timerStartTime) {
            currentSeconds += (Date.now() - game.timerStartTime) / 1000;
        }

        const newEvent: GameEvent = {
            id: uuidv4(),
            type: 'goal',
            team: team,
            scorerPlayerId: scorerPlayerId,
            assistPlayerId: assistPlayerId,
            timestamp: Date.now(),
            gameSeconds: Math.round(currentSeconds), // Store rounded seconds
        };

        const updatedEvents = [...(game.events || []), newEvent];
        const newHomeScore = team === 'home' ? (game.homeScore ?? 0) + 1 : (game.homeScore ?? 0);
        const newAwayScore = team === 'away' ? (game.awayScore ?? 0) + 1 : (game.awayScore ?? 0);

        const updatedGames = [...prevGames];
        updatedGames[gameIndex] = { ...game, events: updatedEvents, homeScore: newHomeScore, awayScore: newAwayScore };
        return updatedGames;
    });
  };

  // --- UPDATED: removeLastGameEvent ---
  const removeLastGameEvent = (gameId: string, team: 'home' | 'away') => {
    setGamesState(prevGames => {
        const gameIndex = prevGames.findIndex(g => g.id === gameId);
        if (gameIndex === -1) return prevGames;
        const game = prevGames[gameIndex];
        const events = game.events || [];

        // Find the index of the last GOAL event for the specified team
        let lastGoalEventIndex = -1;
        for (let i = events.length - 1; i >= 0; i--) {
            if (events[i].type === 'goal' && events[i].team === team) {
                lastGoalEventIndex = i;
                break;
            }
        }

        if (lastGoalEventIndex !== -1) {
            const updatedEvents = [...events];
            updatedEvents.splice(lastGoalEventIndex, 1); // Remove the last goal event

            const newHomeScore = team === 'home' ? Math.max(0, (game.homeScore ?? 0) - 1) : (game.homeScore ?? 0);
            const newAwayScore = team === 'away' ? Math.max(0, (game.awayScore ?? 0) - 1) : (game.awayScore ?? 0);

            const updatedGames = [...prevGames];
            updatedGames[gameIndex] = { ...game, events: updatedEvents, homeScore: newHomeScore, awayScore: newAwayScore };
            return updatedGames;
        }
        // If no goal event found for that team, do nothing
        return prevGames;
    });
  };

  // --- UPDATED: Game Timer ---
  const startGameTimer = (gameId: string) => {
    const now = Date.now(); const currentDate = getCurrentDate(); const currentTime = getCurrentTime();
    setGamesState((prev) => prev.map((g) => {
        if (g.id === gameId && !g.isExplicitlyFinished) {
          const updates: Partial<Game> = {};
          if (g.date !== currentDate) updates.date = currentDate;
          if (g.time !== currentTime) updates.time = currentTime;
          // Determine if this is the very first time the timer is starting
          const isStartingFresh = (g.timerElapsedSeconds ?? 0) === 0 && !g.timerStartTime;

          const newLineup = g.lineup?.map(p => {
              const isFieldPlayer = p.location === 'field';
              // Store initial position and starter status only when starting fresh
              const initialPosition = isStartingFresh && isFieldPlayer ? p.position : p.initialPosition;
              // Set isStarter flag only when starting fresh (based on initial field/bench location)
              const isStarter = isStartingFresh ? (p.location === 'field' || p.location === 'bench') : (p.isStarter ?? false);

              return {
                  ...p,
                  playtimerStartTime: isFieldPlayer ? now : p.playtimerStartTime, // Start timer only for field players
                  isStarter: isStarter, // Set starter flag
                  initialPosition: initialPosition, // Set initial position (only if starting fresh & on field)
              };
          }) ?? null;
          return { ...g, ...updates, timerStatus: 'running', timerStartTime: now, isExplicitlyFinished: false, lineup: newLineup };
        } return g;
      })
    );
  };
  // stopGameTimer and markGameAsFinished remain unchanged in their core logic
  const stopGameTimer = (gameId: string) => {
    const now = Date.now();
    setGamesState((prev) => prev.map((g) => {
        if (g.id === gameId && g.timerStatus === 'running' && g.timerStartTime) {
          const elapsed = (now - g.timerStartTime) / 1000;
          const newElapsedSeconds = Math.round((g.timerElapsedSeconds || 0) + elapsed);
          const newLineup = g.lineup?.map(p => {
              // Stop timer for players currently on field OR inactive (if they were moved there while timer ran)
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
           // If timer was running when finished, stop it and update times
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
           // Ensure all player timers are nullified even if game was paused
           finalLineup = finalLineup?.map(p => ({ ...p, playtimerStartTime: null })) ?? null;

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
       setGamesState((prevGames) => prevGames.map(game => game.id === gameId ? { ...game, lineup: defaultLineup, timerElapsedSeconds: 0, timerStartTime: null, timerStatus: 'stopped', isExplicitlyFinished: false, homeScore: 0, awayScore: 0, events: [] } : game)); // Also reset timer, score, events
       return defaultLineup;
   };

   // --- UPDATED: movePlayerInGame (to log substitutions) ---
   const movePlayerInGame = (gameId: string, playerId: string, sourceLocation: PlayerLineupState['location'], targetLocation: PlayerLineupState['location'], newPosition?: { x: number; y: number }) => {
    const now = Date.now();
    setGamesState(prevGames => {
      const gameIndex = prevGames.findIndex(g => g.id === gameId);
      if (gameIndex === -1) return prevGames; // Game not found

      const game = { ...prevGames[gameIndex] }; // Shallow copy game
      if (!game.lineup) return prevGames; // No lineup to modify

      const isGameActive = game.timerStatus === 'running' || (game.timerStatus === 'stopped' && (game.timerElapsedSeconds ?? 0) > 0);
      let newLineup = [...game.lineup]; // Shallow copy lineup
      const playerIndex = newLineup.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return prevGames; // Player not found

      const playerState = { ...newLineup[playerIndex] }; // Shallow copy player state

      // --- Update Player State ---
      let updatedPlaytime = playerState.playtimeSeconds;
      let updatedStartTime = playerState.playtimerStartTime;

      // Stop timer if moving off field/inactive
      if ((sourceLocation === 'field' || sourceLocation === 'inactive') && playerState.playtimerStartTime) {
        const elapsed = (now - playerState.playtimerStartTime) / 1000;
        updatedPlaytime = Math.round(playerState.playtimeSeconds + elapsed);
        updatedStartTime = null;
      }
      // Start timer if moving onto field and game is running
      if (targetLocation === 'field' && game.timerStatus === 'running' && updatedStartTime === null) {
        updatedStartTime = now;
      } else if (targetLocation !== 'field') {
        // Ensure timer is null if not on field (or inactive)
        updatedStartTime = null;
      }

      let updatedSubbedOnCount = playerState.subbedOnCount;
      let updatedSubbedOffCount = playerState.subbedOffCount;
      let substitutionEvent: GameEvent | null = null;

      // --- Create Substitution Event if applicable ---
      if (isGameActive) {
          // Calculate current game seconds for the event
          let currentSeconds = game.timerElapsedSeconds ?? 0;
          if (game.timerStatus === 'running' && game.timerStartTime) {
              currentSeconds += (Date.now() - game.timerStartTime) / 1000;
          }
          const eventSeconds = Math.round(currentSeconds);
          // Determine the team for the event based on the game's location
          const eventTeam = (game.location === 'home') ? 'home' : 'away';

          // Log sub only if moving between bench and field
          if (sourceLocation === 'bench' && targetLocation === 'field') {
              updatedSubbedOnCount++;
              substitutionEvent = {
                  id: uuidv4(), type: 'substitution', team: eventTeam,
                  playerInId: playerId, playerOutId: undefined, // Player coming in
                  timestamp: now, gameSeconds: eventSeconds,
              };
          } else if (sourceLocation === 'field' && targetLocation === 'bench') {
              updatedSubbedOffCount++;
               substitutionEvent = {
                  id: uuidv4(), type: 'substitution', team: eventTeam,
                  playerInId: undefined, playerOutId: playerId, // Player coming out
                  timestamp: now, gameSeconds: eventSeconds,
              };
          }
          // Note: Swapping field players doesn't create a sub event here
          // Note: Moving to/from 'inactive' doesn't create a sub event here
      }

      // Apply updates to player state
      playerState.location = targetLocation;
      playerState.position = targetLocation === 'field' ? newPosition : undefined;
      playerState.playtimeSeconds = updatedPlaytime;
      playerState.playtimerStartTime = updatedStartTime;
      playerState.subbedOnCount = updatedSubbedOnCount;
      playerState.subbedOffCount = updatedSubbedOffCount;
      // isStarter and initialPosition remain unchanged by moves

      // Update lineup array
      newLineup[playerIndex] = playerState;

      // Add substitution event if created
      const updatedEvents = substitutionEvent ? [...(game.events || []), substitutionEvent] : game.events;

      // Update the specific game in the games array
      const updatedGames = [...prevGames];
      updatedGames[gameIndex] = { ...game, lineup: newLineup, events: updatedEvents };
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
    startGameTimer, stopGameTimer, markGameAsFinished,
    resetGameLineup, movePlayerInGame, startPlayerTimerInGame, stopPlayerTimerInGame,
    movePlayer, swapPlayers,
    savedLineups, saveLineup, loadLineup, deleteLineup, resetLineup,
    setCurrentPage, selectGame,
    gameHistory, getMostRecentSeason, getMostRecentCompetition,
    addGameEvent, removeLastGameEvent,
    // addCardEvent, // Deferred
  };

  return <TeamContext.Provider value={contextValue}>{children}</TeamContext.Provider>;
};
