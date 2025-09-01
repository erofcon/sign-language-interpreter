import type { Landmark } from '@mediapipe/holistic'

const PoseLandmark = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
}

function correctShoulderAsymmetry(landmarks: Landmark[]): Landmark[] {

  // TODO: maybe need to remove JSON.parse?

  const correctedLandmarks: Landmark[] = JSON.parse(JSON.stringify(landmarks))
  const leftShoulder = correctedLandmarks[PoseLandmark.LEFT_SHOULDER]
  const rightShoulder = correctedLandmarks[PoseLandmark.RIGHT_SHOULDER]
  const midY = (leftShoulder.y + rightShoulder.y) / 2
  const midZ = (leftShoulder.z + rightShoulder.z) / 2
  const leftDelta = { y: midY - leftShoulder.y, z: midZ - leftShoulder.z }
  const rightDelta = { y: midY - rightShoulder.y, z: midZ - rightShoulder.z }
  leftShoulder.y += leftDelta.y
  leftShoulder.z += leftDelta.z
  rightShoulder.y += rightDelta.y
  rightShoulder.z += rightDelta.z
  ;[PoseLandmark.LEFT_ELBOW, PoseLandmark.LEFT_WRIST].forEach((index) => {
    correctedLandmarks[index].y += leftDelta.y
    correctedLandmarks[index].z += leftDelta.z
  })
  ;[PoseLandmark.RIGHT_ELBOW, PoseLandmark.RIGHT_WRIST].forEach((index) => {
    correctedLandmarks[index].y += rightDelta.y
    correctedLandmarks[index].z += rightDelta.z
  })
  return correctedLandmarks
}

function correctHipAsymmetry(landmarks: Landmark[]): Landmark[] {
  const correctedLandmarks: Landmark[] = JSON.parse(JSON.stringify(landmarks))

  const leftHip = correctedLandmarks[PoseLandmark.LEFT_HIP]
  const rightHip = correctedLandmarks[PoseLandmark.RIGHT_HIP]

  const midY = (leftHip.y + rightHip.y) / 2
  const midZ = (leftHip.z + rightHip.z) / 2

  leftHip.y = midY
  rightHip.y = midY
  leftHip.z = midZ
  rightHip.z = midZ

  return correctedLandmarks
}

function correctSpineAlignment(landmarks: Landmark[]): Landmark[] {
  const correctedLandmarks: Landmark[] = JSON.parse(JSON.stringify(landmarks))
  const leftShoulder = correctedLandmarks[PoseLandmark.LEFT_SHOULDER]
  const rightShoulder = correctedLandmarks[PoseLandmark.RIGHT_SHOULDER]
  const leftHip = correctedLandmarks[PoseLandmark.LEFT_HIP]
  const rightHip = correctedLandmarks[PoseLandmark.RIGHT_HIP]
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2
  const shoulderCenterZ = (leftShoulder.z + rightShoulder.z) / 2
  const hipCenterX = (leftHip.x + rightHip.x) / 2
  const hipCenterZ = (leftHip.z + rightHip.z) / 2
  const delta = {
    x: shoulderCenterX - hipCenterX,
    z: shoulderCenterZ - hipCenterZ,
  }
  ;[PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP].forEach((index) => {
    correctedLandmarks[index].x += delta.x
    correctedLandmarks[index].z += delta.z
  })
  return correctedLandmarks
}

export function applyPoseCorrections(landmarks: Landmark[]): Landmark[] {
  if (!landmarks || landmarks.length === 0) {
    return []
  }

  let correctedLandmarks = correctShoulderAsymmetry(landmarks)

  correctedLandmarks = correctHipAsymmetry(correctedLandmarks)
  correctedLandmarks = correctSpineAlignment(correctedLandmarks)

  return correctedLandmarks
}
