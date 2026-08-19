/**
 * list_directory tool: read-only directory listing.
 * @module dsh-tool-list-dir
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "tool-list-dir";
export declare const inject: string[];
/** Plugin configuration schema. */
export interface Config {
    /** Order of the system prompt guidance section (default: 100). */
    order?: number;
    /** Custom guidance text for the system prompt (default: standard guidance). */
    guidance?: string;
    /** Maximum number of entries to return before truncation (default: 100). */
    maxEntries?: number;
}
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map