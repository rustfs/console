// @ts-nocheck
// This plugin imports the SubtleCrypto polyfill for browser compatibility
import forge from "node-forge";

// Polyfill for SubtleCrypto
// https://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features/
// This is only needed for non-secure contexts (http://localhost:3000)
// and is used to provide a consistent API for cryptographic operations
// across different environments. It uses the forge library to implement
// the SubtleCrypto API in a way that is compatible with the Web Crypto API.
// The polyfill is loaded dynamically to avoid unnecessary overhead in secure contexts.
export default defineNuxtPlugin(() => {
  if (!globalThis.crypto) {
    globalThis.crypto = {} as Crypto;
  }

  const cryptoObj = globalThis.crypto;

  if (!cryptoObj.subtle) {
    cryptoObj.subtle = {
      async digest(algorithm: string | Algorithm, data: BufferSource): Promise<ArrayBuffer> {
        if (algorithm !== "SHA-256" && (algorithm as Algorithm).name !== "SHA-256") {
          throw new Error("Only SHA-256 is supported.");
        }
        const md = forge.md.sha256.create();
        md.update(forge.util.createBuffer(new Uint8Array(data as ArrayBuffer)).getBytes());
        return new Uint8Array(md.digest().bytes().split("").map(c => c.charCodeAt(0))).buffer;
      },
    };
  }

  if (!cryptoObj.randomUUID) {
    cryptoObj.randomUUID = function () {
      const randomBytes = cryptoObj.getRandomValues(new Uint8Array(16));
      randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40; // UUID version 4
      randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80; // UUID variant 1
      return [...randomBytes]
        .map((b, i) =>
          [4, 6, 8, 10].includes(i) ? `-${b.toString(16).padStart(2, "0")}` : b.toString(16).padStart(2, "0")
        )
        .join("");
    };
  }

  if (!cryptoObj.getRandomValues) {
    cryptoObj.getRandomValues = function (arr: Uint8Array): Uint8Array {
      const randomBytes = forge.random.getBytesSync(arr.length);
      for (let i = 0; i < arr.length; i++) {
        arr[i] = randomBytes.charCodeAt(i);
      }
      return arr;
    };
  }

  if (!cryptoObj.subtle.generateKey) {
    cryptoObj.subtle.generateKey = async function (
      algorithm: GenerateKeyParams,
      extractable: boolean,
      keyUsages: string[]
    ): Promise<CryptoKeyPair> {
      if (algorithm.name !== "ECDSA" || algorithm.namedCurve !== "P-256") {
        throw new Error("Only ECDSA with P-256 is supported.");
      }
      const keys = forge.pki.ec.generateKeyPair({ namedCurve: "P-256" });
      return {
        privateKey: keys.privateKey as CryptoKey,
        publicKey: keys.publicKey as CryptoKey,
      };
    };
  }

  if (!cryptoObj.subtle.sign) {
    cryptoObj.subtle.sign = async function (
      algorithm: Algorithm,
      key: CryptoKey,
      data: BufferSource
    ): Promise<ArrayBuffer> {
      if (algorithm.name !== "ECDSA" || algorithm.hash.name !== "SHA-256") {
        throw new Error("Only ECDSA with SHA-256 is supported.");
      }
      const md = forge.md.sha256.create();
      md.update(forge.util.createBuffer(new Uint8Array(data as ArrayBuffer)).getBytes());
      const signature = forge.pki.ec.sign(md, key);
      return new Uint8Array(signature.split("").map(c => c.charCodeAt(0))).buffer;
    };
  }

  if (!cryptoObj.subtle.verify) {
    cryptoObj.subtle.verify = async function (
      algorithm: Algorithm,
      key: CryptoKey,
      signature: BufferSource,
      data: BufferSource
    ): Promise<boolean> {
      if (algorithm.name !== "ECDSA" || algorithm.hash.name !== "SHA-256") {
        throw new Error("Only ECDSA with SHA-256 is supported.");
      }
      const md = forge.md.sha256.create();
      md.update(forge.util.createBuffer(new Uint8Array(data as ArrayBuffer)).getBytes());
      return forge.pki.ec.verify(md, key, signature);
    };
  }

  if (!cryptoObj.subtle.exportKey) {
    cryptoObj.subtle.exportKey = async function (
      format: string,
      key: CryptoKey
    ): Promise<JsonWebKey | ArrayBuffer> {
      if (format === "jwk") {
        if ((key as any).type === "private") {
          return forge.pki.privateKeyToJwk(key) as JsonWebKey;
        } else if ((key as any).type === "public") {
          return forge.pki.publicKeyToJwk(key) as JsonWebKey;
        }
      }
      throw new Error("Unsupported export key format or type.");
    };
  }

  if (!cryptoObj.subtle.importKey) {
    cryptoObj.subtle.importKey = async function (
      format: string,
      keyData: JsonWebKey | ArrayBuffer,
      algorithm: Algorithm,
      extractable: boolean,
      keyUsages: string[]
    ): Promise<CryptoKey> {
      if (format === "jwk") {
        if (keyData.type === "private") {
          return forge.pki.jwkToPrivateKey(keyData) as CryptoKey;
        } else if (keyData.type === "public") {
          return forge.pki.jwkToPublicKey(keyData) as CryptoKey;
        }
      }
      throw new Error("Unsupported import key format or type.");
    };
  }

  if (!cryptoObj.subtle.encrypt) {
    cryptoObj.subtle.encrypt = async function (
      algorithm: Algorithm,
      key: CryptoKey,
      data: BufferSource
    ): Promise<ArrayBuffer> {
      throw new Error("Encrypt not implemented");
    };
  }

  if (!cryptoObj.subtle.decrypt) {
    cryptoObj.subtle.decrypt = async function (
      algorithm: Algorithm,
      key: CryptoKey,
      data: BufferSource
    ): Promise<ArrayBuffer> {
      throw new Error("Decrypt not implemented");
    };
  }

  return {
    provide: {
      crypto: cryptoObj,
    },
  };
})
