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
