import { Vector3 } from 'three'
import type { Landmark } from '@mediapipe/holistic'
import type { VRMBones } from '@/retarget/types.ts'

function convertLandmarkToThreeVector(mp_landmark: Landmark): Vector3 {
  // MediaPipe to Three.js coordinate conversion
  const x = (mp_landmark.x - 0.5) * 2 // Center and scale
  const y = -(mp_landmark.y - 0.5) * 2 // Invert Y
  const z = -mp_landmark.z * 2 // Invert Z for depth

  return new Vector3(x, y, z)
}

function extractMPLandmarkToVRM(landmarks: Landmark[]): VRMBones {
  if (landmarks.length < 33) {
    console.log('landmarks length < 33')
    return
  }

  // MediaPipe indices for right arm
  const rightArmUpper = convertLandmarkToThreeVector(landmarks[12]) // Right shoulder
  const rightArmLower = convertLandmarkToThreeVector(landmarks[14]) // Right elbow
  const rightArmHand = convertLandmarkToThreeVector(landmarks[16]) // Right wrist

  return {
    RightArm: {
      upper: rightArmUpper,
      lower: rightArmLower,
      hand: rightArmHand,
    },
  }
}

export { extractMPLandmarkToVRM }
