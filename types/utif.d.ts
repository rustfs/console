declare module "utif" {
  interface UTIFIFD {
    width: number
    height: number
    [key: string]: unknown
  }

  interface UTIFModule {
    decode: (buffer: ArrayBuffer) => UTIFIFD[]
    decodeImage: (buffer: ArrayBuffer, ifd: UTIFIFD) => void
    toRGBA8: (ifd: UTIFIFD) => Uint8Array
  }

  const UTIF: UTIFModule
  export = UTIF
}
