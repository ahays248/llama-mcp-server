/**
 * HTTP client for llama-server communication.
 *
 * Provides a typed interface for all llama-server endpoints.
 */
import type { Config } from './config.js';
import type { HealthResponse, PropsResponse, ModelsResponse, SlotsResponse, TokenizeOptions, TokenizeResponse, DetokenizeResponse, ApplyTemplateResponse, CompletionOptions, CompletionResponse, ChatMessage, ChatOptions, ChatResponse, EmbedResponse, InfillOptions, InfillResponse, RerankResponse, LoraAdapter, LoraAdapterUpdate } from './types.js';
/**
 * Interface for llama-server HTTP client.
 */
export interface LlamaClient {
    baseUrl: string;
    timeout: number;
    health(): Promise<HealthResponse>;
    props(settings?: Record<string, unknown>): Promise<PropsResponse>;
    models(): Promise<ModelsResponse>;
    slots(): Promise<SlotsResponse>;
    metrics(): Promise<string>;
    tokenize(content: string, options?: TokenizeOptions): Promise<TokenizeResponse>;
    detokenize(tokens: number[]): Promise<DetokenizeResponse>;
    applyTemplate(messages: ChatMessage[]): Promise<ApplyTemplateResponse>;
    complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse>;
    chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
    embed(content: string): Promise<EmbedResponse>;
    infill(prefix: string, suffix: string, options?: InfillOptions): Promise<InfillResponse>;
    rerank(query: string, documents: string[]): Promise<RerankResponse>;
    loadModel(model: string): Promise<void>;
    unloadModel(model: string): Promise<void>;
    loraList(): Promise<LoraAdapter[]>;
    loraSet(adapters: LoraAdapterUpdate[]): Promise<LoraAdapter[]>;
}
/**
 * Create an HTTP client for llama-server.
 *
 * @param config - Configuration with server URL and timeout
 * @returns LlamaClient instance
 */
export declare function createClient(config: Config): LlamaClient;
