import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

interface HandTrackerProps {
  onUpdate: (factor: number, rotation: number, isDetected: boolean) => void;
  isActive: boolean;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onUpdate, isActive }) => {
  const webcamRef = useRef<Webcam>(null);
  const [model, setModel] = useState<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const lastFactor = useRef<number>(0.5);
  const lastRotation = useRef<number>(0);

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    const loadModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setModel(handLandmarker);
      } catch (e) {
        console.error("Error loading HandLandmarker:", e);
      }
    };
    loadModel();

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const processVideo = useCallback(() => {
    if (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4 &&
      model
    ) {
      const video = webcamRef.current.video;
      const results: HandLandmarkerResult = model.detectForVideo(video, performance.now());

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        // 1. Calculate Open/Close Factor
        const wrist = landmarks[0];
        const fingertips = [4, 8, 12, 16, 20];
        let totalDist = 0;

        fingertips.forEach(idx => {
          const tip = landmarks[idx];
          const dist = Math.sqrt(
            Math.pow(tip.x - wrist.x, 2) +
            Math.pow(tip.y - wrist.y, 2) +
            Math.pow(tip.z - wrist.z, 2)
          );
          totalDist += dist;
        });

        const avgDist = totalDist / 5;
        let factor = (avgDist - 0.2) / (0.4 - 0.2);
        factor = Math.max(0, Math.min(1, factor));

        // 2. Calculate Rotation (Roll)
        // Use Wrist (0) and Middle Finger MCP (9) to determine the hand's vertical axis
        const middleBase = landmarks[9];
        
        // Calculate vector from wrist to middle finger base
        // Note: x is inverted in webcam view if mirrored, but landmarks are usually normalized 0-1
        // We calculate angle relative to -Y axis (straight up)
        const dx = middleBase.x - wrist.x;
        const dy = middleBase.y - wrist.y;
        
        // Atan2 returns angle in radians. 
        // We want 0 to be "upright".
        // In screen coords, +y is down. So upright hand, dy is negative.
        // Math.atan2(dy, dx) for (0, -1) is -PI/2.
        // We adjust so upright is 0.
        let rawRotation = Math.atan2(dy, dx) + Math.PI / 2;
        
        // Clamp or normalize if needed, but raw radians works for rotation matrix
        
        // Smooth the values
        lastFactor.current = lastFactor.current + (factor - lastFactor.current) * 0.1;
        // Simple lerp for rotation - handle wrap around if necessary, but for hand gestures usually fine
        lastRotation.current = lastRotation.current + (rawRotation - lastRotation.current) * 0.1;

        onUpdate(lastFactor.current, -lastRotation.current, true); // Invert rotation for mirror feel
      } else {
        // No hand detected
        onUpdate(lastFactor.current, lastRotation.current, false);
      }
    }
    requestRef.current = requestAnimationFrame(processVideo);
  }, [model, onUpdate]);

  useEffect(() => {
    if (isActive && model) {
      requestRef.current = requestAnimationFrame(processVideo);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isActive, model, processVideo]);

  if (!isActive) return null;

  return (
    <div className="absolute bottom-4 right-4 z-50 border-2 border-holo-500 rounded-lg overflow-hidden w-48 h-36 bg-black shadow-[0_0_15px_rgba(0,191,255,0.3)]">
      <Webcam
        ref={webcamRef}
        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
        screenshotFormat="image/jpeg"
        videoConstraints={{
          width: 320,
          height: 240,
          facingMode: "user"
        }}
      />
      <div className="absolute top-0 left-0 bg-black/50 text-white text-[10px] px-1 font-mono">
        SENSOR ACTIVE
      </div>
      {!model && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-holo-400 font-mono text-xs">
          Loading AI Model...
        </div>
      )}
    </div>
  );
};

export default HandTracker;