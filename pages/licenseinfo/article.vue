<template>
  <div class="license-page eading-7">
     <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('License') }}</h1>
      </template>
    </page-header>
    <page-content>
      <n-card  size="large" >
        <template #header>
          <h1 class="text-2xl font-bold text-center">{{ t('Apache License') }}</h1>
        </template>
        <article>
          <section  style="max-width: 1220px;margin: 0 auto;">
             <n-p>
          {{ t('Version 2.0, January 2004') }}
        </n-p>
        <n-p class=" mt-2">
          <n-a href="http://www.apache.org/licenses/"><n-text type="info">http://www.apache.org/licenses/</n-text></n-a>
        </n-p>
        <n-divider />
             <n-h3>{{ t('Terms and Conditions for Use, Reproduction, and Distribution') }}</n-h3>
            <n-h4>1. {{ t('Definitions') }}</n-h4>
            <n-p>
            {{ t('License definition paragraph') }}
            </n-p>
            <n-p>
            {{ t('Licensor definition paragraph') }}
            </n-p>
            <n-p>
             {{ t('Legal Entity definition paragraph') }}
            </n-p>
            <n-p>
              {{ t('You definition paragraph') }}
            </n-p>
            <n-p>
             {{ t('Source form definition paragraph') }}
            </n-p>
            <n-p>
             {{ t('Object form definition paragraph') }}
            </n-p>
            <n-p>
             {{ t('Work definition paragraph') }}
            </n-p>
            <n-p>
                {{ t('Derivative Works definition paragraph') }}
            </n-p>
            <n-p>
             {{ t('Contribution definition paragraph') }}
            </n-p>
            <n-p>
            {{ t('Contributor definition paragraph') }}
            </n-p>
            <n-h4>
              2. {{ t('Grant of Copyright License') }}
            </n-h4>
            <n-p>
              {{ t('Copyright license paragraph') }}
            </n-p>
            <n-h4>
              3. {{ t('Grant of Patent License') }}
            </n-h4>
            <n-p>
              {{ t('Patent license paragraph') }}
            </n-p>
            <n-h4>
              4. {{ t('Redistribution') }}
            </n-h4>
            <n-p>
              {{ t('Redistribution paragraph') }}
            </n-p>
            <n-ol>
              <n-li>
               1. {{ t('Redistribution condition 1') }}
              </n-li>
              <n-li>
                2. {{ t('Redistribution condition 2') }}
              </n-li>
              <n-li>
                3. {{ t('Redistribution condition 3') }}
              </n-li>
              <n-li>
                4. {{ t('Redistribution condition 4') }}
              </n-li>
            </n-ol>
            <n-p>
              {{ t('Additional redistribution paragraph') }}
            </n-p>
            <n-h4>
              5. {{ t('Submission of Contributions') }}
            </n-h4>
            <n-p>
              {{ t('Contributions paragraph') }}
            </n-p>
            <n-h4>
              6. {{ t('Trademarks') }}
            </n-h4>
            <n-p>
              {{ t('Trademarks paragraph') }}
            </n-p>
            <n-h4>
              7. {{ t('Disclaimer of Warranty') }}
            </n-h4>
            <n-p>
              {{ t('Disclaimer paragraph') }}
            </n-p>
            <n-h4>
              8. {{ t('Limitation of Liability') }}
            </n-h4>
            <n-p>
              {{ t('Liability paragraph') }}
            </n-p>
            <n-h4>
              9. {{ t('Accepting Warranty or Additional Liability') }}
            </n-h4>
            <n-p>
              {{ t('Additional liability paragraph') }}
            </n-p>
            <n-h4>
              {{ t('END OF TERMS AND CONDITIONS') }}
            </n-h4>
            <n-h4>
              {{ t('APPENDIX: How to apply the Apache License to your work') }}
            </n-h4>
            <n-p>
              {{ t('Appendix paragraph 1') }}
            </n-p>
            <n-p>
              {{ t('Appendix paragraph 2') }}
            </n-p>
           <n-p> {{ t('Copyright RustFS') }}</n-p>
            <n-p>{{ t('Licensed under Apache 2.0') }}</n-p>
            <n-p>{{ t('You may not use this file except in compliance with the License') }}</n-p>
            <n-p>{{ t('You may obtain a copy of the License at') }}</n-p>
            <n-p>
              {{ t('Appendix final paragraph') }}
            </n-p>
          </section>
        </article>
      </n-card>
    </page-content>
  </div>
</template>

<script setup>
import { NCard, NDivider, NOl } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
</script>

<style scoped>


article h2, article h3 {
  margin-top: 20px;
}

article p {
  margin-bottom: 15px;
}
</style>
