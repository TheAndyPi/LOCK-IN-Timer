import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { VisionStatus } from '../types';

let faceModel: blazeface.BlazeFaceModel | null = null;
let objModel: cocoSsd.ObjectDetection | null = null;
let loadingPromise: Promise<void> | null = null;

export const loadModel = async () => {
  if (faceModel && objModel) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
      try {
        await tf.ready();
        console.log("TFJS Ready");
        
        // Load both models in parallel
        const [loadedFace, loadedObj] = await Promise.all([
             blazeface.load(),
             cocoSsd.load({ base: 'lite_mobilenet_v2' }) // Use lite version for speed
        ]);
        
        faceModel = loadedFace;
        objModel = loadedObj;
        console.log("Vision Models Loaded");
      } catch (e) {
          console.error("Failed to load Vision models", e);
      }
  })();
  
  return loadingPromise;
};

export const monitorUser = async (video: HTMLVideoElement): Promise<VisionStatus> => {
  const result: VisionStatus = {
      isPresent: false,
      hasPhone: false,
      isSlouching: false,
      isFacingAway: false
  };

  if (!faceModel || !objModel) return result;
  
  try {
      // 1. Object Detection (Phone)
      const objects = await objModel.detect(video);
      const phone = objects.find(obj => obj.class === 'cell phone' && obj.score > 0.5); 
      if (phone) {
          result.hasPhone = true;
      }

      // 2. Face Detection (Presence & Posture)
      const faces = await faceModel.estimateFaces(video, false);
      
      if (faces.length > 0) {
          result.isPresent = true;
          
          const face = faces[0] as any; 
          const start = face.topLeft as [number, number];
          const end = face.bottomRight as [number, number];
          const landmarks = face.landmarks as number[][];
          
          const faceY = (start[1] + end[1]) / 2; // Center Y
          const faceHeight = end[1] - start[1];
          const videoHeight = video.videoHeight || 240;

          // Heuristic 1: Leaning Back (Distance)
          if (faceHeight < videoHeight * 0.12) {
              result.isSlouching = true;
          }

          // Heuristic 2: Sliding Down (Vertical Drop)
          const isLeaningIn = faceHeight > videoHeight * 0.25;
          const isTooLow = faceY > videoHeight * 0.75; 

          if (isTooLow && !isLeaningIn) {
              result.isSlouching = true;
          }

          // Heuristic 3: Facing Away (Orientation)
          // landmarks: 0=rightEye, 1=leftEye, 2=nose, 3=mouth, 4=rightEar, 5=leftEar
          if (landmarks && landmarks.length >= 3) {
              const rightEye = landmarks[0];
              const leftEye = landmarks[1];
              const nose = landmarks[2];

              // Calculate horizontal position of nose relative to eyes
              // Standard View: Right Eye (x low) ... Nose ... Left Eye (x high)
              const eyeDistance = Math.abs(leftEye[0] - rightEye[0]);
              
              if (eyeDistance > 0) {
                  // Normalize nose position. 0 = Right Eye, 1 = Left Eye. Center ~ 0.5
                  const noseRelativePos = (nose[0] - rightEye[0]) / (leftEye[0] - rightEye[0]);
                  
                  // If nose is too close to either eye (or outside), face is turned
                  // Thresholds: Look Left (ratio < 0.2), Look Right (ratio > 0.8)
                  if (noseRelativePos < 0.2 || noseRelativePos > 0.8) {
                      result.isFacingAway = true;
                  }
              }
          }
      }

  } catch (e) {
      console.warn("Detection error", e);
  }
  
  return result;
};