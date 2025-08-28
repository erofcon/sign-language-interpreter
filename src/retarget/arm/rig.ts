import { Quaternion, Vector3 } from 'three'
import type { VRM } from '@pixiv/three-vrm'
import type { CalibrationArmState } from '@/retarget/arm/types.ts'
import { applyBoneRotation, processArmLandmarks, scaleLimbToModel } from '@/retarget/arm/utils.ts'
import { solveBoneIK } from '@/retarget/arm/ik.ts'
import type { ArmLandmarks, VRMLandmarks } from '@/retarget/types.ts'

function animArm(vrm: VRM, armCalibration: ArmCouple, arm: ArmLandmarks) {
  const processedRightArm = processArmLandmarks(vrm, arm, armCalibration.bones.upper)

  // Keep real elbow position for pole vector
  const realElbowPos = processedRightArm.lower.clone()

  // Scale to match model bone lengths
  const scaled = scaleLimbToModel(
    processedRightArm.upper,
    processedRightArm.lower,
    processedRightArm.hand,
    armCalibration.length.upper,
    armCalibration.length.lower,
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
    armCalibration.length.upper,
    armCalibration.length.lower,
    upHintForShoulder,
    upHintForElbow,
  )

  let worldUpper = ik.upperQuaternion.clone()
  let worldLower = ik.lowerQuaternion.clone()

  // Apply rotations to bones
  const parentWorldQuatUpper = armCalibration.bones.upper.parent!.getWorldQuaternion(
    new Quaternion(),
  )

  applyBoneRotation(armCalibration.bones.upper, worldUpper, parentWorldQuatUpper)

  const upperWorldQuatNow = armCalibration.bones.upper.getWorldQuaternion(new Quaternion())
  applyBoneRotation(armCalibration.bones.lower, worldLower, upperWorldQuatNow)

  // Update matrices
  armCalibration.bones.upper.parent!.updateWorldMatrix(true, true)
}

function retargetToVRMArm(
  vrm: VRM,
  calibration: CalibrationArmState,
  extractedLandmarks: VRMLandmarks,
) {
  // RightArm

  animArm(vrm, calibration.rightArm, extractedLandmarks.rightArm)

  vrm.scene.updateMatrixWorld(true)
  // LeftArm
  // vrm.scene.updateMatrixWorld(true)
  animArm(vrm, calibration.leftArm, extractedLandmarks.leftArm)
  // vrm.scene.updateMatrixWorld(true)
}

export { retargetToVRMArm }
