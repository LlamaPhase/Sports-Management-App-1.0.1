import React, { useState } from 'react';
import Layout from './components/Layout';
import TeamPage from './pages/TeamPage';
import SchedulePage from './pages/SchedulePage';
import StatsPage from './pages/StatsPage';
import LineupPage from './pages/LineupPage';
import GamePage from './pages/GamePage'; // Import GamePage
import { TeamProvider } from './context/TeamContext';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';


function App() {
  const [currentPage, _setCurrentPage] = useState('team');
  const [previousPage, setPreviousPage] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null); // State for selected game

  const setCurrentPage = (newPage: string) => {
    if (newPage !== currentPage) {
      setPreviousPage(currentPage);
      _setCurrentPage(newPage);
    }
  };

  // Function to select a game and navigate to the game page
  const selectGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setCurrentPage('game'); // Navigate to the 'game' page
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'team':
        return <TeamPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'stats':
        return <StatsPage />;
      case 'lineup':
        return <LineupPage previousPage={previousPage} />;
      case 'game': // Pass previousPage to GamePage
        return <GamePage gameId={selectedGameId} previousPage={previousPage} />;
      default:
        return <TeamPage />;
    }
  };

  // Determine if the main layout (with header) should be shown
  const showLayout = currentPage !== 'game';

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Pass selectGame down */}
      <TeamProvider setCurrentPage={setCurrentPage} selectGame={selectGame}>
        {showLayout ? (
          <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
            {renderPage()}
          </Layout>
        ) : (
          // Render GamePage directly without the main Layout/Header
          // Ensure GamePage container allows its content to define height
          <div className="min-h-screen bg-gray-100 flex flex-col">
             {/* Removed p-4 from main, GamePage will handle its padding */}
             <main className="flex-grow flex flex-col">
                {renderPage()}
             </main>
          </div>
        )}
      </TeamProvider>
    </DndProvider>
  );
}

export default App;
