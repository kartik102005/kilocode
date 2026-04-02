import { describe, it, expect, afterEach } from "bun:test"
import { initiateDeviceAuth } from "@kilocode/kilo-gateway"

describe("device auth error handling", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe("initiateDeviceAuth", () => {
    it("throws descriptive error on 403 forbidden", async () => {
      globalThis.fetch = async () => {
        return new Response(null, { status: 403, statusText: "Forbidden" })
      }

      await expect(async () => initiateDeviceAuth()).toThrow(/Access denied|invalid API key|account suspension/)
    })

    it("throws descriptive error on 401 unauthorized", async () => {
      globalThis.fetch = async () => {
        return new Response(null, { status: 401, statusText: "Unauthorized" })
      }

      await expect(async () => initiateDeviceAuth()).toThrow(/Authentication required|valid Kilo account/)
    })

    it("throws descriptive error on 429 rate limit", async () => {
      globalThis.fetch = async () => {
        return new Response(null, { status: 429, statusText: "Too Many Requests" })
      }

      await expect(async () => initiateDeviceAuth()).toThrow(/Too many pending authorization requests/)
    })

    it("throws descriptive error on 500 server error", async () => {
      globalThis.fetch = async () => {
        return new Response(null, { status: 500, statusText: "Internal Server Error" })
      }

      await expect(async () => initiateDeviceAuth()).toThrow(/Kilo API server error/)
    })

    it("returns response on success", async () => {
      const mockResponse = {
        code: "test-code-123",
        verificationUrl: "https://kilo.ai/verify/test-code-123",
        expiresIn: 300,
      }

      globalThis.fetch = async () => {
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      const result = await initiateDeviceAuth()
      expect(result.code).toBe("test-code-123")
      expect(result.verificationUrl).toBe("https://kilo.ai/verify/test-code-123")
      expect(result.expiresIn).toBe(300)
    })

    it("sends JSON body in POST request", async () => {
      let requestBody: string | undefined
      let requestMethod: string | undefined
      let requestHeaders: Record<string, string> = {}

      globalThis.fetch = async (_url: string, init?: RequestInit) => {
        requestMethod = init?.method
        requestBody = init?.body as string
        requestHeaders = (init?.headers as Record<string, string>) || {}
        return new Response(JSON.stringify({
          code: "test",
          verificationUrl: "https://kilo.ai/verify",
          expiresIn: 300,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      await initiateDeviceAuth()

      expect(requestMethod).toBe("POST")
      expect(requestBody).toBe("{}")
      expect(requestHeaders["Content-Type"]).toBe("application/json")
      expect(requestHeaders["Accept"]).toBe("application/json")
    })
  })
})
