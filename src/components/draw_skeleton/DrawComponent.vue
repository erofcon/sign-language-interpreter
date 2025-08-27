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

    // Устанавливаем размеры canvas под видео
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

    // --- Отрисовка левой руки ---
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
