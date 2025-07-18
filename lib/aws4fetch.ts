// this file is migrated from https://github.com/mhart/aws4fetch

// use forge to create HMAC and SHA256 hashes
// because crypto.subtle is not available in non-secure contexts
// https://developer.mozilla.org/zh-CN/docs/Web/API/SubtleCrypto
import forge from "node-forge";

/**
 * @license MIT <https://opensource.org/licenses/MIT>
 * @copyright Michael Hart 2024
 */
const encoder = new TextEncoder();

const HOST_SERVICES: Record<string, string> = {
  appstream2: "appstream",
  cloudhsmv2: "cloudhsm",
  email: "ses",
  marketplace: "aws-marketplace",
  mobile: "AWSMobileHubService",
  pinpoint: "mobiletargeting",
  queue: "sqs",
  "git-codecommit": "codecommit",
  "mturk-requester-sandbox": "mturk-requester",
  "personalize-runtime": "personalize",
};

// https://github.com/aws/aws-sdk-js/blob/cc29728c1c4178969ebabe3bbe6b6f3159436394/lib/signers/v4.js#L190-L198
const UNSIGNABLE_HEADERS = new Set([
  "authorization",
  "content-type",
  "content-length",
  "user-agent",
  "presigned-expires",
  "expect",
  "x-amzn-trace-id",
  "range",
  "connection",
]);

export class AwsClient {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  service?: string;
  region?: string;
  cache: Map<string, ArrayBuffer>;
  retries: number;
  initRetryMs: number;

  /**
   * @param {{
   *   accessKeyId: string
   *   secretAccessKey: string
   *   sessionToken?: string
   *   service?: string
   *   region?: string
   *   cache?: Map<string, ArrayBuffer>
   *   retries?: number
   *   initRetryMs?: number
   * }} options
   */
  constructor({
    accessKeyId,
    secretAccessKey,
    sessionToken,
    service,
    region,
    cache,
    retries,
    initRetryMs,
  }: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    service?: string;
    region?: string;
    cache?: Map<string, ArrayBuffer>;
    retries?: number;
    initRetryMs?: number;
  }) {
    if (accessKeyId == null) throw new TypeError("accessKeyId is a required option");
    if (secretAccessKey == null) throw new TypeError("secretAccessKey is a required option");
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.sessionToken = sessionToken;
    this.service = service;
    this.region = region;
    /** @type {Map<string, ArrayBuffer>} */
    this.cache = cache || new Map();
    this.retries = retries != null ? retries : 0; // Up to 25.6 secs
    this.initRetryMs = initRetryMs || 50;
  }

  /**
   * @typedef {RequestInit & {
   *   aws?: {
   *     accessKeyId?: string
   *     secretAccessKey?: string
   *     sessionToken?: string
   *     service?: string
   *     region?: string
   *     cache?: Map<string, ArrayBuffer>
   *     datetime?: string
   *     signQuery?: boolean
   *     appendSessionToken?: boolean
   *     allHeaders?: boolean
   *     singleEncode?: boolean
   *   }
   * }} AwsRequestInit
   *
   * @param {Request | { toString: () => string }} input
   * @param {?AwsRequestInit} [init]
   * @returns {Promise<Request>}
   */
  async sign(
    input: string | Request,
    init: { body: ArrayBuffer | ReadableStream<Uint8Array<ArrayBufferLike>> | null; aws: any }
  ) {
    if (input instanceof Request) {
      const { method, url, headers, body } = input;
      init = Object.assign({ method, url, headers }, init);
      if (init.body == null && headers.has("Content-Type")) {
        init.body = body != null && headers.has("X-Amz-Content-Sha256") ? body : await input.clone().arrayBuffer();
      }
      input = url;
    }
    const signer = new AwsV4Signer(Object.assign({ url: input.toString() }, init, this, init && init.aws));
    const signed = Object.assign({}, init, await signer.sign());
    delete signed.aws;
    try {
      return new Request(signed.url.toString(), signed);
    } catch (e) {
      if (e instanceof TypeError) {
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1360943
        return new Request(signed.url.toString(), Object.assign({ duplex: "half" }, signed));
      }
      throw e;
    }
  }

  /**
   * @param {Request | { toString: () => string }} input
   * @param {?AwsRequestInit} [init]
   * @returns {Promise<Response>}
   */
  async fetch(input: any, init: any) {
    for (let i = 0; i <= this.retries; i++) {
      const fetched = fetch(await this.sign(input, init));
      if (i === this.retries) {
        return fetched; // No need to await if we're returning anyway
      }
      const res = await fetched;
      if (res.status < 500 && res.status !== 429) {
        return res;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.random() * this.initRetryMs * Math.pow(2, i)));
    }
    throw new Error("An unknown error occurred, ensure retries is not negative");
  }
}

