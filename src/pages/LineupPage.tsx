import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { TeamContext, Player } from '../context/TeamContext';
import { useDrop, useDrag, DropTargetMonitor, DragSourceMonitor } from 'react-dnd';
import PlayerIcon from '../components/PlayerIcon';
import { Save, Download, RotateCcw, ArrowLeft } from 'lucide-react';
import SaveLineupModal from '../components/SaveLineupModal';
import LoadLineupModal from '../components/LoadLineupModal';

const ItemTypes = {
  PLAYER: 'player',
};

interface LineupPageProps {
  previousPage: string | null;
}

interface DraggablePlayerProps {
  player: Player;
  location: 'field' | 'bench';
  fieldWidth: number;
  fieldHeight: number;
}

// Constants for icon dimensions used in collision detection
// Use the larger (md:) dimensions for safer collision checks
const ICON_WIDTH_APPROX = 40; // Corresponds to md:w-10
const ICON_HEIGHT_APPROX = 58; // Approx md:h-10 + text height + spacing

const DraggablePlayer: React.FC<DraggablePlayerProps> = ({ player, location, fieldWidth, fieldHeight }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PLAYER,
    item: { id: player.id, location, position: player.position },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [player.id, location, player.position]);

  // Base style, actual size is controlled by PlayerIcon's responsive classes
  const style: React.CSSProperties = {
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
    position: location === 'field' ? 'absolute' : 'relative',
    zIndex: location === 'field' ? 10 : 1, // Ensure players are above markings
    // Width is determined by PlayerIcon, but set a min-width for positioning calculation safety
    minWidth: `${ICON_WIDTH_APPROX}px`,
  };

  if (location === 'field' && player.position && fieldWidth > 0 && fieldHeight > 0) {
    // Calculate pixel position based on percentage, centering the icon approximately
    const pixelLeft = (player.position.x / 100) * fieldWidth;
    const pixelTop = (player.position.y / 100) * fieldHeight;
    style.left = `${pixelLeft}px`;
    style.top = `${pixelTop}px`;
    // Apply transform to center based on the *larger* icon size used for collision
    // This might slightly misalign the smaller icon, but keeps drop logic consistent
    style.transform = `translate(-${ICON_WIDTH_APPROX / 2}px, -${ICON_HEIGHT_APPROX / 2}px)`;

  } else if (location === 'field') {
     // Hide if position is invalid
     style.left = '-9999px';
     style.top = '-9999px';
  }


  return (
    <div
      ref={drag}
      style={style}
      // Use flex justify-center on the wrapper for bench players
      className={`flex justify-center ${location === 'bench' ? 'mb-1' : ''}`}
    >
      {/* Pass context based on location */}
      <PlayerIcon player={player} showName={true} size="small" context={location} />
    </div>
  );
};


interface DropZoneProps {
  children: React.ReactNode;
  onDropPlayer: (
    item: { id: string; location: 'field' | 'bench'; position?: { x: number; y: number } },
    dropXPercent?: number,
    dropYPercent?: number
  ) => void;
  className?: string;
  location: 'field' | 'bench';
  fieldRef?: React.RefObject<HTMLDivElement>;
}

