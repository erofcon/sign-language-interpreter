import * as THREE from 'three'

interface ArmBones {
  upper: THREE.Object3D
  lower: THREE.Object3D
  hand: THREE.Object3D
}

interface ArmLength {
  upper: number
  lower: number
}

interface SolveIKResult {
  upperQuaternion: THREE.Quaternion
  lowerQuaternion: THREE.Quaternion
  handWorldPose: THREE.Vector3
}

interface ArmCouple {
  bones: ArmBones
  length: ArmLength
}

interface CalibrationArmState {
  rightArm: ArmCouple
  leftArm: ArmCouple
}

export { ArmBones, ArmLength, CalibrationArmState, SolveIKResult }
