// This file is part of MinIO Console Server
// Copyright (c) 2021 MinIO, Inc.

import type { ErrorResponseHandler } from '../typings/types'
import get from 'lodash/get'
import request from 'superagent'
import { clearSession } from '../utils/tools'

const baseUrl = ''

interface RequestHeaders { [name: string]: string }

export class API {
  invoke(method: string, url: string, data?: object, headers?: RequestHeaders) {
    let targetURL = url
    if (targetURL[0] === '/') {
      targetURL = targetURL.slice(1)
    }
    const req = request(method, targetURL)

    if (headers) {
      for (const k in headers) {
        req.set(k, headers[k])
      }
    }

    return req
      .send(data)
      .then((res: any) => res.body)
      .catch((err: any) => {
        // if we get unauthorized and we are not doing login, kick out the user
        if (
          err.status === 401
          && localStorage.getItem('userLoggedIn')
          && !targetURL.includes('api/v1/login')
        ) {
          if (window.location.pathname !== '/') {
            localStorage.setItem('redirect-path', window.location.pathname)
          }
          clearSession()
          // Refresh the whole page to ensure cache is clear
          // and we dont end on an infinite loop
          window.location.href = `${baseUrl}login`
          return
        }

        return this.onError(err)
      })
  }

  onError(err: any) {
    if (err.status) {
      const errMessage = get(
        err.response,
        'body.message',
        `Error ${err.status.toString()}`,
      )

      let detailedMessage = get(err.response, 'body.detailedMessage', '')

      if (errMessage === detailedMessage) {
        detailedMessage = ''
      }

      const capMessage
        = errMessage.charAt(0).toUpperCase() + errMessage.slice(1)
      const capDetailed
        = detailedMessage.charAt(0).toUpperCase() + detailedMessage.slice(1)

      const throwMessage: ErrorResponseHandler = {
        errorMessage: capMessage,
        detailedError: capDetailed,
        statusCode: err.status,
      }

      return Promise.reject(throwMessage)
    }
    else {
      clearSession()
      window.location.href = `${baseUrl}login`
    }
  }
}

const api = new API()
export default api