const DropZone: React.FC<DropZoneProps> = ({ children, onDropPlayer, className, location, fieldRef }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.PLAYER,
    drop: (item: { id: string; location: 'field' | 'bench'; position?: { x: number; y: number } }, monitor: DropTargetMonitor) => {
      if (location === 'field' && fieldRef?.current) {
        const fieldRect = fieldRef.current.getBoundingClientRect();
        const dropPosition = monitor.getClientOffset();

        if (dropPosition && fieldRect.width > 0 && fieldRect.height > 0) {
          // Calculate drop position relative to the field
          let relativeX = dropPosition.x - fieldRect.left;
          let relativeY = dropPosition.y - fieldRect.top;

          // Convert to percentage
          let percentX = (relativeX / fieldRect.width) * 100;
          let percentY = (relativeY / fieldRect.height) * 100;

          // Adjust percentage to represent the *center* of the icon for storage
          // (The DraggablePlayer component will handle offsetting via transform for rendering)
          // No need to subtract half icon here as we store the center percentage

          // Clamp percentage within field boundaries (0-100)
          percentX = Math.max(0, Math.min(percentX, 100));
          percentY = Math.max(0, Math.min(percentY, 100));

          onDropPlayer(item, percentX, percentY);
        }
      } else if (location === 'bench') {
        onDropPlayer(item);
      }
    },
    collect: (monitor: DropTargetMonitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [onDropPlayer, location, fieldRef]);

  const combinedRef = (node: HTMLDivElement | null) => {
    drop(node);
    if (fieldRef && location === 'field') {
        (fieldRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  if (location === 'field') {
    return (
      <div
        ref={combinedRef}
        // Added overflow-hidden here specifically for the markings, not the players
        className={`${className} ${isOver ? 'bg-green-700/20' : ''} transition-colors overflow-hidden`}
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        {/* --- Field Markings (with md: variants for width/position) --- */}
        {/* Penalty Area */}
        <div className="absolute bottom-0 left-[20%] w-[60%] md:left-[25%] md:w-[50%] h-[18%] border-2 border-white/50 border-b-0"></div>
        {/* Goal Area */}
        <div className="absolute bottom-0 left-[38%] w-[24%] md:left-[40%] md:w-[20%] h-[6%] border-2 border-white/50 border-b-0"></div>
        {/* Penalty Arc */}
        <div className="absolute bottom-[18%] left-[40%] w-[20%] md:left-[42%] md:w-[16%] h-[10%] border-2 border-white/50 border-b-0 rounded-t-full"></div>
        {/* Center Circle Arc (Top Half) */}
        <div className="absolute top-[-12%] left-[40%] w-[20%] md:left-[42%] md:w-[16%] h-[24%] border-2 border-white/50 border-t-0 rounded-b-full"></div>
        {/* Corner Arc Bottom Left */}
        <div className="absolute bottom-[-5%] left-[-5%] w-[10%] h-[10%] border-2 border-white/50 border-b-0 border-l-0 rounded-tr-full"></div>
        {/* Corner Arc Bottom Right */}
        <div className="absolute bottom-[-5%] right-[-5%] w-[10%] h-[10%] border-2 border-white/50 border-b-0 border-r-0 rounded-tl-full"></div>

        {/* --- Draggable Players --- */}
        {children}
      </div>
    );
  } else {
    // Bench DropZone
    return (
      <div
        ref={drop}
        className={`${className} ${isOver ? 'bg-gray-300/50' : ''} transition-colors`}
      >
        {children}
      </div>
    );
  }
};


const LineupPage: React.FC<LineupPageProps> = ({ previousPage }) => {
  const { players, movePlayer, swapPlayers, savedLineups, saveLineup, loadLineup, deleteLineup, resetLineup, setCurrentPage } = useContext(TeamContext);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const fieldContainerRef = useRef<HTMLDivElement>(null); // Ref for the outer container of the field
  const fieldItselfRef = useRef<HTMLDivElement>(null); // Ref for the actual dropzone field
  const benchContainerRef = useRef<HTMLDivElement>(null); // Ref for the bench container
  const [fieldDimensions, setFieldDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      const fieldElement = fieldItselfRef.current;
      const benchElement = benchContainerRef.current;

      if (fieldElement) {
        const { width, height } = fieldElement.getBoundingClientRect();
        // Update field dimensions state if changed
        if (width > 0 && height > 0 && (Math.abs(width - fieldDimensions.width) > 1 || Math.abs(height - fieldDimensions.height) > 1)) {
             setFieldDimensions({ width, height });
        }

        // Adjust bench height on md screens
        if (benchElement) {
          const isMdScreen = window.innerWidth >= 768; // Tailwind's md breakpoint
          if (isMdScreen && height > 0) {
            benchElement.style.height = `${height}px`;
          } else {
            // Reset height on smaller screens to allow flexbox control
            benchElement.style.height = '';
          }
        }
      }
    };

    // Initial measurement and setup
    const timeoutId = setTimeout(updateDimensions, 50);

    // Use ResizeObserver on the *field container* for better detection of its size changes
    let resizeObserver: ResizeObserver | null = null;
    const containerElement = fieldContainerRef.current;
    if (containerElement) {
        resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(containerElement);
    }

    // Also listen to window resize as a fallback and for breakpoint changes
    window.addEventListener('resize', updateDimensions);

    return () => {
      clearTimeout(timeoutId);
      if (resizeObserver && containerElement) {
        resizeObserver.unobserve(containerElement);
      }
      window.removeEventListener('resize', updateDimensions);
    };
    // Depend on fieldDimensions state to re-run if needed, though ResizeObserver/resize handles most cases.
  }, [fieldDimensions.width, fieldDimensions.height]); // Keep dependencies


  const fieldPlayers = players.filter(p => p.location === 'field');
  const benchPlayers = useMemo(() =>
    players
      .filter(p => p.location === 'bench')
      .sort((a, b) => a.firstName.localeCompare(b.firstName)),
    [players]
  );

  const handleDrop = (
    item: { id: string; location: 'field' | 'bench'; position?: { x: number; y: number } },
    targetLocation: 'field' | 'bench',
    xPercent?: number,
    yPercent?: number
  ) => {
    const droppedPlayerId = item.id;
    const sourceLocation = item.location;

    if (targetLocation === 'field' && xPercent !== undefined && yPercent !== undefined) {
      // Use the larger icon dimensions for collision detection percentage calculation
      const iconWidthPercent = fieldDimensions.width > 0 ? (ICON_WIDTH_APPROX / fieldDimensions.width) * 100 : 5;
      const iconHeightPercent = fieldDimensions.height > 0 ? (ICON_HEIGHT_APPROX / fieldDimensions.height) * 100 : 5;

      // Find if the drop location (center percentage) overlaps with the bounding box of another player
      const targetPlayer = fieldPlayers.find(p => {
        if (!p.position || p.id === droppedPlayerId) return false; // Skip self

        // Calculate the bounding box of the existing player (p) based on its center percentage
        const pLeft = p.position.x - iconWidthPercent / 2;
        const pRight = p.position.x + iconWidthPercent / 2;
        const pTop = p.position.y - iconHeightPercent / 2;
        const pBottom = p.position.y + iconHeightPercent / 2;

        // Check if the drop point (xPercent, yPercent) falls within this bounding box
        return xPercent > pLeft && xPercent < pRight && yPercent > pTop && yPercent < pBottom;
      });


      if (targetPlayer) {
        // If dropped onto another player, swap their positions
        console.log(`Swapping ${droppedPlayerId} with ${targetPlayer.id}`);
        swapPlayers(droppedPlayerId, targetPlayer.id);
      } else {
        // Otherwise, move the player to the new percentage coordinates
        console.log(`Moving ${droppedPlayerId} to ${xPercent}, ${yPercent}`);
        movePlayer(droppedPlayerId, 'field', { x: xPercent, y: yPercent });
      }
    } else if (targetLocation === 'bench') {
      // Only move if coming from the field
      if (sourceLocation === 'field') {
         movePlayer(droppedPlayerId, 'bench');
      }
      // If dragging from bench to bench, do nothing (handled by dnd library implicitly)
    }
  };

  const handleSaveClick = () => setIsSaveModalOpen(true);
  const handleLoadClick = () => setIsLoadModalOpen(true);
  const handleResetClick = () => {
    if (window.confirm('Are you sure you want to move all players to the bench?')) {
      resetLineup();
    }
  };
  const handleSaveLineup = (name: string) => { saveLineup(name); setIsSaveModalOpen(false); };
  const handleLoadLineup = (name: string) => { if(loadLineup(name)) setIsLoadModalOpen(false); else alert(`Failed to load lineup "${name}".`); };
  const handleDeleteLineup = (name: string) => deleteLineup(name);

  const handleGoBack = () => {
    // Ensure setCurrentPage is callable before invoking it
    if (typeof setCurrentPage === 'function') {
      setCurrentPage(previousPage || 'team');
    } else {
      console.error("setCurrentPage is not a function in TeamContext");
      // Fallback or error handling, e.g., navigate to a default page
      // Or perhaps the context isn't fully loaded yet.
    }
  };

  // Estimate fixed heights for portrait view (header ~60, back button ~40, bench ~96, margins ~16) = ~212px
  const approxFixedElementsHeightPortrait = 220; // Use a slightly larger buffer

  return (
    // Main container: flex-col, allows children to grow. Removed overflow-hidden.
    <div className="flex flex-col flex-grow">
       {/* Back Button Area */}
       <div className="pt-1 pb-2 px-2 flex items-center flex-shrink-0">
         <button
           onClick={handleGoBack}
           className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-200"
           aria-label="Go Back"
         >
           <ArrowLeft size={20} />
         </button>
       </div>

      {/* Field and Bench Container: flex-col default, md:flex-row */}
      {/* flex-grow allows this container to take available space */}
      {/* Removed overflow-hidden */}
      {/* md:space-x-4 adds gap only in row layout */}
      <div className="flex flex-col md:flex-row flex-grow md:space-x-4">

        {/* Field Area Wrapper: Takes up space, centers content */}
        {/* md:w-2/3 defines width in row layout */}
        {/* md:order-1 ensures field is on the left in row layout */}
        {/* Added md:max-h-none to remove height constraint on larger screens */}
        <div
          ref={fieldContainerRef} // Ref for ResizeObserver
          className="relative w-full md:w-2/3 mx-auto my-2 md:my-0 md:mx-0 flex flex-col md:order-1 md:max-h-none" // Added md:max-h-none
          // Apply aspect ratio and max height only on smaller screens (portrait)
          style={{
            aspectRatio: '1 / 1',
            maxHeight: `calc(100vh - ${approxFixedElementsHeightPortrait}px)`,
          }}
        >
          {/* Field Drop Zone: Takes full width/height of its wrapper */}
          <DropZone
              onDropPlayer={(item, xPct, yPct) => handleDrop(item, 'field', xPct, yPct)}
              fieldRef={fieldItselfRef} // Ref for drop coordinate calculation
              // Added overflow-hidden here to clip markings like corner arcs if needed
              className="bg-green-600 w-full h-full rounded-lg shadow-inner flex-grow overflow-hidden"
              location="field"
          >
              {/* Pass players to DropZone children */}
              {fieldPlayers.map((player) => (
              <DraggablePlayer
                  key={player.id}
                  player={player}
                  location="field"
                  fieldWidth={fieldDimensions.width}
                  fieldHeight={fieldDimensions.height}
              />
              ))}
          </DropZone>
           {/* Lineup Action Icons */}
           <div className="absolute top-2 right-2 flex space-x-1 bg-white/70 p-1 rounded shadow z-20">
              <button onClick={handleSaveClick} className="text-gray-700 hover:text-blue-600 p-1.5" title="Save Lineup"><Save size={18} /></button>
              <button onClick={handleLoadClick} className="text-gray-700 hover:text-blue-600 p-1.5" title="Load Lineup"><Download size={18} /></button>
              <button onClick={handleResetClick} className="text-gray-700 hover:text-red-600 p-1.5" title="Reset Lineup"><RotateCcw size={18} /></button>
           </div>
        </div>


        {/* Bench Area */}
        {/* Assign benchContainerRef here */}
        <div
          ref={benchContainerRef}
          className="bg-gray-200 p-3 mt-3 md:mt-0 rounded-lg shadow flex-shrink-0 md:w-1/3 md:order-2 md:flex md:flex-col"
          // md:h-auto is removed, height will be set by JS on md screens
        >
          <h2 className="text-base font-semibold mb-2 border-b pb-1 text-gray-700 flex-shrink-0">Bench</h2>
          {/* Bench Drop Zone: flex-grow allows it to take remaining space in column layout */}
          {/* md:overflow-y-auto allows scrolling within bench if needed on desktop */}
          <DropZone
            onDropPlayer={(item) => handleDrop(item, 'bench')}
            // min-h-[60px] ensures some height, flex-wrap allows wrapping
            // md:flex-grow allows it to fill vertical space in row layout
            className="min-h-[60px] flex flex-wrap gap-x-3 gap-y-1 flex-grow md:overflow-y-auto"
            location="bench"
          >
            {/* Pass bench players to DropZone children */}
            {benchPlayers.length === 0 ? (
               <p className="text-gray-500 w-full text-center text-sm py-2">Bench is empty.</p>
             ) : (
              benchPlayers.map((player) => (
                <DraggablePlayer key={player.id} player={player} location="bench" fieldWidth={0} fieldHeight={0} />
              ))
             )}
          </DropZone>
        </div>
      </div>


      {/* Modals */}
      <SaveLineupModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveLineup} />
      <LoadLineupModal isOpen={isLoadModalOpen} onClose={() => setIsLoadModalOpen(false)} savedLineups={savedLineups} onLoad={handleLoadLineup} onDelete={handleDeleteLineup} />
    </div>
  );
};

export default LineupPage;
