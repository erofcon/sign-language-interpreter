import { Vector3 } from 'three'

interface ArmLandmarks {
  upper: Vector3
  lower: Vector3
  hand: Vector3
}

interface VRMLandmarks {
  rightArm: ArmLandmarks
  leftArm: ArmLandmarks
}

type InversionOptions = {
  x: boolean
  y: boolean
  z: boolean
}

export { ArmLandmarks, VRMLandmarks, InversionOptions }
