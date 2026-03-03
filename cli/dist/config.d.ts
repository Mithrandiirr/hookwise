export interface HookwiseConfig {
    apiKey: string;
    baseUrl: string;
}
export declare function loadConfig(): HookwiseConfig | null;
export declare function saveConfig(config: HookwiseConfig): void;
export declare function requireConfig(): HookwiseConfig;
