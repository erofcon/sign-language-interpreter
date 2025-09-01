<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useThreeVrmStore } from '@/stores/threeVrm'
import { useMediaPipeStore } from '@/stores/mediapipe'
import { HandRetargeter } from '@/retarget/handRetargeter'
import { FingerRetargeter } from '@/retarget/fingerRetargeter'

const canvasElement = ref<HTMLCanvasElement | null>(null)
const vrmStore = useThreeVrmStore()
const mediaPipeStore = useMediaPipeStore()

const modelUrl = 'real.vrm'
let handRetargeter: HandRetargeter | null = null
let fingerRetargeter: FingerRetargeter | null = null

watch(
  () => mediaPipeStore.getPoseDataForRetargeting,
  (poseData) => {
    if (vrmStore.getIsVrmReady && handRetargeter) {
      handRetargeter.update(
        {
          worldLandmarks: poseData.correctedWorldLandmarks,
          screenLandmarks: poseData.screenLandmarks,
        },
        0.01,
      )
    }
    // Add finger retargeting update call
    if (vrmStore.getIsVrmReady && fingerRetargeter) {
      fingerRetargeter.update(poseData.leftHandLandmarks, poseData.rightHandLandmarks)
    }
  },
  { deep: true },
)

onMounted(async () => {
  if (!canvasElement.value) return

  await vrmStore.init(canvasElement.value, { background: 0x222222 })
  await vrmStore.loadVrm(modelUrl)

  if (vrmStore.getError == null) {
    vrmStore.toggleSkeletonVisibility(true)

    handRetargeter = new HandRetargeter(vrmStore.getCurrentVRM)
    fingerRetargeter = new FingerRetargeter(vrmStore.getCurrentVRM)
  } else {
    console.error(vrmStore.getError)
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
