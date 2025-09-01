// FILE: components/avatar_motion/DrawAvatar.vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useThreeVrmStore } from '@/stores/threeVrm'
import { useMediaPipeStore } from '@/stores/mediapipe'
import { HandRetargeter } from '@/retarget/handRetargeter'

const canvasElement = ref<HTMLCanvasElement | null>(null)
const vrmStore = useThreeVrmStore()
const mediaPipeStore = useMediaPipeStore()

const modelUrl = 'real.vrm'
let handRetargeter: HandRetargeter | null = null

watch(
  () => mediaPipeStore.getPoseDataForRetargeting,
  (poseData) => {
    if (vrmStore.getIsVrmReady && handRetargeter) {
      handRetargeter.update(
        {
          worldLandmarks: poseData.correctedWorldLandmarks,
          screenLandmarks: poseData.screenLandmarks,
        },
        0.2,
      ) // Порог можно задать здесь
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
