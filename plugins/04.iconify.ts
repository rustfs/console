import { addCollection } from '@iconify/vue';
import ri from '@iconify-json/ri/icons.json';

export default defineNuxtPlugin(() => {
  addCollection(ri);
});
