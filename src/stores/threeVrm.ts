import { computed, reactive, readonly } from 'vue'
import { defineStore } from 'pinia'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { type VRM, VRMHumanBoneName, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'

const ROTATE_VRM_ROOT_Y_180 = true

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let currentVrm: VRM | null = null
let skeletonHelper: THREE.SkeletonHelper | null = null
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
  const state = reactive<ThreeVrmState>({
    isSceneReady: false,
    isVrmLoading: false,
    isVrmReady: false,
    error: null,
  })

  function animate() {
    rafId = requestAnimationFrame(animate)
    if (!renderer || !scene || !camera) return

    const delta = clock.getDelta()

    currentVrm?.update(delta)
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
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.position.set(1.0, 1.0, 1.0).normalize()
    targetScene.add(dirLight)
    const amb = new THREE.AmbientLight(0xffffff, 0.4)
    targetScene.add(amb)
  }

  function cleanupVrm() {
    if (currentVrm && scene) scene.remove(currentVrm.scene)
    if (skeletonHelper && scene) {
      scene.remove(skeletonHelper)
      skeletonHelper = null
    }
    currentVrm = null
    state.isVrmReady = false
  }

  async function init(
    canvas: HTMLCanvasElement,
    opts?: { background?: number | null; alpha?: boolean; antialias?: boolean },
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
      camera.position.set(0.0, 1.4, 2.5)

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: opts?.alpha ?? true,
        antialias: opts?.antialias ?? true,
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      handleResize()

      controls = new OrbitControls(camera, renderer.domElement)
      controls.screenSpacePanning = true
      controls.target.set(0.0, 1.0, 0.0)
      controls.update()

      setupLights(scene)
      scene.add(new THREE.GridHelper(10, 10))

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
      loader.register((parser) => new VRMLoaderPlugin(parser))
      const gltf = await loader.loadAsync(url)
      const vrm = gltf.userData.vrm as VRM | undefined
      if (!vrm) throw new Error('Failed to load VRM model from gltf.userData')

      VRMUtils.removeUnnecessaryJoints(gltf.scene)
      cleanupVrm()

      currentVrm = vrm
      currentVrm.scene.rotation.y = ROTATE_VRM_ROOT_Y_180 ? Math.PI : 0
      currentVrm.scene.traverse((obj: any) => {
        obj.castShadow = true
        obj.frustumCulled = false
      })
      scene.add(currentVrm.scene)

      // set idle pose

      if (currentVrm.humanoid) {
        const leftUpperArm = currentVrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.LeftUpperArm,
        )
        const rightUpperArm = currentVrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.RightUpperArm,
        )

        const leftLowerArm = currentVrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.LeftLowerArm,
        )

        const rightLowerArm = currentVrm.humanoid.getNormalizedBoneNode(
          VRMHumanBoneName.RightLowerArm,
        )

        if (leftUpperArm) {
          leftUpperArm.rotation.z = Math.PI / 2.5
        }

        if (rightUpperArm) {
          rightUpperArm.rotation.z = -Math.PI / 2.5
        }

        if (leftLowerArm) {
          leftLowerArm.rotation.z = Math.PI / 12
        }

        if (rightLowerArm) {
          rightLowerArm.rotation.z = -Math.PI / 12
        }
      }

      ///

      skeletonHelper = new THREE.SkeletonHelper(currentVrm.scene)
      skeletonHelper.visible = false
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

  function toggleSkeletonVisibility(visible?: boolean) {
    if (!skeletonHelper) return
    skeletonHelper.visible = visible !== undefined ? visible : !skeletonHelper.visible
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

  const getIsSceneReady = computed(() => state.isSceneReady)
  const getIsVrmLoading = computed(() => state.isVrmLoading)
  const getIsVrmReady = computed(() => state.isVrmReady)
  const getError = computed(() => state.error)
  const getCurrentVRM = computed(() => currentVrm)

  return {
    state: readonly(state),
    init,
    loadVrm,
    dispose,
    toggleSkeletonVisibility,

    getIsSceneReady,
    getIsVrmLoading,
    getIsVrmReady,
    getError,
    getCurrentVRM,
  }
})
