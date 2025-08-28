import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three'
import type { SolveIKResult } from '@/retarget/arm/types.ts'

const EPS = 1e-6
const GLOBAL_UP = new Vector3(0, 1, 0)
const GLOBAL_FWD = new Vector3(0, 0, 1)

// Create quaternion from direction and up vector
function quatFromDirAndUp(dir: Vector3, upHint: Vector3): Quaternion {
  const x = dir.clone().normalize()

  // Calculate orthogonal up vector
  let y = upHint.clone().sub(x.clone().multiplyScalar(upHint.dot(x)))
  if (y.lengthSq() < EPS) {
    const alt = Math.abs(x.dot(GLOBAL_UP)) < 0.99 ? GLOBAL_UP : GLOBAL_FWD
    y = alt.clone().sub(x.clone().multiplyScalar(alt.dot(x)))
  }
  y.normalize()

  // Complete the basis
  const z = new Vector3().crossVectors(x, y).normalize()
  y.copy(new Vector3().crossVectors(z, x)).normalize()

  const m = new Matrix4().makeBasis(x, y, z)
  return new Quaternion().setFromRotationMatrix(m)
}

// Two-bone IK solver
function solveBoneIK(
  origin: Vector3,
  target: Vector3,
  pole: Vector3,
  l1: number,
  l2: number,
  upHintUpper?: Vector3, // Up hint for shoulder
  upHintLower?: Vector3, // Up hint for elbow
): SolveIKResult {
  const originToTarget = new Vector3().subVectors(target, origin)
  let d = originToTarget.length()
  const reach = l1 + l2

  const dirN = d > EPS ? originToTarget.clone().divideScalar(d) : new Vector3(1, 0, 0)

  // Clamp distance to reachable range
  const dClamped = Math.min(Math.max(d, EPS), reach)

  // Law of cosines for elbow angle
  let cosShoulder = MathUtils.clamp(
    (l1 * l1 + dClamped * dClamped - l2 * l2) / (2 * l1 * dClamped),
    -1,
    1,
  )

  let d1 = l1 * cosShoulder
  let h = Math.sqrt(Math.max(0, l1 * l1 - d1 * d1))
  const circleCenter = origin.clone().addScaledVector(dirN, d1)

  // Calculate arm plane from pole vector
  const poleVec = new Vector3().subVectors(pole, origin)
  let armPlaneNormal = new Vector3().crossVectors(originToTarget, poleVec).normalize()

  // Fallback if pole vector is invalid
  if (!Number.isFinite(armPlaneNormal.x) || armPlaneNormal.lengthSq() < EPS) {
    armPlaneNormal = new Vector3().crossVectors(GLOBAL_UP, originToTarget).normalize()
    if (armPlaneNormal.lengthSq() < EPS) {
      armPlaneNormal = new Vector3().crossVectors(GLOBAL_FWD, originToTarget).normalize()
    }
  }

  // Calculate elbow direction
  let elbowDir = new Vector3().crossVectors(armPlaneNormal, dirN).normalize()

  // Ensure elbow points towards pole
  const toPole = new Vector3().subVectors(pole, circleCenter)
  const toPoleProj = toPole.addScaledVector(dirN, -toPole.dot(dirN))
  if (toPoleProj.lengthSq() > EPS && elbowDir.dot(toPoleProj) < 0) {
    elbowDir.multiplyScalar(-1)
  }

  // Calculate joint positions
  const elbowWorldPos = circleCenter.clone().addScaledVector(elbowDir, h)
  const clampedWrist = origin.clone().addScaledVector(dirN, Math.min(d, reach))

  // Calculate bone directions
  const xUpper = new Vector3().subVectors(elbowWorldPos, origin).normalize()
  const xLower = new Vector3().subVectors(clampedWrist, elbowWorldPos).normalize()

  // Create quaternions with proper up hints
  const upperUpHint = upHintUpper || elbowDir
  const lowerUpHint = upHintLower || elbowDir

  const quatUpper = quatFromDirAndUp(xUpper, upperUpHint)
  const quatLower = quatFromDirAndUp(xLower, lowerUpHint)

  return {
    upperQuaternion: quatUpper,
    lowerQuaternion: quatLower,
    handWorldPose: elbowWorldPos,
  }
}

export { solveBoneIK }
