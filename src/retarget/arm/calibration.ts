import { type VRM } from '@pixiv/three-vrm'
import {
  computeArmBoneWorldLengths,
  getArmBones,
} from '@/retarget/arm/utils.ts'
import type { CalibrationArmState } from '@/retarget/arm/types.ts'

function calibrationArm(vrm: VRM): CalibrationArmState {
  vrm.scene.updateMatrixWorld(true)

  // Get arm bones from VRM model
  const bones = getArmBones(vrm)

  if (!bones.upper || !bones.lower || !bones.hand) {
    console.log('not found all bones')
    return
  }

  // Calculate bone lengths in T-pose
  const length = computeArmBoneWorldLengths(bones)

  return {
    rightArm: {
      upper: bones.upper,
      lower: bones.lower,
      hand: bones.hand,
    },
    length: length,
  }
}

export { calibrationArm }
