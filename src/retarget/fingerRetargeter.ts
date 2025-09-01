import { Bone, Euler, MathUtils, Matrix4, Quaternion, Vector3 } from 'three'
import type { VRM } from '@pixiv/three-vrm'
import { VRMHumanBoneName } from '@pixiv/three-vrm'
import type { Landmark } from '@mediapipe/holistic'

const HAND_SMOOTHING = 0.8
const FINGER_SMOOTHING = 0.95
const THUMB_YAW_DEG = 30

type HandSide = 'Left' | 'Right'

const HandLandmarks = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  LITTLE_MCP: 17,
  LITTLE_PIP: 18,
  LITTLE_DIP: 19,
  LITTLE_TIP: 20,
} as const

const LEFT_HAND_FINGER_MAP = {
  Thumb: [
    { bone: VRMHumanBoneName.LeftThumbMetacarpal, lm: [1, 2] },
    { bone: VRMHumanBoneName.LeftThumbProximal, lm: [2, 3] },
    { bone: VRMHumanBoneName.LeftThumbDistal, lm: [3, 4] },
  ],
  Index: [
    { bone: VRMHumanBoneName.LeftIndexProximal, lm: [5, 6] },
    { bone: VRMHumanBoneName.LeftIndexIntermediate, lm: [6, 7] },
    { bone: VRMHumanBoneName.LeftIndexDistal, lm: [7, 8] },
  ],
  Middle: [
    { bone: VRMHumanBoneName.LeftMiddleProximal, lm: [9, 10] },
    { bone: VRMHumanBoneName.LeftMiddleIntermediate, lm: [10, 11] },
    { bone: VRMHumanBoneName.LeftMiddleDistal, lm: [11, 12] },
  ],
  Ring: [
    { bone: VRMHumanBoneName.LeftRingProximal, lm: [13, 14] },
    { bone: VRMHumanBoneName.LeftRingIntermediate, lm: [14, 15] },
    { bone: VRMHumanBoneName.LeftRingDistal, lm: [15, 16] },
  ],
  Little: [
    { bone: VRMHumanBoneName.LeftLittleProximal, lm: [17, 18] },
    { bone: VRMHumanBoneName.LeftLittleIntermediate, lm: [18, 19] },
    { bone: VRMHumanBoneName.LeftLittleDistal, lm: [19, 20] },
  ],
} as const

const RIGHT_HAND_FINGER_MAP = {
  Thumb: [
    { bone: VRMHumanBoneName.RightThumbMetacarpal, lm: [1, 2] },
    { bone: VRMHumanBoneName.RightThumbProximal, lm: [2, 3] },
    { bone: VRMHumanBoneName.RightThumbDistal, lm: [3, 4] },
  ],
  Index: [
    { bone: VRMHumanBoneName.RightIndexProximal, lm: [5, 6] },
    { bone: VRMHumanBoneName.RightIndexIntermediate, lm: [6, 7] },
    { bone: VRMHumanBoneName.RightIndexDistal, lm: [7, 8] },
  ],
  Middle: [
    { bone: VRMHumanBoneName.RightMiddleProximal, lm: [9, 10] },
    { bone: VRMHumanBoneName.RightMiddleIntermediate, lm: [10, 11] },
    { bone: VRMHumanBoneName.RightMiddleDistal, lm: [11, 12] },
  ],
  Ring: [
    { bone: VRMHumanBoneName.RightRingProximal, lm: [13, 14] },
    { bone: VRMHumanBoneName.RightRingIntermediate, lm: [14, 15] },
    { bone: VRMHumanBoneName.RightRingDistal, lm: [15, 16] },
  ],
  Little: [
    { bone: VRMHumanBoneName.RightLittleProximal, lm: [17, 18] },
    { bone: VRMHumanBoneName.RightLittleIntermediate, lm: [18, 19] },
    { bone: VRMHumanBoneName.RightLittleDistal, lm: [19, 20] },
  ],
} as const

