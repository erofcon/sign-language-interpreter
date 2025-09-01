import * as THREE from 'three'
import { type VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import type { Landmark } from '@medipe/holistic'

const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
} as const

type BoneRestData = {
  bone: THREE.Bone
  restDirection: THREE.Vector3
  restWorldQuaternion: THREE.Quaternion
}

interface PoseData {
  worldLandmarks?: Landmark[]
  screenLandmarks?: Landmark[]
}

export class HandRetargeter {
  private vrm: VRM
  private restPoseData = new Map<VRMHumanBoneName, BoneRestData>()

  private idlePoseQuaternions = new Map<VRMHumanBoneName, THREE.Quaternion>()

  private smoothingAlpha = 0.4

  constructor(vrm: VRM) {
    this.vrm = vrm
    this.vrm.scene.updateMatrixWorld(true)
    this.captureRestPose()
    this.captureIdlePose()
  }

  private captureIdlePose() {
    const boneNames: VRMHumanBoneName[] = [
      VRMHumanBoneName.LeftUpperArm,
      VRMHumanBoneName.LeftLowerArm,
      VRMHumanBoneName.RightUpperArm,
      VRMHumanBoneName.RightLowerArm,
    ]

    for (const boneName of boneNames) {
      const bone = this.vrm.humanoid?.getNormalizedBoneNode(boneName)
      if (bone) {
        // Теперь this.idlePoseQuaternions гарантированно является Map
        this.idlePoseQuaternions.set(boneName, bone.quaternion.clone())
      }
    }
  }

  public update(poseData: PoseData, confidenceThreshold = 0.7) {
    const { worldLandmarks, screenLandmarks } = poseData
    if (!worldLandmarks || !screenLandmarks || worldLandmarks.length === 0) {
      this.revertToIdle()
      return
    }

    const leftShoulderVis = screenLandmarks[POSE_LANDMARKS.LEFT_SHOULDER]?.visibility ?? 0
    const leftElbowVis = screenLandmarks[POSE_LANDMARKS.LEFT_ELBOW]?.visibility ?? 0
    const leftWristVis = screenLandmarks[POSE_LANDMARKS.LEFT_WRIST]?.visibility ?? 0

    if (leftShoulderVis > confidenceThreshold && leftElbowVis > confidenceThreshold) {
      const p1 = this.mpToThree(worldLandmarks[POSE_LANDMARKS.LEFT_SHOULDER])
      const p2 = this.mpToThree(worldLandmarks[POSE_LANDMARKS.LEFT_ELBOW])
      const targetDir = new THREE.Vector3().subVectors(p2, p1).normalize()
      this.rotateBone(VRMHumanBoneName.LeftUpperArm, targetDir)
    } else {
      this.rotateBone(VRMHumanBoneName.LeftUpperArm, null) // Сигнал для возврата в idle
    }

    if (leftElbowVis > confidenceThreshold && leftWristVis > confidenceThreshold) {
      const p1 = this.mpToThree(worldLandmarks[POSE_LANDMARKS.LEFT_ELBOW])
      const p2 = this.mpToThree(worldLandmarks[POSE_LANDMARKS.LEFT_WRIST])
      const targetDir = new THREE.Vector3().subVectors(p2, p1).normalize()
      this.rotateBone(VRMHumanBoneName.LeftLowerArm, targetDir)
    } else {
      this.rotateBone(VRMHumanBoneName.LeftLowerArm, null) // Сигнал для возврата в idle
    }

    const rightShoulderVis = screenLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER]?.visibility ?? 0
    const rightElbowVis = screenLandmarks[POSE_LANDMARKS.RIGHT_ELBOW]?.visibility ?? 0
    const rightWristVis = screenLandmarks[POSE_LANDMARKS.RIGHT_WRIST]?.visibility ?? 0

    if (rightShoulderVis > confidenceThreshold && rightElbowVis > confidenceThreshold) {
      const p1 = this.mpToThree(worldLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER])
      const p2 = this.mpToThree(worldLandmarks[POSE_LANDMARKS.RIGHT_ELBOW])
      const targetDir = new THREE.Vector3().subVectors(p2, p1).normalize()
      this.rotateBone(VRMHumanBoneName.RightUpperArm, targetDir)
    } else {
      this.rotateBone(VRMHumanBoneName.RightUpperArm, null)
    }

    if (rightElbowVis > confidenceThreshold && rightWristVis > confidenceThreshold) {
      const p1 = this.mpToThree(worldLandmarks[POSE_LANDMARKS.RIGHT_ELBOW])
      const p2 = this.mpToThree(worldLandmarks[POSE_LANDMARKS.RIGHT_WRIST])
      const targetDir = new THREE.Vector3().subVectors(p2, p1).normalize()
      this.rotateBone(VRMHumanBoneName.RightLowerArm, targetDir)
    } else {
      this.rotateBone(VRMHumanBoneName.RightLowerArm, null)
    }
  }

  private captureRestPose() {
    const bonePairs: [VRMHumanBoneName, VRMHumanBoneName][] = [
      [VRMHumanBoneName.LeftUpperArm, VRMHumanBoneName.LeftLowerArm],
      [VRMHumanBoneName.LeftLowerArm, VRMHumanBoneName.LeftHand],
      [VRMHumanBoneName.RightUpperArm, VRMHumanBoneName.RightLowerArm],
      [VRMHumanBoneName.RightLowerArm, VRMHumanBoneName.RightHand],
    ]

    for (const [boneName, childBoneName] of bonePairs) {
      const bone = this.vrm.humanoid?.getNormalizedBoneNode(boneName)
      const childBone = this.vrm.humanoid?.getNormalizedBoneNode(childBoneName)

      if (bone && childBone) {
        const bonePos = new THREE.Vector3()
        bone.getWorldPosition(bonePos)
        const childPos = new THREE.Vector3()
        childBone.getWorldPosition(childPos)

        const restDirection = new THREE.Vector3().subVectors(childPos, bonePos).normalize()
        const restWorldQuaternion = new THREE.Quaternion()
        bone.getWorldQuaternion(restWorldQuaternion)

        this.restPoseData.set(boneName, { bone, restDirection, restWorldQuaternion })
      }
    }
  }

  private revertToIdle() {
    for (const boneName of this.idlePoseQuaternions.keys()) {
      this.rotateBone(boneName, null)
    }
  }

  private rotateBone(boneName: VRMHumanBoneName, targetDirection: THREE.Vector3 | null) {
    const restData = this.restPoseData.get(boneName)
    const idleQuaternion = this.idlePoseQuaternions.get(boneName)
    if (!restData || !restData.bone.parent || !idleQuaternion) return

    const { bone } = restData
    let finalTargetQuaternion: THREE.Quaternion

    if (targetDirection) {
      const { restDirection, restWorldQuaternion } = restData
      const deltaRotation = new THREE.Quaternion().setFromUnitVectors(
        restDirection,
        targetDirection,
      )
      const targetWorldQuaternion = new THREE.Quaternion().multiplyQuaternions(
        deltaRotation,
        restWorldQuaternion,
      )
      const parentWorldQuaternion = new THREE.Quaternion()
      restData.bone.parent.getWorldQuaternion(parentWorldQuaternion)
      finalTargetQuaternion = targetWorldQuaternion.premultiply(parentWorldQuaternion.invert())
    } else {
      finalTargetQuaternion = idleQuaternion
    }

    bone.quaternion.slerp(finalTargetQuaternion, this.smoothingAlpha)
  }

  private mpToThree(lm: Landmark): THREE.Vector3 {
    return new THREE.Vector3(lm.x, -lm.y, -lm.z)
  }
}
