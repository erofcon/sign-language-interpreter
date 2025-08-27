You are an expert software architect. The user is providing you with the complete source code for a project, contained in a single file. Your task is to meticulously analyze the provided codebase to gain a comprehensive understanding of its structure, functionality, dependencies, and overall architecture.

A file tree is provided below to give you a high-level overview. The subsequent sections contain the full content of each file, clearly marked with "// FILE: <path>".

Your instructions are:
1.  **Analyze Thoroughly:** Read through every file to understand its purpose and how it interacts with other files.
2.  **Identify Key Components:** Pay close attention to configuration files (like package.json, pyproject.toml), entry points (like index.js, main.py), and core logic.

## Project File Tree

```
src/
├── App.vue
├── components
│   ├── avatar_motion
│   │   └── DrawAvatar.vue
│   └── draw_skeleton
│       └── DrawComponent.vue
├── main.ts
├── router
│   └── index.ts
├── stores
│   ├── mediapipe.ts
│   └── threeVrm.ts
└── views
    └── HomeView.vue
```

---

// FILE: App.vue
```
<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style scoped></style>

```

// FILE: components/avatar_motion/DrawAvatar.vue
```
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useThreeVrmStore } from '@/stores/threeVrm.ts'
import { useMediaPipeStore } from '@/stores/mediapipe.ts'

const canvasElement = ref<HTMLCanvasElement | null>(null)
const vrmStore = useThreeVrmStore()
const mediaPipeStore = useMediaPipeStore()

const modelUrl = 'public/real.vrm'

watch(
  () => mediaPipeStore.state.keyPoints,
  (keyPoints) => {
    const vrm = vrmStore.getCurrentVRM
    if (vrm && keyPoints) {
    }
  },
  { deep: true },
)

onMounted(async () => {
  if (!canvasElement.value) return

  await vrmStore.init(canvasElement.value, { background: null })
  await vrmStore.loadVrm(modelUrl)

  if (vrmStore.getError == null) {
  } else {
    console.log(vrmStore.getError)
  }
})

onUnmounted(() => {
  vrmStore.dispose()
})
</script>

<template>
  <canvas ref="canvasElement"></canvas>
</template>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>

```

// FILE: components/draw_skeleton/DrawComponent.vue
```
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useMediaPipeStore } from '@/stores/mediapipe.ts'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import { HAND_CONNECTIONS, POSE_CONNECTIONS } from '@mediapipe/holistic'

const videoElement = ref<HTMLVideoElement | null>(null)
const canvasElement = ref<HTMLCanvasElement | null>(null)

const mediaPipeStore = useMediaPipeStore()
let animationFrameId: number | null = null

const processVideo = () => {
  if (videoElement.value && videoElement.value.readyState >= 3) {
    mediaPipeStore.processFrame(videoElement.value)
  }

  animationFrameId = requestAnimationFrame(processVideo)
}

watch(
  () => mediaPipeStore.state.keyPoints,
  (results) => {
    const canvas = canvasElement.value
    const video = videoElement.value
    if (!canvas || !video || !results) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const { poseLandmarks, leftHandLandmarks, rightHandLandmarks } = results

    // --- Отрисовка позы ---
    if (poseLandmarks) {
      drawConnectors(ctx, poseLandmarks, POSE_CONNECTIONS, {
        color: '#FFD700',
        lineWidth: 4,
      })
      drawLandmarks(ctx, poseLandmarks, {
        color: '#FFD700',
        radius: 3,
      })
    }

    if (leftHandLandmarks) {
      drawConnectors(ctx, leftHandLandmarks, HAND_CONNECTIONS, {
        color: '#00BFFF',
        lineWidth: 3,
      })
      drawLandmarks(ctx, leftHandLandmarks, {
        color: '#00BFFF',
        radius: 2,
      })
    }

    // --- Отрисовка правой руки ---
    if (rightHandLandmarks) {
      drawConnectors(ctx, rightHandLandmarks, HAND_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 3,
      })
      drawLandmarks(ctx, rightHandLandmarks, {
        color: '#00FF00',
        radius: 2,
      })
    }
  },
  { deep: true },
)

onMounted(async () => {
  await mediaPipeStore.initialize()

  if (mediaPipeStore.getIsReady && videoElement.value) {
    try {
      videoElement.value.srcObject = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      })

      videoElement.value.onloadeddata = () => {
        processVideo()
      }
    } catch (e) {
      console.log('Error while initializing media stream')
    }
  }
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }

  const stream = videoElement.value?.srcObject as MediaStream
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
  }
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
  pointer-events: none;
}
</style>

```

// FILE: main.ts
```
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

```