const HAND_FINGER_MAPS = {
  Left: LEFT_HAND_FINGER_MAP,
  Right: RIGHT_HAND_FINGER_MAP,
} as const

const FINGER_LM_INDEXES = {
  Thumb: [1, 2, 3, 4],
  Index: [5, 6, 7, 8],
  Middle: [9, 10, 11, 12],
  Ring: [13, 14, 15, 16],
  Little: [17, 18, 19, 20],
} as const

const deg = MathUtils.degToRad
const LIMITS = {
  finger: {
    flexMax: deg(95), // PIP/DIP
    extMax: deg(10),
    mcpFlexMax: deg(80),
    mcpAbductionBase: deg(22),
  },
  thumb: {
    flexMax: deg(70), // IP
    extMax: deg(15),
    mcpFlexMax: deg(65),
    mcpAbductionBase: deg(75),
    mcpAbductionExtra: deg(35),
    rollMax: deg(50), // roll X
  },
}

const bendSignForSide = (side: HandSide) => (side === 'Left' ? 1 : -1)

function getLandmarkVector(lm: Landmark): Vector3 {
  return new Vector3(lm.x, -lm.y, -lm.z)
}

function applyBoneRotation(
  bone: Bone,
  targetWorldQuat: Quaternion,
  parentWorldQuat: Quaternion,
  t: number,
) {
  const localQuat = parentWorldQuat.clone().invert().multiply(targetWorldQuat)
  bone.quaternion.slerp(localQuat, MathUtils.clamp(t, 0, 1))
}

function computeFingerCurl(
  handLandmarks: Landmark[],
  name: keyof typeof FINGER_LM_INDEXES,
): number {
  const ids = FINGER_LM_INDEXES[name]
  const p0 = getLandmarkVector(handLandmarks[ids[0]])
  const p1 = getLandmarkVector(handLandmarks[ids[1]])
  const p2 = getLandmarkVector(handLandmarks[ids[2]])
  const p3 = getLandmarkVector(handLandmarks[ids[3]])

  const v01 = p1.clone().sub(p0).normalize()
  const v12 = p2.clone().sub(p1).normalize()
  const v23 = p3.clone().sub(p2).normalize()

  const a1 = Math.acos(MathUtils.clamp(v01.dot(v12), -1, 1))
  const a2 = Math.acos(MathUtils.clamp(v12.dot(v23), -1, 1))
  return MathUtils.clamp((0.5 * (a1 + a2)) / deg(100), 0, 1)
}

function constrainHinge(localQuat: Quaternion, side: HandSide, isThumb: boolean): Quaternion {
  const e = new Euler().setFromQuaternion(localQuat, 'XYZ')
  const s = bendSignForSide(side)

  if (isThumb) {
    e.x = MathUtils.clamp(e.x, -LIMITS.thumb.rollMax, LIMITS.thumb.rollMax)
  } else {
    e.x = 0
  }

  if (isThumb) {
    e.z = 0
    const minY = Math.min(-LIMITS.thumb.extMax * s, LIMITS.thumb.flexMax * s)
    const maxY = Math.max(-LIMITS.thumb.extMax * s, LIMITS.thumb.flexMax * s)
    e.y = MathUtils.clamp(e.y, minY, maxY)
  } else {
    e.y = 0
    const minZ = Math.min(-LIMITS.finger.extMax * s, LIMITS.finger.flexMax * s)
    const maxZ = Math.max(-LIMITS.finger.extMax * s, LIMITS.finger.flexMax * s)
    e.z = MathUtils.clamp(e.z, minZ, maxZ)
  }

  return new Quaternion().setFromEuler(e)
}

