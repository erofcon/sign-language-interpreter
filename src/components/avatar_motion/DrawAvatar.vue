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
    const vrm = vrmStore.getCurrentVRM;
    if (vrm && keyPoints) {

    }
  },
  { deep: true },
);

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