export class AwsV4Signer {
  method: string;
  url: URL;
  headers: Headers;
  body: BodyInit | null | undefined;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string | undefined;
  service: any;
  region: any;
  cache: Map<any, any>;
  datetime: string;
  signQuery: boolean | undefined;
  appendSessionToken: boolean;
  signableHeaders: any[];
  signedHeaders: any;
  canonicalHeaders: any;
  credentialString: string;
  encodedPath: string;
  encodedSearch: string;
  /**
   * @param {{
   *   method?: string
   *   url: string
   *   headers?: HeadersInit
   *   body?: BodyInit | null
   *   accessKeyId: string
   *   secretAccessKey: string
   *   sessionToken?: string
   *   service?: string
   *   region?: string
   *   cache?: Map<string, ArrayBuffer>
   *   datetime?: string
   *   signQuery?: boolean
   *   appendSessionToken?: boolean
   *   allHeaders?: boolean
   *   singleEncode?: boolean
   * }} options
   */
  constructor({
    method,
    url,
    headers,
    body,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    service,
    region,
    cache,
    datetime,
    signQuery,
    appendSessionToken,
    allHeaders,
    singleEncode,
  }: {
    method?: string;
    url: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    service?: string;
    region?: string;
    cache?: Map<string, ArrayBuffer>;
    datetime?: string;
    signQuery?: boolean;
    appendSessionToken?: boolean;
    allHeaders?: boolean;
    singleEncode?: boolean;
  }) {
    if (url == null) throw new TypeError("url is a required option");
    if (accessKeyId == null) throw new TypeError("accessKeyId is a required option");
    if (secretAccessKey == null) throw new TypeError("secretAccessKey is a required option");

    this.method = method || (body ? "POST" : "GET");
    this.url = new URL(url);
    this.headers = new Headers(headers || {});
    this.body = body;

    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.sessionToken = sessionToken;

    let guessedService, guessedRegion;
    if (!service || !region) {
      [guessedService, guessedRegion] = guessServiceRegion(this.url, this.headers);
    }
    this.service = service || guessedService || "";
    this.region = region || guessedRegion || "us-east-1";

    /** @type {Map<string, ArrayBuffer>} */
    this.cache = cache || new Map();
    this.datetime = datetime || new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    this.signQuery = signQuery;
    this.appendSessionToken = appendSessionToken || this.service === "iotdevicegateway";

    this.headers.delete("Host"); // Can't be set in insecure env anyway

    if (this.service === "s3" && !this.signQuery && !this.headers.has("X-Amz-Content-Sha256")) {
      this.headers.set("X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD");
    }

    const params = this.signQuery ? this.url.searchParams : this.headers;

    params.set("X-Amz-Date", this.datetime);
    if (this.sessionToken && !this.appendSessionToken) {
      params.set("X-Amz-Security-Token", this.sessionToken);
    }

    // headers are always lowercase in keys()
    this.signableHeaders = ["host", ...this.headers.keys()]
      .filter((header) => allHeaders || !UNSIGNABLE_HEADERS.has(header))
      .sort();

    this.signedHeaders = this.signableHeaders.join(";");

    // headers are always trimmed:
    // https://fetch.spec.whatwg.org/#concept-header-value-normalize
    this.canonicalHeaders = this.signableHeaders
      .map(
        (header) =>
          header + ":" + (header === "host" ? this.url.host : (this.headers.get(header) || "").replace(/\s+/g, " "))
      )
      .join("\n");

    this.credentialString = [this.datetime.slice(0, 8), this.region, this.service, "aws4_request"].join("/");

    if (this.signQuery) {
      if (this.service === "s3" && !params.has("X-Amz-Expires")) {
        params.set("X-Amz-Expires", "86400"); // 24 hours
      }
      params.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
      params.set("X-Amz-Credential", this.accessKeyId + "/" + this.credentialString);
      params.set("X-Amz-SignedHeaders", this.signedHeaders);
    }

    if (this.service === "s3") {
      try {
        this.encodedPath = decodeURIComponent(this.url.pathname.replace(/\+/g, " "));
      } catch (e) {
        this.encodedPath = this.url.pathname;
      }
    } else {
      this.encodedPath = this.url.pathname.replace(/\/+/g, "/");
    }
    if (!singleEncode) {
      this.encodedPath = encodeURIComponent(this.encodedPath).replace(/%2F/g, "/");
    }
    this.encodedPath = encodeRfc3986(this.encodedPath);

    const seenKeys = new Set();
    this.encodedSearch = [...this.url.searchParams]
      .filter(([k]) => {
        if (!k) return false; // no empty keys
        if (this.service === "s3") {
          if (seenKeys.has(k)) return false; // first val only for S3
          seenKeys.add(k);
        }
        return true;
      })
      .map((pair) => pair.map((p) => encodeRfc3986(encodeURIComponent(p))))
      // NOTE: Previously there was a TypeScript error about "k1 is possibly undefined" due to noUncheckedIndexedAccess
      .sort(([k1, v1], [k2, v2]) => (k1 < k2 ? -1 : k1 > k2 ? 1 : v1 < v2 ? -1 : v1 > v2 ? 1 : 0))
      .map((pair) => pair.join("="))
      .join("&");
  }

