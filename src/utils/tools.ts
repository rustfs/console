// This file is part of MinIO Console Server
// Copyright (c) 2021 MinIO, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import type {
  IBytesCalc,
  IErasureCodeCalc,
  IStorageFactors,
} from '../typings/types'
import storage from 'local-storage-fallback'
import get from 'lodash/get'

const minMemReq = 2147483648 // Minimal Memory required for MinIO in bytes

export const units = [
  'B',
  'KiB',
  'MiB',
  'GiB',
  'TiB',
  'PiB',
  'EiB',
  'ZiB',
  'YiB',
]
export const k8sUnits = ['Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei']
export const k8sCalcUnits = ['B', ...k8sUnits]

export function niceBytes(x: string, showK8sUnits: boolean = false) {
  const n = Number.parseInt(x, 10) || 0

  return niceBytesInt(n, showK8sUnits)
}

export function niceBytesInt(n: number, showK8sUnits: boolean = false) {
  let l = 0

  while (n >= 1024 && ++l) {
    n = n / 1024
  }
  // include a decimal point and a tenths-place digit if presenting
  // less than ten of KB or greater units
  const k8sUnitsN = ['B', ...k8sUnits]
  return `${n.toFixed(1)} ${showK8sUnits ? k8sUnitsN[l] : units[l]}`
}

export function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
}

export function clearSession() {
  storage.removeItem('token')
  storage.removeItem('auth-state')
  deleteCookie('token')
  deleteCookie('idp-refresh-token')
}

// timeFromDate gets time string from date input
export function timeFromDate(d: Date) {
  const h = d.getHours() < 10 ? `0${d.getHours()}` : `${d.getHours()}`
  const m = d.getMinutes() < 10 ? `0${d.getMinutes()}` : `${d.getMinutes()}`
  const s = d.getSeconds() < 10 ? `0${d.getSeconds()}` : `${d.getSeconds()}`

  return `${h}:${m}:${s}:${d.getMilliseconds()}`
}

// units to be used in a dropdown
export function k8sScalarUnitsExcluding(exclude?: string[]) {
  return k8sUnits
    .filter((unit) => {
      if (exclude && exclude.includes(unit)) {
        return false
      }
      return true
    })
    .map((unit) => {
      return { label: unit, value: unit }
    })
}

// getBytes, converts from a value and a unit from units array to bytes as a string
export function getBytes(value: string, unit: string, fromk8s: boolean = false): string {
  return getBytesNumber(value, unit, fromk8s).toString(10)
}

// getBytesNumber, converts from a value and a unit from units array to bytes
export function getBytesNumber(value: string, unit: string, fromk8s: boolean = false): number {
  const vl: number = Number.parseFloat(value)

  const unitsTake = fromk8s ? k8sCalcUnits : units

  const powFactor = unitsTake.findIndex(element => element === unit)

  if (powFactor === -1) {
    return 0
  }
  const factor = 1024 ** powFactor
  const total = vl * factor

  return total
}

export function setMemoryResource(memorySize: number, capacitySize: string, maxMemorySize: number) {
  // value always comes as Gi
  const requestedSizeBytes = getBytes(memorySize.toString(10), 'Gi', true)
  const memReqSize = Number.parseInt(requestedSizeBytes, 10)
  if (maxMemorySize === 0) {
    return {
      error: 'There is no memory available for the selected number of nodes',
      request: 0,
      limit: 0,
    }
  }

  if (maxMemorySize < minMemReq) {
    return {
      error: 'There are not enough memory resources available',
      request: 0,
      limit: 0,
    }
  }

  if (memReqSize < minMemReq) {
    return {
      error: 'The requested memory size must be greater than 2Gi',
      request: 0,
      limit: 0,
    }
  }
  if (memReqSize > maxMemorySize) {
    return {
      error:
        'The requested memory is greater than the max available memory for the selected number of nodes',
      request: 0,
      limit: 0,
    }
  }

  const capSize = Number.parseInt(capacitySize, 10)
  let memLimitSize = memReqSize
  // set memory limit based on the capacitySize
  // if capacity size is lower than 1TiB we use the limit equal to request
  if (capSize >= Number.parseInt(getBytes('1', 'Pi', true), 10)) {
    memLimitSize = Math.max(
      memReqSize,
      Number.parseInt(getBytes('64', 'Gi', true), 10),
    )
  }
  else if (capSize >= Number.parseInt(getBytes('100', 'Ti'), 10)) {
    memLimitSize = Math.max(
      memReqSize,
      Number.parseInt(getBytes('32', 'Gi', true), 10),
    )
  }
  else if (capSize >= Number.parseInt(getBytes('10', 'Ti'), 10)) {
    memLimitSize = Math.max(
      memReqSize,
      Number.parseInt(getBytes('16', 'Gi', true), 10),
    )
  }
  else if (capSize >= Number.parseInt(getBytes('1', 'Ti'), 10)) {
    memLimitSize = Math.max(
      memReqSize,
      Number.parseInt(getBytes('8', 'Gi', true), 10),
    )
  }

  return {
    error: '',
    request: memReqSize,
    limit: memLimitSize,
  }
}

