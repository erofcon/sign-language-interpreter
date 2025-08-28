import { Quaternion, Vector3 } from 'three'
import type { VRM } from '@pixiv/three-vrm'
import type { CalibrationArmState } from '@/retarget/arm/types.ts'
import type { VRMBones } from '@/retarget/types.ts'
import { applyBoneRotation, processArmLandmarks, scaleLimbToModel } from '@/retarget/arm/utils.ts'
import { solveBoneIK } from '@/retarget/arm/ik.ts'

// Smooth quaternion transitions
class QuaternionSmoother {
  private lastQuat: Quaternion | null = null

  smooth(q: Quaternion, weight = 0.3): Quaternion {
    if (!this.lastQuat) {
      this.lastQuat = q.clone()
      return q
    }

    this.lastQuat.slerp(q, weight)
    return this.lastQuat.clone()
  }
}

const upperSmoother = new QuaternionSmoother()
const lowerSmoother = new QuaternionSmoother()

function retargetToVRMArm(
  vrm: VRM,
  calibration: CalibrationArmState,
  extractedLandmarks: VRMBones,
) {
  // Convert MediaPipe landmarks to world positions
  const processedArm = processArmLandmarks(vrm, extractedLandmarks, calibration.rightArm.upper)

  // Keep real elbow position for pole vector
  const realElbowPos = processedArm.lower.clone()

  // Scale to match model bone lengths
  const scaled = scaleLimbToModel(
    processedArm.upper,
    processedArm.lower,
    processedArm.hand,
    calibration.length.upper,
    calibration.length.lower,
  )

  // Use real elbow as pole vector
  const pole = realElbowPos

  // Up hints for natural bone orientation
  const upHintForShoulder = new Vector3(0, 1, 0)
  const upHintForElbow = new Vector3(0, 1, 0)

  // Solve IK
  const ik = solveBoneIK(
    scaled.base,
    scaled.tip,
    pole,
    calibration.length.upper,
    calibration.length.lower,
    upHintForShoulder,
    upHintForElbow,
  )

  let worldUpper = ik.upperQuaternion.clone()
  let worldLower = ik.lowerQuaternion.clone()

  // Apply smoothing
  worldUpper = upperSmoother.smooth(worldUpper, 0.4)
  worldLower = lowerSmoother.smooth(worldLower, 0.4)

  // Apply rotations to bones
  const parentWorldQuatUpper = calibration.rightArm.upper.parent!.getWorldQuaternion(
    new Quaternion(),
  )

  applyBoneRotation(calibration.rightArm.upper, worldUpper, parentWorldQuatUpper)

  const upperWorldQuatNow = calibration.rightArm.upper.getWorldQuaternion(new Quaternion())
  applyBoneRotation(calibration.rightArm.lower, worldLower, upperWorldQuatNow)

  // Update matrices
  calibration.rightArm.upper.parent!.updateWorldMatrix(true, true)
}

export { retargetToVRMArm }
