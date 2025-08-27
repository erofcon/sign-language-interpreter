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
