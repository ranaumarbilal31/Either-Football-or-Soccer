import { Save } from "./types";
export declare function loadGame(): Promise<Save>;
export declare function saveGame(save: Save): Promise<void>;
export declare function oldArchive(): Promise<any>;
export declare function download(value: unknown, name: string): void;
