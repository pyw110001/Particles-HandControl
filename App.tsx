import React, { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ParticleSystem from './components/ParticleSystem';
import HandTracker from './components/HandTracker';
import HoloPanel from './components/HoloPanel';
import { AppMode, ColorTheme, HandGestureState } from './types';

// Initial Gradient: Deep Blue -> Teal -> Aquamarine
const INITIAL_THEME: ColorTheme = {
  name: 'Default Nebula',
  start: '#0F4C75',
  mid: '#00CED1',
  end: '#7FFFD4'
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DEMO);
  const [theme, setTheme] = useState<ColorTheme>(INITIAL_THEME);
  const [gestureState, setGestureState] = useState<HandGestureState>({
    isHandDetected: false,
    isOpen: true,
    expansionFactor: 0.5,
    rotation: 0
  });

  const handleHandUpdate = useCallback((factor: number, rotation: number, isDetected: boolean) => {
    setGestureState({
      isHandDetected: isDetected,
      expansionFactor: factor,
      isOpen: factor > 0.4, // Threshold for visual feedback
      rotation: rotation
    });
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 20], fov: 60 }} gl={{ antialias: false }}>
          <color attach="background" args={['#000510']} />
          <ambientLight intensity={0.5} />
          
          <ParticleSystem 
            count={70000} 
            expansion={mode === AppMode.INTERACTIVE ? gestureState.expansionFactor : 0.5} 
            isHovering={mode === AppMode.INTERACTIVE && gestureState.isHandDetected}
            rotation={mode === AppMode.INTERACTIVE ? gestureState.rotation : 0}
            theme={theme}
          />
          
          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            minDistance={5}
            maxDistance={50}
            autoRotate={mode === AppMode.DEMO} 
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 3}
          />
        </Canvas>
      </div>

      {/* Logic Layer: Webcam & Computer Vision */}
      <HandTracker 
        onUpdate={handleHandUpdate} 
        isActive={mode === AppMode.INTERACTIVE} 
      />

      {/* UI Layer */}
      <HoloPanel 
        mode={mode} 
        setMode={setMode} 
        currentTheme={theme} 
        setTheme={setTheme}
        gestureState={gestureState}
      />

    </div>
  );
};

export default App;