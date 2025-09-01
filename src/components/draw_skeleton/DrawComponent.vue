<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useMediaPipeStore } from '@/stores/mediapipe.ts'
import { HAND_CONNECTIONS, type Landmark, POSE_CONNECTIONS } from '@mediapipe/holistic'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const POSE_LANDMARK_INDICES = {
  LEFT_WRIST: 15,
  LEFT_PINKY: 17,
  LEFT_INDEX: 19,
  LEFT_THUMB: 21,
  RIGHT_WRIST: 16,
  RIGHT_PINKY: 18,
  RIGHT_INDEX: 20,
  RIGHT_THUMB: 22,
}

const POSE_HAND_CONNECTIONS_LEFT = [
  [POSE_LANDMARK_INDICES.LEFT_WRIST, POSE_LANDMARK_INDICES.LEFT_PINKY],
  [POSE_LANDMARK_INDICES.LEFT_PINKY, POSE_LANDMARK_INDICES.LEFT_INDEX],
  [POSE_LANDMARK_INDICES.LEFT_INDEX, POSE_LANDMARK_INDICES.LEFT_WRIST],
]

const POSE_HAND_CONNECTIONS_RIGHT = [
  [POSE_LANDMARK_INDICES.RIGHT_WRIST, POSE_LANDMARK_INDICES.RIGHT_PINKY],
  [POSE_LANDMARK_INDICES.RIGHT_PINKY, POSE_LANDMARK_INDICES.RIGHT_INDEX],
  [POSE_LANDMARK_INDICES.RIGHT_INDEX, POSE_LANDMARK_INDICES.RIGHT_WRIST],
]

const videoElement = ref<HTMLVideoElement | null>(null)
const canvasElement = ref<HTMLCanvasElement | null>(null)

const mediaPipeStore = useMediaPipeStore()
let videoProcessAnimationId: number | null = null
let threeAnimationId: number | null = null

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let skeletonGroup: THREE.Group
let leftHandGroup: THREE.Group
let rightHandGroup: THREE.Group

const FLIP_X = false
const FLIP_Y = true
const FLIP_Z = true

const initThree = (canvas: HTMLCanvasElement) => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const width = canvas.clientWidth
  const height = canvas.clientHeight
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
  camera.position.set(FLIP_X ? 0.5 : -0.5, FLIP_Y ? 1 : 1, FLIP_Z ? -2 : 2)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1, 0)
  controls.enableDamping = true

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(1, 2, 3)
  scene.add(directionalLight)
  scene.add(new THREE.GridHelper(10, 10))

  skeletonGroup = new THREE.Group()
  leftHandGroup = new THREE.Group()
  rightHandGroup = new THREE.Group()
  scene.add(skeletonGroup)
  scene.add(leftHandGroup)
  scene.add(rightHandGroup)

  const animate = () => {
    threeAnimationId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()
}

const landmarkToVector3 = (lm: Landmark): THREE.Vector3 => {
  return new THREE.Vector3(FLIP_X ? -lm.x : lm.x, FLIP_Y ? -lm.y : lm.y, FLIP_Z ? -lm.z : lm.z)
}

const clearGroup = (group: THREE.Group) => {
  while (group.children.length) {
    const child = group.children[0]
    group.remove(child)
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose())
      } else {
        child.material.dispose()
      }
    }
  }
}

const updateSkeleton3D = (landmarks: Landmark[]) => {
  clearGroup(skeletonGroup)

  if (!landmarks || landmarks.length === 0) return

  const threePoints: THREE.Vector3[] = landmarks.map(landmarkToVector3)

  const pointGeometry = new THREE.SphereGeometry(0.015, 16, 16)
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#FFD700' }) // Gold
  const leftHandMaterial = new THREE.MeshStandardMaterial({ color: '#00BFFF' }) // DeepSkyBlue
  const rightHandMaterial = new THREE.MeshStandardMaterial({ color: '#00FF00' }) // Lime

  threePoints.forEach((pos, i) => {
    let material = bodyMaterial
    if (Object.values(POSE_HAND_CONNECTIONS_LEFT).flat().includes(i)) material = leftHandMaterial
    if (Object.values(POSE_HAND_CONNECTIONS_RIGHT).flat().includes(i)) material = rightHandMaterial

    const sphere = new THREE.Mesh(pointGeometry, material)
    sphere.position.copy(pos)
    skeletonGroup.add(sphere)
  })

  const drawConnections = (connections: number[][], color: THREE.ColorRepresentation) => {
    const lineMaterial = new THREE.LineBasicMaterial({ color, linewidth: 2 })
    for (const conn of connections) {
      const start = threePoints[conn[0]]
      const end = threePoints[conn[1]]
      if (start && end) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end])
        const line = new THREE.Line(lineGeometry, lineMaterial)
        skeletonGroup.add(line)
      }
    }
  }

  drawConnections(POSE_CONNECTIONS, '#FFD700')
  drawConnections(POSE_HAND_CONNECTIONS_LEFT, '#00BFFF')
  drawConnections(POSE_HAND_CONNECTIONS_RIGHT, '#00FF00')
}