  /**
   * @returns {Promise<{
   *   method: string
   *   url: URL
   *   headers: Headers
   *   body?: BodyInit | null
   * }>}
   */
  async sign() {
    if (this.signQuery) {
      this.url.searchParams.set("X-Amz-Signature", await this.signature());
      if (this.sessionToken && this.appendSessionToken) {
        this.url.searchParams.set("X-Amz-Security-Token", this.sessionToken);
      }
    } else {
      this.headers.set("Authorization", await this.authHeader());
    }

    return {
      method: this.method,
      url: this.url,
      headers: this.headers,
      body: this.body,
    };
  }

  /**
   * @returns {Promise<string>}
   */
  async authHeader() {
    return [
      "AWS4-HMAC-SHA256 Credential=" + this.accessKeyId + "/" + this.credentialString,
      "SignedHeaders=" + this.signedHeaders,
      "Signature=" + (await this.signature()),
    ].join(", ");
  }

  /**
   * @returns {Promise<string>}
   */
  async signature() {
    const date = this.datetime.slice(0, 8);
    const cacheKey = [this.secretAccessKey, date, this.region, this.service].join();
    let kCredentials = this.cache.get(cacheKey);
    if (!kCredentials) {
      const kDate = await hmac("AWS4" + this.secretAccessKey, date);
      const kRegion = await hmac(kDate, this.region);
      const kService = await hmac(kRegion, this.service);
      kCredentials = await hmac(kService, "aws4_request");
      this.cache.set(cacheKey, kCredentials);
    }
    return buf2hex(await hmac(kCredentials, await this.stringToSign()));
  }

  /**
   * @returns {Promise<string>}
   */
  async stringToSign() {
    return [
      "AWS4-HMAC-SHA256",
      this.datetime,
      this.credentialString,
      buf2hex(await hash(await this.canonicalString())),
    ].join("\n");
  }

  /**
   * @returns {Promise<string>}
   */
  async canonicalString() {
    return [
      this.method.toUpperCase(),
      this.encodedPath,
      this.encodedSearch,
      this.canonicalHeaders + "\n",
      this.signedHeaders,
      await this.hexBodyHash(),
    ].join("\n");
  }

  /**
   * @returns {Promise<string>}
   */
  async hexBodyHash() {
    let hashHeader =
      this.headers.get("X-Amz-Content-Sha256") || (this.service === "s3" && this.signQuery ? "UNSIGNED-PAYLOAD" : null);
    if (hashHeader == null) {
      if (this.body && typeof this.body !== "string" && !("byteLength" in this.body)) {
        throw new Error(
          "body must be a string, ArrayBuffer or ArrayBufferView, unless you include the X-Amz-Content-Sha256 header"
        );
      }
      hashHeader = buf2hex(await hash(this.body || ""));
    }
    return hashHeader;
  }
}

/**
 * @param {string | BufferSource} key
 * @param {string} string
 * @returns {Promise<ArrayBuffer>}
 */
async function hmac(
  key: string | ArrayBuffer | ArrayBufferView | forge.util.ByteStringBuffer | null,
  string: string | undefined
) {
  const hmac = forge.hmac.create();

  // Handle key conversion
  if (typeof key === "string") {
    hmac.start("sha256", key);
  } else if (key instanceof ArrayBuffer) {
    const keyArray = new Uint8Array(key);
    const keyString = String.fromCharCode.apply(null, [...keyArray]);
    hmac.start("sha256", keyString);
  } else if (key && "getBytes" in key) {
    // Forge ByteStringBuffer object
    hmac.start("sha256", key.getBytes());
  } else if (key) {
    // ArrayBufferView
    const keyArray = new Uint8Array(key.buffer);
    const keyString = String.fromCharCode.apply(null, [...keyArray]);
    hmac.start("sha256", keyString);
  } else {
    // Handle null
    hmac.start("sha256", "");
  }

  // Handle input string
  if (typeof string === "string") {
    hmac.update(string);
  } else {
    const encoded = encoder.encode(string);
    const stringValue = String.fromCharCode.apply(null, [...encoded]);
    hmac.update(stringValue);
  }

  // Convert forge output to ArrayBuffer
  const digestBytes = hmac.digest().getBytes();
  const buffer = new Uint8Array(digestBytes.length);
  for (let i = 0; i < digestBytes.length; i++) {
    buffer[i] = digestBytes.charCodeAt(i);
  }

  return buffer.buffer;
}

