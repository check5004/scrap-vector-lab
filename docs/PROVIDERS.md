# Mode A providers

Mode A supports two explicit destinations. Selecting a provider never switches automatically to another provider or model. API calls require the user's own key and the UI's explicit photo/paid-usage consent.

| Provider | Exact requested model | Inference endpoint |
| --- | --- | --- |
| OpenRouter | `openai/gpt-6-luna` | `POST https://openrouter.ai/api/v1/chat/completions` |
| OpenAI | `gpt-6-luna` | `POST https://api.openai.com/v1/responses` |

## Preflight and routing

- OpenRouter first authenticates with `GET https://openrouter.ai/api/v1/key`. This is a metadata request, not a model generation. The current official endpoint is `/key`.
- It then reads the public `GET https://openrouter.ai/api/v1/models` catalog without transmitting the key. The exact model must be present and advertise image input, `response_format`, and `structured_outputs`.
- The OpenRouter request uses a text part followed by an `image_url` part containing a JPEG data URL. Its `response_format` is `json_schema` with `strict: true`, and `provider.require_parameters` is `true` so unsupported endpoints are excluded. No fallback model list or alternate model is provided.
- OpenAI retains its authenticated exact-model lookup and Responses API call with `store: false` and strict JSON-schema output.
- Catalog presence is not a guarantee of an individual account's entitlement, available credits, endpoint health, or geometric measurement accuracy. Preflight does not generate an image inference; pressing Run still makes a potentially billable inference request.

## Key handling and safety

`validateProviderKey(provider, key)` checks the key locally and returns a safe message or `null`. OpenRouter requires the currently documented `sk-or-v1-` prefix; OpenAI rejects `sk-or-` keys. Changing provider must clear the UI key and consent. These checks stop a wrong-provider key before any request; they do not establish that a key is valid.

The provider layer only holds key material in function-local memory. It does not write it to browser storage, exports, URLs, analytics, or logs. Authenticated fetches use the selected provider's fixed endpoints, omit cookies and referrers, and reject redirects. No arbitrary endpoint configuration is supported. This browser BYOK proof of concept remains appropriate only on a trusted page/device; production should use a secure authenticated backend.

OpenRouter receives the photograph and board dimensions and routes the request to its model provider. Their data policies apply. `store: false` on direct OpenAI requests is not a guarantee of zero retention.

## Errors, cancellation and output

`ProviderError` exposes only `provider`, `stage`, `endpoint`, `status`, `code`, and a safe local message. It never includes raw provider messages/bodies, request headers, image bytes, or a raw exception cause. An HTTP 200 response containing an error envelope is an error; its HTTP status stays 200 and any recognized numeric API error is distinguished in `code`.

401 indicates authentication was rejected, but does not by itself identify a particular cause. Check provider/key pairing, missing/invalid credentials, revocation, or expiry. Other statuses have separate guidance: credits/limits (402), permissions/policy/budgets (403), model/endpoint availability (404), rate limits (429), or service failures (5xx). No automatic retry is performed because a failed-looking inference may already have been charged.

An `AbortSignal` stops preflight or an in-flight request. The code checks cancellation before image serialization and immediately before POST, and ignores late success after cancellation. Aborting cannot undo data already transmitted or charges already incurred. Local segmentation also accepts the signal and terminates its worker on abort, timeout, success, or failure.

Responses must report the requested Luna model (or a dated snapshot of it), complete normally, contain valid JSON, match the exact shape structure, and pass finite-coordinate, topology, hole containment, complexity, and board-bound checks. Missing, refused, incomplete, malformed, or different-model results fail closed. No substitute coordinates are created.

## Implementation contract

- `inferLunaProvider(provider, key, image, board, progress, signal?)` returns `{ geometry, model, requestId, provider }`.
- `inferLuna(...)` is a backwards-compatible OpenAI wrapper.
- `progress` receives human-readable strings only; it never receives keys or provider bodies.
- `segment(source, progress, signal?)` retains its prior result and forwards optional worker timings.
- Unit tests in `tests/ai.test.ts` replace fetch and workers explicitly. They make no actual API request, use no real key, and do not demonstrate authenticated/paid-inference success.

## Official references checked 2026-10-15

- [OpenRouter current-key metadata endpoint](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key)
- [OpenRouter chat completion endpoint](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion)
- [OpenRouter image-input guide](https://openrouter.ai/blog/tutorials/send-image-to-llm/)
- [OpenRouter structured outputs and required-parameter routing](https://openrouter.ai/docs/guides/features/structured-outputs)
- [OpenRouter live model catalog](https://openrouter.ai/api/v1/models), listing exact `openai/gpt-6-luna` and image/structured-output support when checked
- [OpenRouter key creation reference](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys) and [OAuth key response](https://openrouter.ai/docs/api/api-reference/o-auth/exchange-auth-code-for-api-key), documenting the current key prefix
- [OpenRouter authentication](https://openrouter.ai/docs/api_reference/authentication) and [error handling](https://openrouter.ai/docs/api_reference/errors-and-debugging)
