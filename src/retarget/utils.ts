import { Vector3 } from 'three'
import type { Landmark } from '@mediapipe/holistic'
import type { InversionOptions, VRMLandmarks } from '@/retarget/types.ts'

function convertLandmarkToThreeVector(mp_landmark: Landmark, option: InversionOptions): Vector3 {
  // MediaPipe to Three.js coordinate conversion
  let x = (mp_landmark.x - 0.5) * 2 // Center and scale
  let y = (mp_landmark.y - 0.5) * 2
  let z = mp_landmark.z * 2

  if (option?.x) x *= -1
  if (option?.y) y *= -1
  if (option?.z) z *= -1

  return new Vector3(x, y, z)
}

function extractMPLandmarkToVRM(landmarks: Landmark[]): VRMLandmarks {
  if (landmarks.length < 33) {
    console.log('landmarks length < 33')
    return
  }

  // MediaPipe indices for right arm
  const rightArmUpper = convertLandmarkToThreeVector(landmarks[12], {
    y: true,
    z: true,
  }) // Right shoulder
  const rightArmLower = convertLandmarkToThreeVector(landmarks[14], {
    y: true,
    z: true,
  }) // Right elbow
  const rightArmHand = convertLandmarkToThreeVector(landmarks[16], {
    y: true,
    z: true,
  }) // Right wrist

  // MediaPipe indices for right arm
  const leftArmUpper = convertLandmarkToThreeVector(landmarks[11], {
    x: true,
  }) // Left shoulder
  const leftArmLower = convertLandmarkToThreeVector(landmarks[13], {
    x: true,
  }) // Left elbow
  const leftArmHand = convertLandmarkToThreeVector(landmarks[15], {
    x: true,
  }) // Left wrist

  return {
    rightArm: {
      upper: rightArmUpper,
      lower: rightArmLower,
      hand: rightArmHand,
    },
    leftArm: {
      upper: leftArmUpper,
      lower: leftArmLower,
      hand: leftArmHand,
    },
  }
}

export { extractMPLandmarkToVRM }
