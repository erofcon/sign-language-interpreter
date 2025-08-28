import type { VRM } from '@pixiv/three-vrm'
import type { CalibrationArmState } from '@/retarget/arm/types.ts'
import { extractMPLandmarkToVRM } from '@/retarget/utils.ts'
import type { Landmark } from '@mediapipe/holistic'
import { retargetToVRMArm } from '@/retarget/arm/rig.ts'

function animate(vrm: VRM, calibration: CalibrationArmState, mp_landmarks: Landmark[]) {
  const extractedLandmarks = extractMPLandmarkToVRM(mp_landmarks)
  retargetToVRMArm(vrm, calibration, extractedLandmarks)
}

export { animate }
