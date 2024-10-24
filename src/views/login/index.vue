<script setup lang="ts">
import { Login, STSLogin } from './components'

type IformType = 'login' | 'stsLogin'
const formType: Ref<IformType> = ref('login')
const formComponets = {
  login: Login,
  stsLogin: STSLogin,
}
</script>

<template>
  <n-el class="wh-full flex-center bg-cover bg-fixed bg-center bg-login bg-no-repeat">
    <div class="fixed top-40px right-40px text-lg text-white">
      <DarkModeSwitch />
      <LangsSwitch />
    </div>
    <n-el
      class="p-4xl h-full w-full sm:w-450px sm:h-550px"
      style="background: var(--card-color);box-shadow: var(--box-shadow-1);"
    >
      <div class="w-full flex flex-col items-center ">
        <SvgIconsLogo class="text-6em" />
        <!-- <n-h3>{{ appName }} </n-h3> -->
        <transition
          name="fade-slide"
          mode="out-in"
        >
          <component
            :is="formComponets[formType]"
            v-model="formType"
            class="w-85%"
          />
        </transition>
      </div>
    </n-el>
    <n-el class="p-4xl sm:w-50% hidden   sm:h-550px leading-6 text-white lg:flex flex-center">
      <!-- Photo -->
      <div class="align-center">
        <p py-2>
          RusFS使用全世界最热门、最安全的语言Rust进行开发，它完全兼容S3协议，不仅适用于AI/ML场景，还可支持海量数据存储、大数据、互联网、工业和保密存储等全部场景。
        </p>
        <p py-2>
          它是由软件构建的，您在增加任何投入的情况下几乎可以免费使用RustFS。
        </p>
        <p py-2>
          我们遵循Apache 2开源协议，并且支持中国国产保密设备和系统。
        </p>
        <div class="flex pt-8 py-4">
          <div class="mr-4">
            <img src="../../assets/svg/easy.svg" alt="">
          </div>
          <div class="col">
            <div class="text-truncate">
              <strong>简单</strong>
            </div>
            <div>
              我们面向万亿对象保障企业的的安全，只需要 条命令即可启动RusFS
            </div>
          </div>
        </div>
        <div class="flex py-4">
          <div class="mr-4">
            <img src="../../assets/svg/gx.svg" alt="">
          </div>
          <div class="col">
            <div class="text-truncate">
              <strong>高效</strong>
            </div>
            <div>
              在NVMe32节点上，我们的每秒读取速度超过了330GB/s,写入速度高172GB/s,比更快还快
            </div>
          </div>
        </div>
        <div class="flex pt-4">
          <div class="mr-4">
            <img src="../../assets/svg/aq.svg" alt="">
          </div>
          <div class="col">
            <div class="text-truncate">
              <strong>安全</strong>
            </div>
            <div>
              使用Rust进行开发，保障内存安全。并且支持各种安全设备和封闭环境
            </div>
          </div>
        </div>
      </div>
    </n-el>
  </n-el>
</template>

<style lang="scss" scoped>
.bg-login {
  background-image: url(../../assets/images/login-bg.png);
}
</style>
