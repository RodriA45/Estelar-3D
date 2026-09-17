import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { celestialBodies } from '../../data/celestialData';
import { sound } from '../../utils/soundEngine';

const tourStops = [
  { id: 'sun', text: 'El Sol. Una estrella enana amarilla de tipo G, el motor incandescente que da vida a nuestro sistema solar y mantiene a todos los planetas en su abrazo gravitacional.' },
  { id: 'earth', text: 'La Tierra. Un oasis azul pálido en la inmensidad oscura. El único lugar conocido del universo capaz de albergar la chispa de la vida.' },
  { id: 'mars', text: 'Marte. El planeta rojo. Un mundo desértico, frío y silencioso, que alguna vez fluyó con ríos de agua, hoy custodiado por la montaña más alta del sistema solar.' },
  { id: 'jupiter', text: 'Júpiter. El rey de los planetas. Un gigante gaseoso colosal compuesto de tormentas eternas, protegiendo a los planetas interiores de los asteroides rebeldes.' },
  { id: 'saturn', text: 'Saturno. La joya del sistema solar. Sus magníficos anillos de hielo y roca bailan en una órbita perfecta alrededor del gigante gaseoso.' },
  { id: 'trappist-1', text: 'TRAPPIST-1. Una enana roja ultrafría rodeada por siete planetas rocosos del tamaño de la Tierra, un sistema solar miniatura fascinante.' },
  { id: 'betelgeuse', text: 'Betelgeuse. Una supergigante roja colosal al borde de su muerte. Si estuviera en el lugar del Sol, devoraría hasta la órbita de Júpiter.' },
  { id: 'pulsar', text: 'Púlsar PSR B1919+21. El cadáver de una estrella masiva girando furiosamente y disparando faros de radiación desde sus polos.' },
  { id: 'tatooine', text: 'Tatooine. Un mundo desértico mítico iluminado por la cálida luz de soles gemelos bailando en el horizonte.' },
  { id: 'miller', text: 'Planeta de Miller. Un océano infinito donde colosales olas rozan las nubes, y el abrazo gravitacional distorsiona el tiempo mismo.' },
  { id: 'gargantua', text: 'Gargantúa. Una anomalía supermasiva al borde de nuestra comprensión. El tiempo se distorsiona cerca de su horizonte de sucesos.' }
];

export default function TourGuide({ isTourActive, setIsTourActive, setActiveTarget, setCinematicState, onResetCamera }) {
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [showFictionPrompt, setShowFictionPrompt] = useState(false);

  useEffect(() => {
    if (!isTourActive) {
      setCurrentStopIndex(0);
      setDisplayedText('');
      setShowFictionPrompt(false);
      return;
    }

    if (showFictionPrompt) return;

    const currentStop = tourStops[currentStopIndex];
    let charIndex = 0;
    
    // Switch to the target
    setActiveTarget(currentStop.id);
    // If it's Gargantua (fictional), we might need to trigger the jump effect, but let's just teleport smoothly
    
    // Typewriter effect
    const typingInterval = setInterval(() => {
      if (charIndex <= currentStop.text.length) {
        setDisplayedText(currentStop.text.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 40);

    // Next stop after 12 seconds
    const nextStopTimeout = setTimeout(() => {
      if (currentStopIndex < tourStops.length - 1) {
        setDisplayedText('');
        // Trigger jump if moving to fictional universe
        const nextTarget = celestialBodies.find(b => b.id === tourStops[currentStopIndex + 1].id);
        const currentTargetData = celestialBodies.find(b => b.id === currentStop.id);
        if (currentTargetData && nextTarget && !currentTargetData.isFictional && nextTarget.isFictional) {
          setShowFictionPrompt(true);
        } else if (currentTargetData && nextTarget && currentTargetData.isFictional !== nextTarget.isFictional) {
          setCinematicState('JUMPING_TO_REAL');
          sound.playWarpJump();
          setTimeout(() => {
            setCinematicState(null);
            setCurrentStopIndex(prev => prev + 1);
          }, 3000);
        } else {
          setCurrentStopIndex(prev => prev + 1);
        }
      } else {
        // End tour
        setIsTourActive(false);
        setActiveTarget(null);
        if (onResetCamera) onResetCamera();
      }
    }, 12000);

    return () => {
      clearInterval(typingInterval);
      clearTimeout(nextStopTimeout);
    };
  }, [isTourActive, currentStopIndex, setActiveTarget, setCinematicState]);

  return (
    <AnimatePresence>
      {isTourActive && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="absolute bottom-10 left-0 right-0 flex justify-center items-end pointer-events-none z-50 px-6"
        >
          <div className="max-w-4xl w-full relative">
            <button
              onClick={() => {
                setIsTourActive(false);
                setActiveTarget(null);
                if (onResetCamera) onResetCamera();
              }}
              className="fixed top-6 right-6 md:top-10 md:right-10 px-4 py-2 bg-black/40 hover:bg-white/20 border border-white/20 rounded backdrop-blur text-xs tracking-widest uppercase pointer-events-auto transition-colors z-[100]"
            >
              Finalizar Tour
            </button>
            {!showFictionPrompt && (
              <p className="text-xl md:text-3xl text-white font-display tracking-wider leading-relaxed text-center drop-shadow-2xl font-light">
                {displayedText}
                <span className="animate-pulse">_</span>
              </p>
            )}
            
            {showFictionPrompt && (
              <div className="bg-black/80 border border-accent/50 rounded-2xl p-6 md:p-10 backdrop-blur-xl max-w-2xl mx-auto text-center pointer-events-auto shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                <h3 className="text-2xl md:text-3xl text-accent font-display tracking-widest mb-4">LÍMITE DEL UNIVERSO OBSERVABLE</h3>
                <p className="text-white/80 tracking-wider mb-8">
                  El tour está a punto de abandonar el universo real mapeado y adentrarse en territorios de ciencia ficción y mundos imaginarios. ¿Deseas continuar?
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => {
                      setIsTourActive(false);
                      setActiveTarget(null);
                      if (onResetCamera) onResetCamera();
                    }}
                    className="px-6 py-3 bg-transparent border border-white/20 hover:bg-white/10 rounded tracking-widest uppercase transition-colors"
                  >
                    Finalizar Aquí
                  </button>
                  <button
                    onClick={() => {
                      setShowFictionPrompt(false);
                      setCinematicState('JUMPING_TO_FICTION');
                      sound.playWarpJump();
                      setTimeout(() => {
                        setCinematicState(null);
                        setCurrentStopIndex(prev => prev + 1);
                      }, 3000);
                    }}
                    className="px-6 py-3 bg-accent/20 border border-accent hover:bg-accent/40 text-accent hover:text-white rounded tracking-widest uppercase transition-colors"
                  >
                    Adentrarse en la Ficción
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
