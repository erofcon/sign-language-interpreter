import { type VRM } from '@pixiv/three-vrm'
import { computeArmBoneWorldLengths, getArmBones } from '@/retarget/arm/utils.ts'
import type { CalibrationArmState } from '@/retarget/arm/types.ts'

function calibrationArm(vrm: VRM): CalibrationArmState {
  vrm.scene.updateMatrixWorld(true)

  // Get arm bones from VRM model
  const bones = getArmBones(vrm)

  // Calculate bone lengths in T-pose
  const RightLength = computeArmBoneWorldLengths(bones.rightArm.bones)
  const LeftLength = computeArmBoneWorldLengths(bones.leftArm.bones)

  bones.rightArm.length = RightLength
  bones.leftArm.length = LeftLength

  return bones
}

export { calibrationArm }
