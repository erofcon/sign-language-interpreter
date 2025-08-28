import { Object3D, Quaternion, Vector3 } from 'three'
import { type VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import type { ArmBones, ArmLength } from '@/retarget/arm/types.ts'
import type { VRMBones } from '@/retarget/types.ts'

const EPS = 1e-6

// Get arm bones from VRM humanoid
function getArmBones(vrm: VRM): ArmBones {
  const humanoid = vrm.humanoid
  if (!humanoid) {
    console.log('humanoid not found')
    return
  }

  const upper = VRMHumanBoneName.RightUpperArm
  const lower = VRMHumanBoneName.RightLowerArm
  const hand = VRMHumanBoneName.RightHand

  return {
    upper: humanoid.getNormalizedBoneNode(upper),
    lower: humanoid.getNormalizedBoneNode(lower),
    hand: humanoid.getNormalizedBoneNode(hand),
  }
}

// Calculate bone lengths in world space
function computeArmBoneWorldLengths(bones: ArmBones): ArmLength {
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()

  bones.upper?.updateWorldMatrix(true, true)
  bones.lower?.updateWorldMatrix(true, true)
  bones.hand?.updateWorldMatrix(true, true)

  bones.upper?.getWorldPosition(a)
  bones.lower?.getWorldPosition(b)
  bones.hand?.getWorldPosition(c)

  const l1 = a.distanceTo(b)
  const l2 = b.distanceTo(c)

  return {
    upper: l1 > EPS ? l1 : 0.2,
    lower: l2 > EPS ? l2 : 0.2,
  }
}

// Convert MediaPipe landmarks to world positions
function processArmLandmarks(vrm: VRM, landmarks: VRMBones, anchor: Object3D): ArmBones {
  const modelAnchorPos = anchor.getWorldPosition(new Vector3())

  // Get MediaPipe positions
  const shoulderPos = landmarks.RightArm.upper
  const elbowPos = landmarks.RightArm.lower
  const handPos = landmarks.RightArm.hand

  // Scale factor for model size
  const scaleFactor = 1.5

  // Calculate vectors from shoulder
  const shoulderToElbow = new Vector3()
    .subVectors(elbowPos, shoulderPos)
    .multiplyScalar(scaleFactor)

  const shoulderToHand = new Vector3().subVectors(handPos, shoulderPos).multiplyScalar(scaleFactor)

  // Depth correction
  shoulderToElbow.z *= 1.1
  shoulderToHand.z *= 1.1

  // Convert to world coordinates
  const ikTargetElbow = new Vector3().addVectors(modelAnchorPos, shoulderToElbow)
  const ikTargetHand = new Vector3().addVectors(modelAnchorPos, shoulderToHand)

  return {
    upper: modelAnchorPos,
    lower: ikTargetElbow,
    hand: ikTargetHand,
  }
}

// Scale limb to match model bone lengths
function scaleLimbToModel(
  upper: Vector3,
  lower: Vector3,
  hand: Vector3,
  l1: number,
  l2: number,
): { base: Vector3; mid: Vector3; tip: Vector3 } {
  // Get directions
  const upperVecLm = new Vector3().subVectors(lower, upper)
  const lowerVecLm = new Vector3().subVectors(hand, lower)

  const l1Lm = upperVecLm.length()
  const l2Lm = lowerVecLm.length()

  // Normalize
  if (l1Lm > EPS) upperVecLm.divideScalar(l1Lm)
  if (l2Lm > EPS) lowerVecLm.divideScalar(l2Lm)

  // Scale to model lengths
  const midScaled = new Vector3().addVectors(upper, upperVecLm.multiplyScalar(l1))
  const tipScaled = new Vector3().addVectors(midScaled, lowerVecLm.multiplyScalar(l2))

  return {
    base: upper.clone(),
    mid: midScaled,
    tip: tipScaled,
  }
}

// Apply world rotation to bone
function applyBoneRotation(
  bone: Object3D | null,
  desiredWorldQuat: Quaternion,
  parentWorldQuat: Quaternion,
): void {
  if (!bone) return
  // Convert to local space
  const localQuat = parentWorldQuat.clone().invert().multiply(desiredWorldQuat)
  bone.quaternion.copy(localQuat)
  bone.updateWorldMatrix(false, true)
}

export {
  getArmBones,
  computeArmBoneWorldLengths,
  processArmLandmarks,
  scaleLimbToModel,
  applyBoneRotation,
}