/**
 * @param {string | BufferSource} content
 * @returns {Promise<ArrayBuffer>}
 */
async function hash(content: string | ArrayBufferView<ArrayBufferLike> | ArrayBuffer) {
  const md = forge.md.sha256.create();

  if (typeof content === "string") {
    md.update(content);
  } else {
    // Convert BufferSource to forge format
    const contentArray = content instanceof ArrayBuffer ? new Uint8Array(content) : new Uint8Array(content.buffer);
    const contentString = String.fromCharCode.apply(null, [...contentArray]);
    md.update(contentString);
  }

  // Convert forge output to ArrayBuffer
  const digestBytes = md.digest().getBytes();
  const buffer = new Uint8Array(digestBytes.length);
  for (let i = 0; i < digestBytes.length; i++) {
    buffer[i] = digestBytes.charCodeAt(i);
  }

  return buffer.buffer;
}

const HEX_CHARS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

/**
 * @param {ArrayBufferLike} arrayBuffer
 * @returns {string}
 */
function buf2hex(arrayBuffer: ArrayBuffer) {
  const buffer = new Uint8Array(arrayBuffer);
  let out = "";
  for (let idx = 0; idx < buffer.length; idx++) {
    const n = buffer[idx];
    // NOTE: "n is possibly undefined" due to overzealous noUncheckedIndexedAccess
    out += HEX_CHARS[(n >>> 4) & 0xf];
    // NOTE: "n is possibly undefined" due to overzealous noUncheckedIndexedAccess
    out += HEX_CHARS[n & 0xf];
  }
  return out;
}

/**
 * @param {string} urlEncodedStr
 * @returns {string}
 */
function encodeRfc3986(urlEncodedStr: string) {
  return urlEncodedStr.replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * @param {URL} url
 * @param {Headers} headers
 * @returns {[string, string]} [service, region]
 */
function guessServiceRegion(url: URL, headers: Headers) {
  const { hostname, pathname } = url;

  if (hostname.endsWith(".on.aws")) {
    const match = hostname.match(/^[^.]{1,63}\.lambda-url\.([^.]{1,63})\.on\.aws$/);
    return match != null ? ["lambda", match[1] || ""] : ["", ""];
  }
  if (hostname.endsWith(".r2.cloudflarestorage.com")) {
    return ["s3", "auto"];
  }
  if (hostname.endsWith(".backblazeb2.com")) {
    const match = hostname.match(/^(?:[^.]{1,63}\.)?s3\.([^.]{1,63})\.backblazeb2\.com$/);
    return match != null ? ["s3", match[1] || ""] : ["", ""];
  }
  const match = hostname.replace("dualstack.", "").match(/([^.]{1,63})\.(?:([^.]{0,63})\.)?amazonaws\.com(?:\.cn)?$/);
  let service = (match && match[1]) || "";
  let region = match && match[2];

  if (region === "us-gov") {
    region = "us-gov-west-1";
  } else if (region === "s3" || region === "s3-accelerate") {
    region = "us-east-1";
    service = "s3";
  } else if (service === "iot") {
    if (hostname.startsWith("iot.")) {
      service = "execute-api";
    } else if (hostname.startsWith("data.jobs.iot.")) {
      service = "iot-jobs-data";
    } else {
      service = pathname === "/mqtt" ? "iotdevicegateway" : "iotdata";
    }
  } else if (service === "autoscaling") {
    const targetPrefix = (headers.get("X-Amz-Target") || "").split(".")[0];
    if (targetPrefix === "AnyScaleFrontendService") {
      service = "application-autoscaling";
    } else if (targetPrefix === "AnyScaleScalingPlannerFrontendService") {
      service = "autoscaling-plans";
    }
  } else if (region == null && service.startsWith("s3-")) {
    region = service.slice(3).replace(/^fips-|^external-1/, "");
    service = "s3";
  } else if (service.endsWith("-fips")) {
    service = service.slice(0, -5);
  } else if (region && /-\d$/.test(service) && !/-\d$/.test(region)) {
    [service, region] = [region, service];
  }

  return [HOST_SERVICES[service] || service, region || ""];
}
