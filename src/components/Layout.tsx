import React from 'react';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, setCurrentPage }) => {
  return (
    // Ensure the main layout container takes full height and allows children to grow
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {/* Make the main content area grow and allow its children to grow too */}
      {/* Removed overflow-hidden to allow scrolling if content exceeds viewport */}
      <main className="flex-grow flex flex-col p-4">
        {children}
      </main>
    </div>
  );
};

export default Layout;
