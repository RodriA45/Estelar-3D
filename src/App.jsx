import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import Universe from './components/Canvas/Universe';
import Overlay from './components/UI/Overlay';
import TourGuide from './components/UI/TourGuide';
import { celestialBodies } from './data/celestialData';
import { sound } from './utils/soundEngine';
import './index.css';

function Loader({ isLoaded }) {
  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(20px)' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="fixed inset-0 bg-black flex flex-col justify-center items-center z-50 pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 border-t-2 border-r-2 border-white/20 rounded-full animate-spin mb-8 relative">
              <div className="absolute inset-0 border-t-2 border-l-2 border-accent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}></div>
            </div>
            
            <h1 className="text-h2 tracking-[0.2em] text-white/90 mb-2 font-display">ESTELAR</h1>
            <div className="flex gap-1 mb-8">
              <motion.div 
                animate={{ opacity: [0, 1, 0] }} 
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                className="w-1 h-1 bg-accent rounded-full"
              />
              <motion.div 
                animate={{ opacity: [0, 1, 0] }} 
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-1 h-1 bg-accent rounded-full"
              />
              <motion.div 
                animate={{ opacity: [0, 1, 0] }} 
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-1 h-1 bg-accent rounded-full"
              />
            </div>
            
            <p className="text-xs uppercase tracking-[0.3em] text-white/40 font-mono animate-pulse">
              Calibrando Sensores Cuánticos...
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function App() {
  const [activeTarget, setActiveTarget] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cameraDistance, setCameraDistance] = useState(150);
  const [cinematicState, setCinematicState] = useState(null);
  const [resetCameraToggle, setResetCameraToggle] = useState(false);
  const [timeScale, setTimeScale] = useState(1); // 1 = Real time, 1000 = Fast forward
  const [isPiloting, setIsPiloting] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [shipModel, setShipModel] = useState('ranger'); // 'ranger', 'xwing', 'ufo'
  const [dpr, setDpr] = useState(1.75); // auto-lowered if the frame rate drops
  // Parse initial target from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('target');
    if (target) {
      setActiveTarget(target);
    }
  }, []);

  useEffect(() => {
    // Simulate loading shaders and data
    const timer = setTimeout(() => {
      setIsLoaded(true);
      // Wait for user gesture to initialize sound, we will set drone volume here anyway
      // so when it eventually initializes on click, it fades in
      sound.setDroneVolume(0.3, 5); 
    }, 2000);
    
    // Sync pointer lock state with piloting state
    const handlePointerLockChange = () => {
      if (!document.pointerLockElement) {
        setIsPiloting(false);
      }
    };
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

  // Update drone pitch when target changes
  useEffect(() => {
    if (activeTarget) {
      // Sync URL
      const url = new URL(window.location);
      url.searchParams.set('target', activeTarget);
      window.history.replaceState({}, '', url);

      const body = celestialBodies.find(b => b.id === activeTarget);
      if (body) {
        sound.setDronePitch(body.id, body.size);
      }
    } else {
      // Clear URL
      const url = new URL(window.location);
      url.searchParams.delete('target');
      window.history.replaceState({}, '', url);
      
      sound.setDronePitch('space', 1.0); // Default space pitch
    }
  }, [activeTarget]);

  // Keyboard shortcuts for time control
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in a search input
      if (e.target.tagName.toLowerCase() === 'input') return;

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowRight':
          setTimeScale(prev => Math.min(prev * 10, 100000));
          if (!sound.isMuted) sound.playUIClick();
          break;
        case 'ArrowDown':
        case 'ArrowLeft':
          setTimeScale(prev => Math.max(prev / 10, 1));
          if (!sound.isMuted) sound.playUIClick();
          break;
        case '1': setTimeScale(1); if (!sound.isMuted) sound.playUIClick(); break;
        case '2': setTimeScale(10); if (!sound.isMuted) sound.playUIClick(); break;
        case '3': setTimeScale(100); if (!sound.isMuted) sound.playUIClick(); break;
        case '4': setTimeScale(1000); if (!sound.isMuted) sound.playUIClick(); break;
        case '5': setTimeScale(10000); if (!sound.isMuted) sound.playUIClick(); break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Loader isLoaded={isLoaded} />
      
      {/* 3D Scene */}
      <div className="absolute inset-0 bg-black">
        <Canvas
          shadows={{ type: THREE.PCFShadowMap }}
          camera={{ position: [0, 0, 100], fov: 45, near: 0.001, far: 30000 }}
          dpr={dpr}
          gl={{ 
            antialias: true, 
            powerPreference: 'high-performance', 
            logarithmicDepthBuffer: true,
            toneMapping: THREE.ReinhardToneMapping,
            toneMappingExposure: 1.5
          }}
        >
          <color attach="background" args={['#020204']} />
          {/* If the sustained frame rate drops, quietly render at a lower
              resolution instead of staying sharp and choppy. Recovers back
              up to 1.75x if performance improves again. */}
          <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.75)} />
          <AdaptiveDpr pixelated={false} />
          <AdaptiveEvents />
          <Suspense fallback={null}>
            <Universe 
              activeTarget={activeTarget} 
              setActiveTarget={setActiveTarget} 
              setCameraDistance={setCameraDistance}
              cinematicState={cinematicState}
              setCinematicState={setCinematicState}
              resetCameraToggle={resetCameraToggle}
              timeScale={timeScale}
              isPiloting={isPiloting}
              shipModel={shipModel}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Cinematic Tour UI */}
      {isLoaded && (
        <TourGuide 
          isTourActive={isTourActive} 
          setIsTourActive={setIsTourActive} 
          setActiveTarget={setActiveTarget}
          setCinematicState={setCinematicState}
          onResetCamera={() => setResetCameraToggle(prev => !prev)}
        />
      )}

      {/* 2D UI Overlay */}
      {isLoaded && (
        <Overlay 
          activeTarget={activeTarget}
          setActiveTarget={setActiveTarget}
          cameraDistance={cameraDistance}
          cinematicState={cinematicState}
          setCinematicState={setCinematicState}
          onResetCamera={() => setResetCameraToggle(prev => !prev)}
          timeScale={timeScale}
          setTimeScale={setTimeScale}
          isPiloting={isPiloting}
          setIsPiloting={setIsPiloting}
          shipModel={shipModel}
          setShipModel={setShipModel}
          isTourActive={isTourActive}
          setIsTourActive={setIsTourActive}
        />
      )}
    </>
  );
}

export default App;
