import { motion, AnimatePresence } from 'framer-motion';
import { celestialBodies, deepSpaceQuotes } from '../../data/celestialData';
import { X, Info, Compass, Search, Volume2, VolumeX, Rocket, Play, ChevronDown, Share2, Check } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { sound } from '../../utils/soundEngine';
import { FastForward } from 'lucide-react';

export default function Overlay({ activeTarget, setActiveTarget, cameraDistance, cinematicState, setCinematicState, onResetCamera,  timeScale,
  setTimeScale,
  isPiloting,
  setIsPiloting,
  shipModel,
  setShipModel,
  isTourActive,
  setIsTourActive
}) {

  // Deep space threshold
  const DEEP_SPACE_THRESHOLD = 5500;

  // Manage stable quotes and warning phase
  const [quoteIndex, setQuoteIndex] = useState(-1);
  const [voidPhase, setVoidPhase] = useState(0); // 0 = none, 1 = warning, 2 = quotes

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false); // For mobile info card
  const [isMuted, setIsMuted] = useState(true); // Start muted to comply with browser policies
  const [copied, setCopied] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({
    real: false,
    fiction: false
  });

  const activeBodyData = celestialBodies.find(b => b.id === activeTarget);

  useEffect(() => {
    // Si estamos en un planeta de ficción y el usuario se aleja mucho (zoom out)
    // forzamos el regreso automático a la galaxia segura.
    if (activeBodyData?.isFictional) {
      // El límite dinámico de escape depende del tamaño del astro para que se sienta proporcionado
      const escapeDistance = Math.max(800, activeBodyData.size * 300);
      if (cameraDistance >= escapeDistance && cinematicState !== 'JUMPING_TO_REAL' && !isTourActive) {
        setCinematicState('JUMPING_TO_REAL');
        if (!isMuted) sound.playWarpJump();
        setTimeout(() => {
          setActiveTarget(null);
          setCinematicState(null);
          if (onResetCamera) onResetCamera();
        }, 3000);
        return;
      }
    }

    if (cameraDistance >= DEEP_SPACE_THRESHOLD && voidPhase === 0) {
      setVoidPhase(1); // Entramos al vacío
    } else if (cameraDistance < DEEP_SPACE_THRESHOLD) {
      setVoidPhase(0); // Salimos del vacío
    }
  }, [cameraDistance, voidPhase, activeBodyData, cinematicState, isMuted, setCinematicState, setActiveTarget, onResetCamera, isTourActive]);

  useEffect(() => {
    let timeout;
    if (voidPhase === 1) {
      // 5 seconds warning then switch to quotes
      timeout = setTimeout(() => {
        setVoidPhase(2);
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [voidPhase]);

  useEffect(() => {
    if (voidPhase === 2) {
      setQuoteIndex(Math.floor(Math.random() * deepSpaceQuotes.length));
      
      const interval = setInterval(() => {
        setQuoteIndex(Math.floor(Math.random() * deepSpaceQuotes.length));
      }, 12000);
      return () => clearInterval(interval);
    } else {
      setQuoteIndex(-1);
    }
  }, [voidPhase]);

  // Fade the background to pure black as we enter deep space
  const voidOpacity = useMemo(() => {
    return Math.min(1, Math.max(0, (cameraDistance - DEEP_SPACE_THRESHOLD) / 300));
  }, [cameraDistance]);

  const toggleSound = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    sound.init();
    if (newMuted) {
      sound.mute();
    } else {
      sound.unmute();
      // Ensure drone starts if we just unmuted
      sound.setDroneVolume(0.3, 2);
    }
  };

  const executeWithSafeReturn = (action) => {
    if (activeBodyData?.isFictional) {
      setCinematicState('JUMPING_TO_REAL');
      if (!isMuted) sound.playWarpJump();
      setTimeout(() => {
        setActiveTarget(null);
        if (onResetCamera) onResetCamera();
        if (action) action();
        setTimeout(() => setCinematicState(null), 100);
      }, 3000);
    } else {
      if (action) action();
    }
  };

  const searchResults = useMemo(() => {
    if (!searchQuery) {
      return celestialBodies;
    }
    
    const removeAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const lowerQ = removeAccents(searchQuery.toLowerCase());
    
    return celestialBodies.filter(b => 
      removeAccents(b.name.toLowerCase()).includes(lowerQ) || 
      removeAccents(b.type.toLowerCase()).includes(lowerQ)
    );
  }, [searchQuery]);

  const handleSelectTarget = (id) => {
    if (!isMuted) {
      sound.init();
      sound.playUIClick();
    }
    
    if (id === activeTarget) {
      setActiveTarget(null);
      setCinematicState(null);
      onResetCamera();
      setIsSearchActive(false);
      return;
    }

    const targetBody = celestialBodies.find(b => b.id === id);
    const isCurrentlyFictional = activeBodyData ? !!activeBodyData.isFictional : false;
    const isTargetFictional = targetBody ? !!targetBody.isFictional : false;
    
    // Si saltamos entre galaxias (universo real a universo de ficción o viceversa)
    if (isCurrentlyFictional !== isTargetFictional) {
      setCinematicState(isTargetFictional ? 'JUMPING_TO_FICTION' : 'JUMPING_TO_REAL');
      if (!isMuted) sound.playWarpJump();
      
      setTimeout(() => {
        setActiveTarget(id);
        setTimeout(() => setCinematicState(null), 100);
      }, 3000);
    } else {
      setActiveTarget(id);
    }
    
    setIsSearchActive(false);
    setSearchQuery('');
  };

  return (
    <div className="ui-layer">
      {/* The Void Fade */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none z-[-1]" 
        style={{ opacity: voidOpacity }} 
      />

      {/* Hide standard UI during cinematic tour */}
      {!isTourActive && (
        <>
          {/* Header */}
          <header className="p-4 md:p-10 flex flex-wrap justify-between items-start md:items-center w-full pointer-events-auto gap-4">
            <div className="shrink-0">
              <h1 className="text-2xl md:text-h2 font-display font-bold tracking-widest">ESTELAR</h1>
              <p className="hidden md:block text-body text-sm mt-1 tracking-wider opacity-60 uppercase">Exploración Cósmica</p>
            </div>
        <div className="flex gap-2 sm:gap-3 items-center flex-wrap justify-end flex-1">
          
          {/* Time Warp Slider */}
          <div className="hidden md:flex items-center gap-3 bg-black/40 border border-white/10 rounded-full px-4 py-2 backdrop-blur-md">
            <FastForward size={14} className={timeScale > 1 ? "text-accent animate-pulse" : "text-white/40"} />
            <input 
              type="range" 
              min="1" 
              max="2000" 
              step="1"
              value={timeScale} 
              onChange={(e) => setTimeScale(parseFloat(e.target.value))}
              className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent"
              title={`Aceleración: x${timeScale}`}
            />
            <span className="text-[10px] font-mono text-white/50 w-8">x{timeScale > 999 ? '1k+' : timeScale}</span>
          </div>

          {/* Search Button & Absolute Overlay */}
          <div className="relative pointer-events-auto z-[60] w-10 h-10">
            <button 
              onClick={() => setIsSearchActive(!isSearchActive)}
              className="hud-button flex items-center justify-center w-10 h-10 !p-0 z-[80] relative"
              title={isSearchActive ? "Cerrar Búsqueda" : "Buscar Astros"}
            >
              {isSearchActive ? <X size={16} className="text-white/70" /> : <Search size={16} />}
            </button>

            <AnimatePresence>
              {isSearchActive && (
                <motion.div 
                  initial={typeof window !== 'undefined' && window.innerWidth < 640 ? { opacity: 0, y: -10 } : { width: 40, opacity: 0 }}
                  animate={typeof window !== 'undefined' && window.innerWidth < 640 ? { opacity: 1, y: 0 } : { width: 280, opacity: 1 }}
                  exit={typeof window !== 'undefined' && window.innerWidth < 640 ? { opacity: 0, y: -10 } : { width: 40, opacity: 0 }}
                  className="fixed left-4 right-4 top-20 h-12 sm:absolute sm:right-0 sm:top-0 sm:left-auto sm:h-10 z-[70] origin-top sm:origin-right"
                >
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Buscar estrella, planeta..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => setTimeout(() => setIsSearchActive(false), 200)}
                    className="w-full h-full bg-black/90 sm:bg-black/80 border border-white/20 rounded-2xl sm:rounded-full py-2 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-accent backdrop-blur-xl shadow-2xl"
                  />
                  <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50" />
                  
                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 sm:right-0 sm:left-auto mt-2 w-full sm:min-w-[280px] bg-black/95 border border-white/10 rounded-xl overflow-hidden backdrop-blur-xl flex flex-col max-h-[60vh] sm:max-h-[50vh] overflow-y-auto custom-scrollbar shadow-2xl"
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking inside dropdown
                      >
                        {(() => {
                          const realBodies = searchResults.filter(b => !b.isFictional);
                          const fictionalBodies = searchResults.filter(b => b.isFictional);

                          const renderItems = (items) => items.map(result => (
                            <button
                              key={result.id}
                              onClick={() => {
                                handleSelectTarget(result.id);
                                setIsSearchActive(false);
                              }}
                              onMouseEnter={() => !isMuted && sound.playUIHover()}
                              className="text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 flex justify-between items-center w-full"
                            >
                              <div>
                                <div className="text-sm font-semibold flex items-center gap-2">
                                  {result.name}
                                </div>
                                <div className="text-xs text-white/40 uppercase tracking-wider mt-1">{result.type}</div>
                              </div>
                            </button>
                          ));

                          return (
                            <>
                              {realBodies.length > 0 && (
                                <div 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setCollapsedCategories(prev => ({...prev, real: !prev.real}));
                                  }}
                                  className="px-4 py-2 text-[10px] text-green-400/80 uppercase tracking-widest border-b border-white/5 bg-green-500/10 font-bold flex items-center justify-between cursor-pointer hover:bg-green-500/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    Universo Real
                                  </div>
                                  <ChevronDown size={14} className={`transition-transform duration-200 ${collapsedCategories.real ? '-rotate-90' : ''}`} />
                                </div>
                              )}
                              {!collapsedCategories.real && renderItems(realBodies)}

                              {fictionalBodies.length > 0 && (
                                <div 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setCollapsedCategories(prev => ({...prev, fiction: !prev.fiction}));
                                  }}
                                  className="px-4 py-2 text-[10px] text-blue-400/80 uppercase tracking-widest border-b border-white/5 bg-blue-500/10 font-bold flex items-center justify-between border-t cursor-pointer hover:bg-blue-500/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    Ciencia Ficción
                                  </div>
                                  <ChevronDown size={14} className={`transition-transform duration-200 ${collapsedCategories.fiction ? '-rotate-90' : ''}`} />
                                </div>
                              )}
                              {!collapsedCategories.fiction && renderItems(fictionalBodies)}
                            </>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            className={`hud-button flex items-center justify-center w-10 h-10 !p-0 ${isPiloting ? 'border-accent bg-accent/20' : ''}`}
            onClick={() => {
              const nextState = !isPiloting;
              if (nextState) {
                // Entering Pilot Mode
                executeWithSafeReturn(() => {
                  setIsPiloting(true);
                  if (!isMuted) sound.playUIClick();
                });
              } else {
                // Exiting Pilot Mode
                setIsPiloting(false);
                if (!isMuted) sound.playUIClick();
                if (document.pointerLockElement) document.exitPointerLock();
              }
            }}
            title={isPiloting ? "Salir de Nave (ESC)" : "Modo Piloto (Volar Nave)"}
          >
            <Rocket size={16} className={isPiloting ? "text-accent animate-pulse" : "text-white/70"} />
          </button>

          <button 
            className="hud-button flex items-center justify-center w-10 h-10 !p-0"
            onClick={toggleSound}
            title={isMuted ? "Activar Sonido" : "Desactivar Sonido"}
          >
            {isMuted ? <VolumeX size={16} className="text-white/50" /> : <Volume2 size={16} className="text-accent" />}
          </button>
          
          <button 
            className="hud-button flex items-center gap-2"
            onClick={() => {
              executeWithSafeReturn(() => {
                if (isPiloting) {
                  setIsPiloting(false);
                  if (document.pointerLockElement) document.exitPointerLock();
                }
                setActiveTarget(null);
                if (onResetCamera) onResetCamera();
              });
            }}
          >
            <Compass size={16} />
            <span className="hidden sm:inline">Mapa</span>
          </button>
          
          <button 
            className="hud-button flex items-center gap-2 text-accent border-accent/50 hover:bg-accent/10"
            onClick={() => {
              executeWithSafeReturn(() => {
                if (isPiloting) {
                  setIsPiloting(false);
                  if (document.pointerLockElement) document.exitPointerLock();
                }
                setIsTourActive(true);
                if (!isMuted) sound.playUIClick();
              });
            }}
            title="Iniciar Tour Cinemático"
          >
            <Play size={16} />
            <span className="hidden sm:inline">Tour</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 md:p-10 relative">
        
        {/* Void Warning */}
        <AnimatePresence>
          {voidPhase === 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(4px)' }}
              transition={{ duration: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20"
            >
              <h1 className="text-xl md:text-4xl text-accent font-bold tracking-widest md:tracking-[0.3em] uppercase mb-4 text-center px-4">
                Límite Observable Alcanzado
              </h1>
              <p className="text-sm md:text-base text-white/70 tracking-wider md:tracking-widest max-w-xl text-center leading-relaxed px-6">
                Te has alejado de los territorios mapeados. A partir de aquí, entras en el reino de la teoría, la imaginación y lo desconocido.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deep Space Quotes */}
        <AnimatePresence mode="wait">
          {voidPhase === 2 && quoteIndex >= 0 && (
            <motion.div
              key={`quote-${quoteIndex}`}
              initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
              className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-10"
            >
              <p className="text-quote max-w-3xl text-center leading-relaxed">{deepSpaceQuotes[quoteIndex]}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Intro Text */}
        <AnimatePresence>
          {!activeTarget && !isPiloting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 1, delay: 2 }}
              className="absolute bottom-20 text-center pointer-events-none"
            >
              <p className="text-[10px] sm:text-xs md:text-sm tracking-widest uppercase mb-4 text-white/70 drop-shadow-md">Arrastra / desliza para explorar. Scroll / pellizca para zoom.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Panel for Active Target */}
        <AnimatePresence>
          {activeTarget && activeBodyData && voidPhase === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 50, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 50, filter: 'blur(4px)' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute left-0 right-0 bottom-0 md:bottom-auto md:left-auto md:right-10 md:top-1/2 md:-translate-y-1/2 md:w-full md:max-w-md pointer-events-auto z-40"
            >
              <div className="glass-panel flex flex-col rounded-t-3xl md:rounded-2xl rounded-b-none md:rounded-b-2xl max-h-[60vh] md:max-h-[75vh] p-5 md:p-10 relative">
                <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-4 z-10">
                  <button 
                    onClick={() => {
                      const url = new URL(window.location);
                      navigator.clipboard.writeText(url.toString());
                      if (!isMuted) sound.playUIClick();
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-white/50 hover:text-accent transition-colors relative"
                    title="Compartir enlace"
                  >
                    {copied ? <Check size={20} className="text-green-400" /> : <Share2 size={20} />}
                    <AnimatePresence>
                      {copied && (
                        <motion.span 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-black/80 px-2 py-1 rounded whitespace-nowrap text-white"
                        >
                          ¡Copiado!
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>

                  <button 
                    onClick={() => {
                      // Check if we are currently looking at a fictional body
                      if (activeBodyData?.isFictional) {
                        setCinematicState('JUMPING_TO_REAL');
                        if (!isMuted) sound.playWarpJump();
                        setTimeout(() => {
                          setActiveTarget(null);
                          setCinematicState(null);
                          if (onResetCamera) onResetCamera();
                        }, 3000);
                      } else {
                        setActiveTarget(null);
                        if (onResetCamera) onResetCamera();
                      }
                      setIsCardExpanded(false);
                      if (!isMuted) sound.playUIClick();
                    }}
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="pr-8 md:pr-10">
                  <h2 className="text-3xl md:text-h2 mb-2 flex items-center flex-wrap gap-2 md:gap-3">
                    {activeBodyData.name}
                    {activeBodyData.isFictional ? (
                      <span className="text-[10px] md:text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 tracking-widest font-mono whitespace-nowrap mt-1">FICCIÓN</span>
                    ) : (
                      <span className="text-[10px] md:text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30 tracking-widest font-mono whitespace-nowrap mt-1">REAL</span>
                    )}
                  </h2>
                  <p className="text-[#6b8cff] text-xs md:text-sm uppercase tracking-widest mb-4 md:mb-6">{activeBodyData.type}</p>
                </div>
                
                <div className="overflow-y-auto custom-scrollbar pr-2 mb-10 md:mb-0">
                  <AnimatePresence>
                    {(isCardExpanded || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        {activeBodyData.isFictional && (
                          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                            <p className="text-[10px] md:text-xs text-blue-400 uppercase tracking-widest">Aviso del Sistema</p>
                            <p className="text-xs md:text-sm text-white/70 mt-1 md:mt-2 leading-relaxed">Este objeto es teórico o está basado en ciencia ficción (ej. películas). No representa un objeto celeste real comprobado.</p>
                          </div>
                        )}

                        <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                          <div>
                            <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-wider mb-1">Distancia a la Tierra</p>
                            <p className="font-mono text-base md:text-lg">{activeBodyData.distance}</p>
                          </div>
                          <div>
                            <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-wider mb-1">Masa Estimada</p>
                            <p className="font-mono text-base md:text-lg">{activeBodyData.mass}</p>
                          </div>
                        </div>

                        <div className="pt-4 md:pt-6 border-t border-white/10">
                          <div className="flex items-start gap-2 md:gap-3">
                            <Info size={16} className="text-white/50 shrink-0 mt-0.5 md:mt-1 hidden md:block" />
                            <p className="text-body text-xs md:text-sm leading-relaxed text-white/80">
                              {activeBodyData.description}
                            </p>
                          </div>
                          
                          {activeBodyData.funFact && (
                            <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                              <p className="text-xs italic text-white/60 leading-relaxed font-serif">
                                {activeBodyData.funFact}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile Expand Button - Fixed at bottom */}
                <div className="md:hidden absolute bottom-4 left-0 right-0 flex justify-center bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2">
                  <button 
                    onClick={() => setIsCardExpanded(!isCardExpanded)}
                    className="text-[10px] uppercase tracking-widest text-accent border border-accent/30 bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 hover:bg-accent/10 transition-colors shadow-lg"
                  >
                    {isCardExpanded ? 'Menos info' : 'Más info'}
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
        {/* Footer */}
        <footer className="p-4 md:p-10 flex flex-col md:flex-row justify-between items-center md:items-end w-full relative z-10 gap-2 pointer-events-none">
          <div className="text-[10px] md:text-xs text-white/30 uppercase tracking-widest font-mono text-center md:text-left">
            {`SECTOR: ${activeBodyData?.isFictional ? 'EXTRAGALÁCTICO' : 'VÍA LÁCTEA'}`}
          </div>
          <div className="text-[10px] md:text-xs text-accent/60 uppercase tracking-widest font-mono flex gap-4">
            <span className="hidden sm:inline">PAN: CLIC DERECHO</span>
            <span className="hidden sm:inline">ORBITAR: CLIC IZQUIERDO</span>
            <span className="sm:hidden">TOQUE PARA EXPLORAR</span>
          </div>
        </footer>
        </>
      )}
      
      {/* Cinematic Travel Overlay */}
      <AnimatePresence>
        {(cinematicState === 'JUMPING_TO_FICTION' || cinematicState === 'JUMPING_TO_REAL') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none"
          >
            {/* Hyperspace speed lines effect via pure CSS or just text for now */}
            <motion.div 
              initial={{ scale: 0.8, filter: 'blur(4px)' }}
              animate={{ scale: 1.2, filter: 'blur(0px)' }}
              transition={{ duration: 4 }}
              className="flex flex-col items-center justify-center w-full max-w-4xl px-6"
            >
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-widest text-accent mb-4 uppercase text-center w-full break-words">
                {cinematicState === 'JUMPING_TO_FICTION' ? 'Anomalía Detectada' : 'Sistema Seguro'}
              </h1>
              <p className="text-sm sm:text-base md:text-xl text-white/70 tracking-widest uppercase mb-8 text-center w-full break-words">
                {cinematicState === 'JUMPING_TO_FICTION' ? 'Iniciando salto a galaxia de ciencia ficción...' : 'Iniciando salto a la Vía Láctea...'}
              </p>
              
              <div className="w-full max-w-2xl italic text-white/50 text-sm md:text-lg border-l-4 border-accent pl-4 text-left">
                {cinematicState === 'JUMPING_TO_FICTION' 
                  ? '"El amor es lo único que somos capaces de percibir que trasciende las dimensiones del tiempo y del espacio."'
                  : '"Mira ese punto. Eso es aquí. Eso es nuestro hogar. Eso somos nosotros."'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sucked In Event Overlay */}
      <AnimatePresence>
        {cinematicState === 'SUCKED_IN' && (
          <motion.div
            initial={{ opacity: 0, backgroundColor: 'rgba(255,0,0,0)' }}
            animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,1)' }}
            transition={{ duration: 3 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1, color: '#ff2222' }}
              transition={{ duration: 1 }}
              className="text-center bg-black/50 p-10 rounded-3xl backdrop-blur-xl border border-red-500/20"
            >
              <h1 className="text-3xl md:text-6xl font-bold tracking-widest md:tracking-[0.5em] mb-4 uppercase px-2 text-red-500">
                PELIGRO
              </h1>
              <p className="text-xs md:text-xl text-white/70 tracking-wider md:tracking-widest uppercase">
                Horizonte de sucesos cruzado.<br/>Integridad estructural comprometida.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Piloting HUD */}
      <AnimatePresence>
        {isPiloting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-30 flex flex-col items-center justify-center"
          >
            {/* Crosshair */}
            <div className="w-1 h-1 bg-accent rounded-full mb-10 opacity-70"></div>
            <div className="w-8 h-8 border border-white/20 rounded-full absolute"></div>
            
            {/* Ship Selector */}
            <div className="absolute bottom-40 pointer-events-auto flex items-center gap-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <button 
                onClick={() => {
                  setShipModel(shipModel === 'ranger' ? 'ufo' : (shipModel === 'ufo' ? 'xwing' : 'ranger'));
                  if (!isMuted) sound.playUIClick();
                }}
                className="text-white/50 hover:text-accent transition-colors px-2"
                title="Modelo Anterior"
              >
                ◀
              </button>
              <span className="text-accent font-mono text-sm uppercase tracking-widest min-w-[100px] text-center">
                {shipModel === 'ranger' ? 'Ranger' : (shipModel === 'ufo' ? 'OVNI' : 'Caza Espacial')}
              </span>
              <button 
                onClick={() => {
                  setShipModel(shipModel === 'ranger' ? 'xwing' : (shipModel === 'xwing' ? 'ufo' : 'ranger'));
                  if (!isMuted) sound.playUIClick();
                }}
                className="text-white/50 hover:text-accent transition-colors px-2"
                title="Modelo Siguiente"
              >
                ▶
              </button>
            </div>

            {/* Piloting Instructions */}
            <div className="absolute bottom-20 sm:bottom-10 mx-4 max-w-sm bg-black/50 backdrop-blur-md px-6 py-4 rounded-xl border border-accent/30 text-center pointer-events-auto">
              <p className="text-accent font-mono text-xs sm:text-sm mb-2 uppercase tracking-widest">Tour Cinematográfico</p>
              <p className="text-white/70 text-[10px] sm:text-xs leading-relaxed">
                La nave sigue una ruta predefinida.<br/>
                <span className="font-bold text-white">Arrastra o desliza</span> para mirar por las ventanas. <br/>
                Pulsa el icono de la nave para salir.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
