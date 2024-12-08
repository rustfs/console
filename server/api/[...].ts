import { joinURL } from "ufo";

export default defineEventHandler(async (event) => {
  const proxyUrl = useRuntimeConfig().public.api.baseURL;

  const target = joinURL(proxyUrl, event.path.replace('/api', ''));

  console.log('Proxying request to:', target);

  return proxyRequest(event, target);
})