const updateHand3D = (
  landmarks: Landmark[] | undefined,
  group: THREE.Group,
  color: THREE.ColorRepresentation,
  wristWorldPos?: THREE.Vector3,
) => {
  clearGroup(group)

  if (!landmarks || landmarks.length === 0) return

  const threePoints: THREE.Vector3[] = landmarks.map(landmarkToVector3)

  if (wristWorldPos) {
    const handWristPos = threePoints[0] // Первая точка в hand landmarks - это запястье
    const offset = wristWorldPos.clone().sub(handWristPos)

    threePoints.forEach((point) => {
      point.add(offset)
    })
  }

  const jointGeometry = new THREE.SphereGeometry(0.008, 12, 12)
  const jointMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.2,
  })

  threePoints.forEach((pos) => {
    const sphere = new THREE.Mesh(jointGeometry, jointMaterial)
    sphere.position.copy(pos)
    group.add(sphere)
  })

  const lineMaterial = new THREE.LineBasicMaterial({
    color,
    linewidth: 2,
    opacity: 0.8,
    transparent: true,
  })

  for (const conn of HAND_CONNECTIONS) {
    const start = threePoints[conn[0]]
    const end = threePoints[conn[1]]
    if (start && end) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end])
      const line = new THREE.Line(lineGeometry, lineMaterial)
      group.add(line)
    }
  }

  const tipIndices = [4, 8, 12, 16, 20] // Кончики: большой, указательный, средний, безымянный, мизинец
  const tipGeometry = new THREE.SphereGeometry(0.01, 12, 12)
  const tipMaterial = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    emissive: color,
    emissiveIntensity: 0.5,
  })

  tipIndices.forEach((index) => {
    const tipPos = threePoints[index]
    if (tipPos) {
      const tipSphere = new THREE.Mesh(tipGeometry, tipMaterial)
      tipSphere.position.copy(tipPos)
      group.add(tipSphere)
    }
  })
}

const processVideo = () => {
  if (videoElement.value && videoElement.value.readyState >= 3) {
    mediaPipeStore.processFrame(videoElement.value)
  }
  videoProcessAnimationId = requestAnimationFrame(processVideo)
}

watch(
  () => mediaPipeStore.getCorrectedWorldPoseLandmarks,
  (landmarks) => {
    if (landmarks && landmarks.length > 0) {
      updateSkeleton3D(landmarks)
    }
  },
  { deep: true },
)

watch(
  () => mediaPipeStore.getLeftHandLandmarks,
  (landmarks) => {
    const poseLandmarks = mediaPipeStore.getCorrectedWorldPoseLandmarks
    let wristPos: THREE.Vector3 | undefined

    if (poseLandmarks && poseLandmarks.length > POSE_LANDMARK_INDICES.LEFT_WRIST) {
      wristPos = landmarkToVector3(poseLandmarks[POSE_LANDMARK_INDICES.LEFT_WRIST])
    }

    updateHand3D(landmarks, leftHandGroup, '#00BFFF', wristPos)
  },
  { deep: true },
)

watch(
  () => mediaPipeStore.getRightHandLandmarks,
  (landmarks) => {
    const poseLandmarks = mediaPipeStore.getCorrectedWorldPoseLandmarks
    let wristPos: THREE.Vector3 | undefined

    if (poseLandmarks && poseLandmarks.length > POSE_LANDMARK_INDICES.RIGHT_WRIST) {
      wristPos = landmarkToVector3(poseLandmarks[POSE_LANDMARK_INDICES.RIGHT_WRIST])
    }

    updateHand3D(landmarks, rightHandGroup, '#00FF00', wristPos)
  },
  { deep: true },
)

onMounted(async () => {
  if (canvasElement.value) {
    initThree(canvasElement.value)
  }
  await mediaPipeStore.initialize()
  if (mediaPipeStore.getIsReady && videoElement.value) {
    try {
      videoElement.value.srcObject = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      })
      videoElement.value.onloadeddata = () => processVideo()
    } catch (e) {
      console.error('Error while initializing media stream:', e)
    }
  }
})

onUnmounted(() => {
  if (videoProcessAnimationId) cancelAnimationFrame(videoProcessAnimationId)
  if (threeAnimationId) cancelAnimationFrame(threeAnimationId)

  const stream = videoElement.value?.srcObject as MediaStream
  if (stream) stream.getTracks().forEach((track) => track.stop())

  renderer?.dispose()
  controls?.dispose()
})
</script>

<template>
  <video ref="videoElement" autoplay playsinline></video>
  <canvas ref="canvasElement" class="canvas"></canvas>
</template>

<style scoped>
video {
  display: none;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
