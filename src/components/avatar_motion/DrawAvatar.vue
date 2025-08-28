<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useThreeVrmStore } from '@/stores/threeVrm.ts'
import { useMediaPipeStore } from '@/stores/mediapipe.ts'
import { calibrationArm } from '@/retarget/arm/calibration.ts'
import type { CalibrationArmState } from '@/retarget/arm/types.ts'
import { animate } from '@/retarget'

const canvasElement = ref<HTMLCanvasElement | null>(null)
const vrmStore = useThreeVrmStore()
const mediaPipeStore = useMediaPipeStore()

const armCalibration = ref<CalibrationArmState | null>(null)

const modelUrl = 'AvatarSample_A.vrm'

watch(
  () => mediaPipeStore.state.keyPoints,
  (keyPoints) => {
    const vrm = vrmStore.getCurrentVRM
    const landmarks = mediaPipeStore.getWorldPoseLandmarks
    if (vrm && landmarks) {
      animate(vrm, armCalibration.value, landmarks)
    }
  },
  { deep: true },
)

onMounted(async () => {
  if (!canvasElement.value) return

  await vrmStore.init(canvasElement.value, { background: null })
  await vrmStore.loadVrm(modelUrl)

  if (vrmStore.getError == null) {
    armCalibration.value = calibrationArm(vrmStore.getCurrentVRM)
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