function constrainMCP(
  localQuat: Quaternion,
  side: HandSide,
  isThumb: boolean,
  mcpAbductionScale = 1,
  adductionBoost = 0,
): Quaternion {
  const e = new Euler().setFromQuaternion(localQuat, 'XYZ')
  const s = bendSignForSide(side)

  if (isThumb) {
    e.x = MathUtils.clamp(e.x, -LIMITS.thumb.rollMax, LIMITS.thumb.rollMax)

    const abBase = LIMITS.thumb.mcpAbductionBase
    const abMax = abBase + LIMITS.thumb.mcpAbductionExtra * MathUtils.clamp(adductionBoost, 0, 1)
    e.z = MathUtils.clamp(e.z, -abMax, abMax)

    const minY = Math.min(-LIMITS.thumb.extMax * s, LIMITS.thumb.mcpFlexMax * s)
    const maxY = Math.max(-LIMITS.thumb.extMax * s, LIMITS.thumb.mcpFlexMax * s)
    e.y = MathUtils.clamp(e.y, minY, maxY)
  } else {
    e.x = 0

    const ab = LIMITS.finger.mcpAbductionBase * MathUtils.clamp(mcpAbductionScale, 0, 1)
    e.y = MathUtils.clamp(e.y, -ab, ab)
    e.y = MathUtils.lerp(e.y, 0, 0.5 * (1 - MathUtils.clamp(mcpAbductionScale, 0, 1)))

    const minZ = Math.min(-LIMITS.finger.extMax * s, LIMITS.finger.mcpFlexMax * s)
    const maxZ = Math.max(-LIMITS.finger.extMax * s, LIMITS.finger.mcpFlexMax * s)
    e.z = MathUtils.clamp(e.z, minZ, maxZ)
  }

  return new Quaternion().setFromEuler(e)
}

export class FingerRetargeter {
  private vrm: VRM

  constructor(vrm: VRM) {
    this.vrm = vrm
    this.vrm.scene.updateMatrixWorld(true)
  }

  public update(leftHand?: Landmark[], rightHand?: Landmark[]) {
    if (leftHand?.length === 21) {
      this.rigHand(leftHand, 'Left')
    }
    if (rightHand?.length === 21) {
      this.rigHand(rightHand, 'Right')
    }
    this.vrm.scene.updateMatrixWorld(true)
  }

  private rigHand(handLandmarks: Landmark[], side: HandSide) {
    const humanoid = this.vrm.humanoid
    if (!humanoid) return

    const handBone = humanoid.getNormalizedBoneNode(VRMHumanBoneName[`${side}Hand`]) as Bone | null
    if (handBone && handBone.parent) {
      const wrist = getLandmarkVector(handLandmarks[HandLandmarks.WRIST])
      const middleMcp = getLandmarkVector(handLandmarks[HandLandmarks.MIDDLE_MCP])
      const indexMcp = getLandmarkVector(handLandmarks[HandLandmarks.INDEX_MCP])

      const forward = new Vector3().subVectors(middleMcp, wrist).normalize()
      const up =
        side === 'Left'
          ? new Vector3().subVectors(indexMcp, wrist).cross(forward).normalize()
          : new Vector3().subVectors(wrist, indexMcp).cross(forward).normalize()

      const right = new Vector3().crossVectors(up, forward).normalize()
      const rotationMatrix = new Matrix4().makeBasis(right, up, forward)
      const worldQuat = new Quaternion().setFromRotationMatrix(rotationMatrix)

      const correctionQuat = new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        side === 'Left' ? Math.PI / 2 : -Math.PI / 2,
      )
      worldQuat.multiply(correctionQuat)

      const parentWorldQuat = handBone.parent.getWorldQuaternion(new Quaternion())
      applyBoneRotation(handBone, worldQuat, parentWorldQuat, HAND_SMOOTHING)
    }