// FILE: router/index.ts
```
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    // {
    //   path: '/about',
    //   name: 'about',
    //   // route level code-splitting
    //   // this generates a separate chunk (About.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import('../views/AboutView.vue'),
    // },
  ],
})

export default router

```

// FILE: stores/mediapipe.ts
```
import { Holistic, type Results } from '@mediapipe/holistic'
import { defineStore } from 'pinia'
import { computed, reactive, readonly } from 'vue'

let holisticInstance: Holistic | null = null

interface MediaPipeState {
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  keyPoints: Results
}

export const useMediaPipeStore = defineStore('mediapipe', () => {
  // ---------- State --------------
  const state = reactive<MediaPipeState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    keyPoints: null,
  })

  // ---------- ACTIONS --------------

  // initialize MediaPipe
  async function initialize() {
    if (state.isInitialized || state.isLoading) {
      console.log('MediaPipe is initialized')
      return
    }

    state.isLoading = true

    try {
      holisticInstance = new Holistic({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
        },
      })

      const options: Options = {
        selfieMode: false,
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: true,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }

      holisticInstance.setOptions(options)

      holisticInstance.onResults((results: Results) => {
        state.keyPoints = results
      })

      await holisticInstance.initialize()

      state.isInitialized = true
      console.log('MediaPipe is initialized')
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e)
      console.log(state.error)
    } finally {
      state.isLoading = false
    }
  }

  // process frame
  async function processFrame(element: HTMLVideoElement) {
    if (!state.isInitialized || !holisticInstance) {
      console.log('MediaPipe not initialized. Run initialize() first off')
      return
    }
    await holisticInstance.send({ image: element })
  }

  const getIsReady = computed(() => state.isInitialized && !state.isLoading && holisticInstance)

  const getPoseLandmarks = computed(() => state.keyPoints?.poseLandmarks)
  // maybe need to change "za"
  const getWorldPoseLandmarks = computed(() => state.keyPoints?.za)

  // hand landmarks
  const getRightHandLandmarks = computed(() => state.keyPoints?.rightHandLandmarks)
  const getLeftHandLandmarks = computed(() => state.keyPoints?.leftHandLandmarks)

  return {
    //state
    state: readonly(state),

    //actions
    initialize,
    processFrame,

    //getters
    getIsReady,
    getPoseLandmarks,
    getWorldPoseLandmarks,
  }
})

```

