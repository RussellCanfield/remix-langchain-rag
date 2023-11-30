export interface ModelOptions {
	temperature: number;
	model?: string;
}

export type ModelStream = ReadableStream<Uint8Array> &
	AsyncIterable<Uint8Array>;

export interface BaseModel extends ModelOptions {
	getStream: (prompt: string) => Promise<ModelStream>;
}