// Erasure Code Parity Calc
export function erasureCodeCalc(parityValidValues: string[], totalDisks: number, pvSize: number): IErasureCodeCalc {
  // Parity Values is empty
  if (parityValidValues.length < 1) {
    return {
      error: 1,
      defaultEC: '',
      erasureCodeSet: 0,
      maxEC: '',
      rawCapacity: '0',
      storageFactors: [],
    }
  }

  const totalStorage = totalDisks * pvSize
  const maxEC = parityValidValues[0]
  const maxParityNumber = Number.parseInt(maxEC.split(':')[1], 10)

  const erasureStripeSet = maxParityNumber * 2 // ESS is calculated by multiplying maximum parity by two.

  const storageFactors: IStorageFactors[] = parityValidValues.map(
    (currentParity) => {
      const parityNumber = Number.parseInt(currentParity.split(':')[1], 10)
      const storageFactor
        = erasureStripeSet / (erasureStripeSet - parityNumber)

      const maxCapacity = Math.floor(totalStorage / storageFactor)
      const maxTolerations
        = totalDisks - Math.floor(totalDisks / storageFactor)
      return {
        erasureCode: currentParity,
        storageFactor,
        maxCapacity: maxCapacity.toString(10),
        maxFailureTolerations: maxTolerations,
      }
    },
  )

  let defaultEC = maxEC

  const fourVar = parityValidValues.find(element => element === 'EC:4')

  if (fourVar) {
    defaultEC = 'EC:4'
  }

  return {
    error: 0,
    storageFactors,
    maxEC,
    rawCapacity: totalStorage.toString(10),
    erasureCodeSet: erasureStripeSet,
    defaultEC,
  }
}