    this.rigFingers(handLandmarks, side)
  }

  private rigFingers(handLandmarks: Landmark[], side: HandSide) {
    const humanoid = this.vrm.humanoid
    if (!humanoid) return

    const fingerMap = HAND_FINGER_MAPS[side]

    const thumbOffset = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      (side === 'Left' ? 1 : -1) * MathUtils.degToRad(THUMB_YAW_DEG),
    )

    const indexMcp = getLandmarkVector(handLandmarks[HandLandmarks.INDEX_MCP])
    const pinkyMcp = getLandmarkVector(handLandmarks[HandLandmarks.LITTLE_MCP])
    const palmWidth = Math.max(pinkyMcp.clone().sub(indexMcp).length(), 1e-5)

    const thumbTip = getLandmarkVector(handLandmarks[HandLandmarks.THUMB_TIP])
    const pinkyTip = getLandmarkVector(handLandmarks[HandLandmarks.LITTLE_TIP])
    const distThumbPinky = thumbTip.distanceTo(pinkyTip)
    const attractThreshold = palmWidth
    const attract01 = MathUtils.clamp((attractThreshold - distThumbPinky) / attractThreshold, 0, 1)
    const THUMB_ATTRACT_WEIGHT_MAX = 0.9
    const thumbAttractWeight = attract01 * THUMB_ATTRACT_WEIGHT_MAX

    const curlMap: Record<string, number> = {
      Thumb: computeFingerCurl(handLandmarks, 'Thumb'),
      Index: computeFingerCurl(handLandmarks, 'Index'),
      Middle: computeFingerCurl(handLandmarks, 'Middle'),
      Ring: computeFingerCurl(handLandmarks, 'Ring'),
      Little: computeFingerCurl(handLandmarks, 'Little'),
    }

    for (const [fingerName, joints] of Object.entries(fingerMap)) {
      for (const joint of joints) {
        const fingerBone = humanoid.getNormalizedBoneNode(joint.bone) as Bone | null
        if (!fingerBone || !fingerBone.parent) continue

        const parentWorldQuat = fingerBone.parent.getWorldQuaternion(new Quaternion())

        const lmStart = getLandmarkVector(handLandmarks[joint.lm[0] as number])
        const lmEnd = getLandmarkVector(handLandmarks[joint.lm[1] as number])
        const worldDir = new Vector3().subVectors(lmEnd, lmStart).normalize()

        let adductionBoost = 0
        const isThumb = fingerName === 'Thumb'
        const isHinge = joint.bone.includes('Intermediate') || joint.bone.includes('Distal')
        const isThumbBase =
          isThumb && (joint.bone.includes('Metacarpal') || joint.bone.includes('Proximal'))

        let worldDirForJoint = worldDir.clone()
        if (isThumbBase && thumbAttractWeight > 0) {
          const attractTarget = pinkyMcp
          const attractDir = new Vector3().subVectors(attractTarget, lmStart).normalize()
          worldDirForJoint
            .multiplyScalar(1 - thumbAttractWeight)
            .add(attractDir.multiplyScalar(thumbAttractWeight))
            .normalize()
          adductionBoost = attract01 // 0..1
        }

        const localTargetDir = worldDirForJoint
          .clone()
          .applyQuaternion(parentWorldQuat.clone().invert())

        const defaultDir = new Vector3(side === 'Left' ? -1 : 1, 0, 0)
        let localQuat = new Quaternion().setFromUnitVectors(defaultDir, localTargetDir)

        if (isThumb) {
          localQuat = thumbOffset.clone().multiply(localQuat)
        }

        let mcpAbductionScale = 1
        if (!isThumb && !isHinge) {
          const curl = MathUtils.clamp(curlMap[fingerName] ?? 0, 0, 1)
          mcpAbductionScale = Math.max(0, 1 - 0.9 * curl)
        }

        const constrained = isHinge
          ? constrainHinge(localQuat, side, isThumb)
          : constrainMCP(localQuat, side, isThumb, mcpAbductionScale, adductionBoost)

        fingerBone.quaternion.slerp(constrained, FINGER_SMOOTHING)
      }
    }
  }
}