// FILE: stores/threeVrm.ts
```
import { computed, reactive, readonly } from 'vue'
import { defineStore } from 'pinia'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { type VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let currentVrm: VRM | null = null
let skeletonHelper: THREE.SkeletonHelper | null = null
let dirLight: THREE.DirectionalLight | null = null
let rafId: number | null = null
const clock = new THREE.Clock()
let resizeHandler: (() => void) | null = null
let canvasEl: HTMLCanvasElement | null = null

interface ThreeVrmState {
  isSceneReady: boolean
  isVrmLoading: boolean
  isVrmReady: boolean
  error: string | null
}

export const useThreeVrmStore = defineStore('three-vrm', () => {
  // ---------- STATE ----------
  const state = reactive<ThreeVrmState>({
    isSceneReady: false,
    isVrmLoading: false,
    isVrmReady: false,
    error: null,
  })

  // ---------- INTERNALS ----------
  function animate() {
    if (!renderer || !scene || !camera) return
    rafId = requestAnimationFrame(animate)

    const delta = clock.getDelta()
    if (currentVrm) {
      currentVrm.update(delta)
    }

    controls?.update()
    renderer.render(scene, camera)
  }

  function handleResize() {
    if (!renderer || !camera || !canvasEl) return
    const w = canvasEl.clientWidth || window.innerWidth
    const h = canvasEl.clientHeight || window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  }

  function setupLights(targetScene: THREE.Scene) {
    dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.position.set(1.0, 1.0, 1.0).normalize()
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 500
    targetScene.add(dirLight)

    const amb = new THREE.AmbientLight(0xffffff, 0.4)
    targetScene.add(amb)
  }

  function cleanupVrm() {
    if (currentVrm && scene) {
      scene.remove(currentVrm.scene)
    }
    if (skeletonHelper && scene) {
      scene.remove(skeletonHelper)
      skeletonHelper = null
    }
    currentVrm = null
    state.isVrmReady = false
  }

  // ---------- ACTIONS ----------

  async function init(
    canvas: HTMLCanvasElement,
    opts?: {
      background?: number | null
      alpha?: boolean
      antialias?: boolean
    },
  ) {
    if (state.isSceneReady) return
    state.error = null

    try {
      canvasEl = canvas

      scene = new THREE.Scene()
      if (opts?.background !== undefined) {
        if (opts.background === null) scene.background = null
        else scene.background = new THREE.Color(opts.background)
      }

      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000)
      camera.position.set(1.0, 3.4, 5.5)

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: opts?.alpha ?? true,
        antialias: opts?.antialias ?? true,
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      handleResize()

      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap

      controls = new OrbitControls(camera, renderer.domElement)
      controls.screenSpacePanning = true
      controls.target.set(0.0, 1.0, 0.0)
      controls.update()

      setupLights(scene)

      // Helpers
      const axes = new THREE.AxesHelper(5)
      scene.add(axes)
      const grid = new THREE.GridHelper(10, 10)
      scene.add(grid)

      resizeHandler = () => handleResize()
      window.addEventListener('resize', resizeHandler, { passive: true })

      animate()
      state.isSceneReady = true
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e)
    }
  }

  async function loadVrm(url: string) {
    if (!scene) {
      state.error = 'Scene is not initialized. Call init(canvas) first.'
      return null
    }

    state.isVrmLoading = true
    state.error = null

    try {
      const loader = new GLTFLoader()
      loader.register((parser) => {
        return new VRMLoaderPlugin(parser)
      })

      const gltf = await loader.loadAsync(url)
      const vrm = gltf.userData.vrm as VRM | undefined
      if (!vrm) throw new Error('Failed to load VRM model from gltf.userData')

      VRMUtils.removeUnnecessaryJoints(gltf.scene)

      cleanupVrm()
      currentVrm = vrm

      currentVrm.scene.rotation.y = Math.PI

      currentVrm.scene.traverse((obj: any) => {
        obj.castShadow = true
        obj.receiveShadow = true
      })

      scene.add(currentVrm.scene)

      skeletonHelper = new THREE.SkeletonHelper(currentVrm.scene)
      skeletonHelper.visible = false // по умолчанию скрыт
      scene.add(skeletonHelper)

      state.isVrmReady = true
      return vrm
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      state.isVrmLoading = false
    }
  }

  function dispose() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
      resizeHandler = null
    }

    cleanupVrm()

    controls?.dispose()
    controls = null

    if (renderer) {
      renderer.dispose()
      renderer.forceContextLoss?.()
    }
    renderer = null
    camera = null
    scene = null

    state.isSceneReady = false
  }

  // ---------- GETTERS ----------
  const getIsSceneReady = computed(() => state.isSceneReady)
  const getIsVrmLoading = computed(() => state.isVrmLoading)
  const getIsVrmReady = computed(() => state.isVrmReady)
  const getError = computed(() => state.error)
  const getCurrentVRM = computed(() => currentVrm)

  return {
    //state
    state: readonly(state),

    //actions
    init,
    loadVrm,
    dispose,

    //getters
    getIsSceneReady,
    getIsVrmLoading,
    getIsVrmReady,
    getError,
    getCurrentVRM,
  }
})

```

// FILE: views/HomeView.vue
```
<script setup lang="ts">
import DrawComponent from '@/components/draw_skeleton/DrawComponent.vue'
import DrawAvatar from '@/components/avatar_motion/DrawAvatar.vue'
</script>

<template>
  <!-- header -->
  <header class="border-b border-dashed border-gray-400 opacity-75">
    <div class="px-8 py-2">
      <h1 class="text-xl font-bold tracking-tight text-gray-900">Real Time Mocap</h1>
    </div>
  </header>

  <main class="flex flex-col pt-2">
    <div class="grid grid-cols-8 gap-2">
      <!--left sidebar-->
      <div class="col-start-1 col-end-1">
        <div class="px-4">
          <x-placeholder>
            <div
              class="relative background overflow-hidden rounded-xl border border-dashed border-gray-400 opacity-75"
            >
              <svg fill="none" class="absolute inset-0 size-full stroke-gray-900/10">
                <defs>
                  <pattern
                    id="pattern-d09edaee-fc6a-4f25-aca5-bf9f5f77e14a"
                    width="10"
                    height="10"
                    x="0"
                    y="0"
                    patternUnits="userSpaceOnUse"
                  >
                    <path d="M-3 13 15-5M-5 5l18-18M-1 21 17 3"></path>
                  </pattern>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill="url(#pattern-d09edaee-fc6a-4f25-aca5-bf9f5f77e14a)"
                  stroke="none"
                ></rect>
              </svg>
            </div>
          </x-placeholder>
        </div>
      </div>

      <!--main content-->
      <div class="col-span-5">
        <div class="relative background overflow-hidden rounded-xl border-gray-400 opacity-75">
          <draw-avatar />
        </div>
      </div>

      <!--right sidebar-->
      <div class="col-start-7 col-end-9">
        <div class="px-4">
          <div class="rounded-xl border border-dashed border-gray-400 opacity-75">
            <draw-component />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.background {
  height: 90vh;
}
</style>

```