// 92400 seconds -> 1 day, 1 hour, 40 minutes.
export function niceTimeFromSeconds(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24))
  const hours = Math.floor((seconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  const parts = []

  if (days > 0) {
    parts.push(`${days} day${days !== 1 ? 's' : ''}`)
  }

  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`)
  }

  if (remainingSeconds > 0) {
    parts.push(
      `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`,
    )
  }

  return parts.join(' and ')
}

// seconds / minutes /hours / Days / Years calculator
export function niceDays(secondsValue: string, timeVariant: string = 's') {
  const seconds = Number.parseFloat(secondsValue)

  return niceDaysInt(seconds, timeVariant)
}

// niceDaysInt returns the string in the max unit found e.g. 92400 seconds -> 1 day
export function niceDaysInt(seconds: number, timeVariant: string = 's') {
  switch (timeVariant) {
    case 'ns':
      seconds = Math.floor(seconds * 0.000000001)
      break
    case 'ms':
      seconds = Math.floor(seconds * 0.001)
      break
    default:
  }

  const days = Math.floor(seconds / (3600 * 24))

  seconds -= days * 3600 * 24
  const hours = Math.floor(seconds / 3600)
  seconds -= hours * 3600
  const minutes = Math.floor(seconds / 60)
  seconds -= minutes * 60

  if (days > 365) {
    const years = days / 365
    return `${years} year${Math.floor(years) === 1 ? '' : 's'}`
  }

  if (days > 30) {
    const months = Math.floor(days / 30)
    const diffDays = days - months * 30

    return `${months} month${Math.floor(months) === 1 ? '' : 's'} ${
      diffDays > 0 ? `${diffDays} day${diffDays > 1 ? 's' : ''}` : ''
    }`
  }

  if (days >= 7 && days <= 30) {
    const weeks = Math.floor(days / 7)

    return `${Math.floor(weeks)} week${weeks === 1 ? '' : 's'}`
  }

  if (days >= 1 && days <= 6) {
    return `${days} day${days > 1 ? 's' : ''}`
  }

  return `${hours >= 1 ? `${hours} hour${hours > 1 ? 's' : ''}` : ''} ${
    minutes >= 1 && hours === 0
      ? `${minutes} minute${minutes > 1 ? 's' : ''}`
      : ''
  } ${
    seconds >= 1 && minutes === 0 && hours === 0
      ? `${seconds} second${seconds > 1 ? 's' : ''}`
      : ''
  }`
}

function twoDigitsNumberString(value: number) {
  return `${value < 10 ? '0' : ''}${value}`
}

export function getTimeFromTimestamp(timestamp: string, fullDate: boolean = false, simplifiedDate: boolean = false) {
  const timestampToInt = Number.parseInt(timestamp)
  if (Number.isNaN(timestampToInt)) {
    return ''
  }
  const dateObject = new Date(timestampToInt * 1000)

  if (fullDate) {
    if (simplifiedDate) {
      return `${twoDigitsNumberString(
        dateObject.getMonth() + 1,
      )}/${twoDigitsNumberString(dateObject.getDate())} ${twoDigitsNumberString(
        dateObject.getHours(),
      )}:${twoDigitsNumberString(dateObject.getMinutes())}`
    }
    else {
      return dateObject.toLocaleString()
    }
  }
  return `${dateObject.getHours()}:${String(dateObject.getMinutes()).padStart(
    2,
    '0',
  )}`
}

export function calculateBytes(x: string | number, showDecimals = false, roundFloor = true, k8sUnit = false): IBytesCalc {
  let bytes

  if (typeof x === 'string') {
    bytes = Number.parseInt(x, 10)
  }
  else {
    bytes = x
  }

  if (bytes === 0) {
    return { total: 0, unit: units[0] }
  }

  // Gi : GiB
  const k = 1024

  // Get unit for measure
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const fractionDigits = showDecimals ? 1 : 0

  const bytesUnit = bytes / k ** i

  const roundedUnit = roundFloor ? Math.floor(bytesUnit) : bytesUnit

  // Get Unit parsed
  const unitParsed = Number.parseFloat(roundedUnit.toFixed(fractionDigits))
  const finalUnit = k8sUnit ? k8sCalcUnits[i] : units[i]

  return { total: unitParsed, unit: finalUnit }
}

// 格式化单位
export function prettySize(usage: string | number | undefined) {
  if (usage === undefined) {
    return '0MiB'
  }
  const { total, unit } = calculateBytes(usage, true, false)
  return total + unit
}

export function nsToSeconds(nanoseconds: number) {
  const conversion = nanoseconds * 0.000000001
  const round = Math.round((conversion + Number.EPSILON) * 10000) / 10000

  return `${round} s`
}

export function textToRGBColor(text: string) {
  const splitText = text.split('')

  const hashVl = splitText.reduce((acc, currItem) => {
    return acc + currItem.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)

  const hashColored = ((hashVl * 100) & 0x00FFFFFF).toString(16).toUpperCase()

  return `#${hashColored.padStart(6, '0')}`
}

export function prettyNumber(usage: number | undefined) {
  if (usage === undefined) {
    return 0
  }

  return usage.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function representationNumber(number: number | undefined) {
  if (number === undefined) {
    return '0'
  }

  let returnValue = number.toString()
  let unit = ''

  if (number > 999 && number < 1000000) {
    returnValue = (number / 1000).toFixed(1) // convert to K, numbers > 999
    unit = 'K'
  }
  else if (number >= 1000000 && number < 1000000000) {
    returnValue = (number / 1000000).toFixed(1) // convert to M, numbers >= 1 million
    unit = 'M'
  }
  else if (number >= 1000000000) {
    returnValue = (number / 1000000000).toFixed(1) // convert to B, numbers >= 1 billion
    unit = 'B'
  }

  if (returnValue.endsWith('.0')) {
    returnValue = returnValue.slice(0, -2)
  }

  return `${returnValue}${unit}`
}

/** Ref https://developer.mozilla.org/en-US/docs/Glossary/Base64 */

export function performDownload(blob: Blob, fileName: string) {
  const link = document.createElement('a')
  link.href = window.URL.createObjectURL(blob)
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function getCookieValue(cookieName: string) {
  return (
    document.cookie
      .match(`(^|;)\\s*${cookieName}\\s*=\\s*([^;]+)`)
      ?.pop() || ''
  )
}

export function capacityColors(usedSpace: number, maxSpace: number) {
  const percCalculate = (usedSpace * 100) / maxSpace

  if (percCalculate >= 90) {
    return '#C83B51'
  }
  else if (percCalculate >= 70) {
    return '#FFAB0F'
  }

  return '#07193E'
}

export function getClientOS(): string {
  const getPlatform = get(window.navigator, 'platform', 'undefined')

  if (!getPlatform) {
    return 'undefined'
  }

  return getPlatform
}

// Generates a valid access/secret key string
export const getRandomString = function (length = 16): string {
  let retval = ''
  const legalcharacters
    = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let i = 0; i < length; i++) {
    retval
      += legalcharacters[Math.floor(Math.random() * legalcharacters.length)]
  }
  return retval
}

// replaces bad unicode characters
export function replaceUnicodeChar(inputString: string): string {
  const unicodeChar = '\u202E'
  return inputString.split(unicodeChar).join('<�202e>')
}

// unescaped characters might throw error like '%'
export function safeDecodeURIComponent(value: any) {
  try {
    return decodeURIComponent(value)
  }
  catch (err) {
    return value
  }
}

export function getDriveStatusColor(activeDisks: number, totalDrives: number) {
  if (activeDisks <= totalDrives / 2) {
    return { 'bg-red': true }
  }
  if (totalDrives !== 2 && activeDisks === totalDrives / 2 + 1) {
    return { 'bg-yellow': true }
  }
  if (activeDisks === totalDrives) {
    return { 'bg-green': true }
  }
}

export function getServerStatusColor(health_status: string) {
  switch (health_status) {
    case 'offline':
      return { 'bg-red': true }
    case 'online':
      return { 'bg-green': true }
    default:
      return { 'bg-yellow': true }
  }
}
export function getNetworkStatusColor(activeNetwork: number, networkTotal: number) {
  if (activeNetwork <= networkTotal / 2) {
    return { 'bg-red': true }
  }
  if (activeNetwork === networkTotal / 2 + 1) {
    return { 'bg-yellow': true }
  }
  if (activeNetwork === networkTotal) {
    return { 'bg-green': true }
  }
}
