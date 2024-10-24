import { clearSession } from '@/utils/tools'

import {
  Api,
  type ApiError,
  type FullRequestParams,
  type HttpResponse,
} from './api'

const { t } = useI18n()
export const api = new Api()
api.baseUrl = 'api/v1'
const internalRequestFunc = api.request
api.request = async <T = any, E = any>({
  body,
  secure,
  path,
  type,
  query,
  format,
  baseUrl,
  cancelToken,
  ...params
}: FullRequestParams): Promise<HttpResponse<T, E>> => {
  const internalResp = internalRequestFunc({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params,
  })
  return internalResp
    .then((res) => {
      return res
    })
    .catch((res) => {
      const err = res.error as ApiError
      if (res.status === 401) {
        // toast.error('login error')
        return Promise.reject(t('login.loginErrorTip'))
      }
      if (
        err
        && res.status === 403
        && (err.message === 'invalid session' || err.message === 'access denied')
      ) {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login' // 跳转登录页
        }
      }
      throw err
    })
}

export function CommonAPIValidation<D, E>(
  res: HttpResponse<D, E>,
): HttpResponse<D, E> {
  return res
}
