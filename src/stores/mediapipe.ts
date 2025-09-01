import { Holistic, type Results } from '@mediapipe/holistic'
import { defineStore } from 'pinia'
import { computed, reactive, readonly } from 'vue'
import { applyPoseCorrections } from '@/utils/poseCorrector.ts'

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
        modelComplexity: 2,
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
  const getCorrectedWorldPoseLandmarks = computed(() => {
    const landmarks = getWorldPoseLandmarks.value
    if (landmarks) {
      return applyPoseCorrections(landmarks)
    }
    return undefined
  })

  const getPoseDataForRetargeting = computed(() => {
    const worldLandmarks = state.keyPoints?.za
    const screenLandmarks = state.keyPoints?.poseLandmarks
    const leftHandLandmarks = state.keyPoints?.leftHandLandmarks
    const rightHandLandmarks = state.keyPoints?.rightHandLandmarks

    if (!worldLandmarks || !screenLandmarks) {
      return {
        correctedWorldLandmarks: [],
        screenLandmarks: [],
        leftHandLandmarks: [],
        rightHandLandmarks: [],
      }
    }

    return {
      correctedWorldLandmarks: applyPoseCorrections(worldLandmarks),
      screenLandmarks: screenLandmarks,
      leftHandLandmarks: leftHandLandmarks,
      rightHandLandmarks: rightHandLandmarks,
    }
  })

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
    getRightHandLandmarks,
    getLeftHandLandmarks,
    getCorrectedWorldPoseLandmarks,
    getPoseDataForRetargeting,
  }
})
