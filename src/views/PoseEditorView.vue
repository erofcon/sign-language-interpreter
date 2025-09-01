<!-- FILE: src/views/PoseEditorView.vue -->
<script setup lang="ts">
import PoseEditor from '@/components/pose_editor/PoseEditor.vue'
</script>

<template>
  <header class="border-b border-dashed border-gray-400 opacity-75">
    <div class="px-8 py-2">
      <h1 class="text-xl font-bold tracking-tight text-gray-900">
        Pose Editor (VRM Rest Pose)
      </h1>
      <p class="text-gray-600">Поверни кости → Экспортируй калибровку IK для позы покоя</p>
    </div>
  </header>

  <main class="p-4">
    <PoseEditor />
  </main>
</template>

<style scoped>
</style>
