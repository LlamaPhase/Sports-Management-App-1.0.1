import React, { useState, useEffect, useContext } from 'react'; // Added useContext
import { Users, Calendar, Clock, Home, Plane, X, Trophy, Repeat } from 'lucide-react'; // Added Trophy, Repeat
import { Game, TeamContext } from '../context/TeamContext'; // Import Game type and Context

interface EditGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game | null;
  // Updated signature
  onUpdateGame: (id: string, updates: Partial<Omit<Game, 'id'>>) => void;
}

const EditGameModal: React.FC<EditGameModalProps> = ({ isOpen, onClose, game, onUpdateGame }) => {
  const { gameHistory } = useContext(TeamContext); // Get history from context
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState<'home' | 'away'>('home');
  // NEW: State for season and competition
  const [season, setSeason] = useState('');
  const [competition, setCompetition] = useState('');

  useEffect(() => {
    if (isOpen && game) {
      setOpponent(game.opponent);
      setDate(game.date);
      setTime(game.time);
      setLocation(game.location);
      // Populate season/competition from the game being edited
      setSeason(game.season || '');
      setCompetition(game.competition || '');
    }
    if (!isOpen) {
        setOpponent('');
        setDate('');
        setTime('');
        setLocation('home');
        setSeason('');
        setCompetition('');
    }
  }, [isOpen, game]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (game && opponent.trim() && date) {
      onUpdateGame(game.id, {
        opponent: opponent.trim(),
        date,
        time,
        location,
        // Pass updated season and competition
        season: season,
        competition: competition,
      });
      onClose();
    } else {
      alert("Please enter opponent name and date.");
    }
  };

  if (!isOpen || !game) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Game</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location Buttons */}
          <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
             <div className="flex space-x-3">
                <button type="button" onClick={() => setLocation('home')} className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 border rounded-md transition-colors ${ location === 'home' ? 'bg-red-100 border-red-300 text-red-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100' }`} >
                    <Home size={18} /> <span>Home</span>
                </button>
                <button type="button" onClick={() => setLocation('away')} className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 border rounded-md transition-colors ${ location === 'away' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100' }`} >
                    <Plane size={18} /> <span>Away</span>
                </button>
             </div>
           </div>

          {/* Opponent Input */}
          <div>
            <label htmlFor="editOpponent" className="block text-sm font-medium text-gray-700 mb-1">Opponent</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Users size={18} className="text-gray-400" /></span>
              <input type="text" id="editOpponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" placeholder="e.g., Rival Team" required />
            </div>
          </div>
          {/* Date Input */}
          <div>
            <label htmlFor="editDate" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar size={18} className="text-gray-400" /></span>
              <input type="date" id="editDate" value={date} onChange={(e) => setDate(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" required />
            </div>
          </div>
          {/* Time Input */}
          <div>
            <label htmlFor="editTime" className="block text-sm font-medium text-gray-700 mb-1">Time (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Clock size={18} className="text-gray-400" /></span>
              <input type="time" id="editTime" value={time} onChange={(e) => setTime(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500" />
            </div>
          </div>

          {/* NEW: Competition */}
          <div>
            <label htmlFor="editCompetition" className="block text-sm font-medium text-gray-700 mb-1">Competition (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Trophy size={18} className="text-gray-400" /></span>
              <input
                type="text"
                id="editCompetition"
                list="edit-competition-history" // Link to datalist
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g., League Playoffs"
              />
              {/* Datalist for suggestions */}
              <datalist id="edit-competition-history">
                {gameHistory.competitions.map((comp, index) => (
                  <option key={index} value={comp} />
                ))}
              </datalist>
            </div>
          </div>

          {/* NEW: Season */}
          <div>
            <label htmlFor="editSeason" className="block text-sm font-medium text-gray-700 mb-1">Season (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Repeat size={18} className="text-gray-400" /></span>
              <input
                type="text"
                id="editSeason"
                list="edit-season-history" // Link to datalist
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="e.g., Fall 2024"
              />
              {/* Datalist for suggestions */}
              <datalist id="edit-season-history">
                {gameHistory.seasons.map((s, index) => (
                  <option key={index} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGameModal;
