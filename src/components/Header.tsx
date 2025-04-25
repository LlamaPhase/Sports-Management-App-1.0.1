import React, { useContext, useState, useRef, ChangeEvent } from 'react'; // Added useState
import { Shield, Users, Calendar, BarChart2, Plus } from 'lucide-react'; // Added Plus
import { TeamContext } from '../context/TeamContext';

interface HeaderProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const HeaderNavLink: React.FC<{
  page: string;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ page, currentPage, setCurrentPage, children, icon }) => {
  const isActive = currentPage === page;
  return (
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex-1 flex flex-col items-center justify-center px-2 py-2 text-xs font-medium transition-opacity ${
        isActive ? 'opacity-100' : 'opacity-70 hover:opacity-90'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon && <span className="mb-0.5">{icon}</span>}
      {children}
    </button>
  );
};


const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage }) => {
  // Get teamName, setTeamName, teamLogo, setTeamLogo from context
  const { teamName, setTeamName, teamLogo, setTeamLogo } = useContext(TeamContext);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(teamName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showBottomNav = ['team', 'schedule', 'stats'].includes(currentPage);

  // --- Handlers for inline name editing ---
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewName(e.target.value);
  };

  const handleNameSave = () => {
    if (newName.trim()) {
      setTeamName(newName.trim());
    } else {
      setNewName(teamName); // Revert if empty
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setNewName(teamName); // Revert on escape
      setIsEditingName(false);
    }
  };
  // --- End Handlers ---

  // --- Handlers for logo ---
  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeamLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  // --- End Handlers ---

  return (
    <header className="bg-red-700 text-white sticky top-0 z-20 shadow">
      {/* Top part */}
      <div className="p-4 flex justify-between items-center">
        {/* Team Logo and Name Section */}
        <div className="flex items-center space-x-2">
          {/* Logo/Placeholder */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLogoChange}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={handleLogoClick}
            // Removed rounded-full, bg-gray-200. Added padding for click area.
            className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 transition cursor-pointer overflow-hidden flex-shrink-0 p-1"
            aria-label="Change team logo"
          >
            {teamLogo ? (
              <img src={teamLogo} alt="Team Logo" className="w-full h-full object-cover rounded-full" /> // Keep rounded for actual logo
            ) : (
              // Removed bg-gray-500 from this div
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Adjusted shield size and opacity */}
                <Shield size={24} className="text-white opacity-60" />
                {/* Adjusted plus size and position slightly */}
                <Plus size={14} className="absolute text-white" />
              </div>
            )}
          </button>

          {/* Team Name / Input */}
          {isEditingName ? (
            <input
              type="text"
              value={newName}
              onChange={handleNameChange}
              onBlur={handleNameSave} // Save on blur
              onKeyDown={handleNameKeyDown}
              className="text-lg font-semibold bg-red-800 border-b border-white focus:outline-none px-1 py-0.5 text-white" // Ensure text is visible
              autoFocus
            />
          ) : (
            // Make only the name clickable for editing
            <span
              className="font-semibold text-lg cursor-pointer hover:opacity-80"
              onClick={() => setIsEditingName(true)} // Trigger edit on click
            >
              {teamName || 'Your Team'}
            </span>
          )}
        </div>

        {/* Lineup Button */}
        <button
          onClick={() => setCurrentPage('lineup')}
          className="hover:opacity-80 transition-opacity p-1 rounded-full hover:bg-red-600"
          aria-label="Edit Lineup"
        >
          <img src="/lineup-icon.svg" alt="Lineup" className="w-6 h-6 invert" />
        </button>
      </div>

      {/* Bottom navigation part */}
      {showBottomNav && (
        <nav className="flex justify-around items-stretch border-t border-red-600">
          <HeaderNavLink page="team" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<Users size={18}/>}>
            Team
          </HeaderNavLink>
          <HeaderNavLink page="schedule" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<Calendar size={18}/>}>
            Schedule
          </HeaderNavLink>
          <HeaderNavLink page="stats" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<BarChart2 size={18}/>}>
            Stats
          </HeaderNavLink>
        </nav>
      )}
    </header>
  );
};

export default Header;
