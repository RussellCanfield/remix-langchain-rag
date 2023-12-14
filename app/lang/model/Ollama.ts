import { type BaseModel, ModelOptions, ModelStream } from "./BaseModel";

export interface OllamaModelOptions extends ModelOptions {
	baseUrl: string;
	k?: number;
	p?: number;
}

export class Ollama implements BaseModel {
	temperature: number;
	model?: string;
	baseUrl: string;
	k?: number;
	p?: number;

	constructor(options: OllamaModelOptions) {
		this.temperature = options.temperature ?? 0;
		this.model = options.model ?? "llama2";
		this.baseUrl = options.baseUrl ?? "http://localhost:11434";
		this.k = options.k ?? 20;
		this.p = options.p ?? 0.3;
	}

	getStream = async (prompt: string): Promise<ModelStream> =>
		await fetch(new URL(`${this.baseUrl}/api/generate`), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: this.model,
				prompt,
				options: {
					temperature: this.temperature,
					top_k: this.k,
					top_p: this.p,
				},
			}),
		}).then((res) => res.body as ModelStream);
}
