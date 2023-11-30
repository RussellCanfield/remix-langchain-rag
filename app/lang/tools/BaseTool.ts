export interface BaseToolOptions {
	promptTemplate: string;
}

export abstract class BaseTool {
	name: string;
	description: string;
	options?: BaseToolOptions;

	constructor(name: string, description: string, options?: BaseToolOptions) {
		this.name = name;
		this.description = description;
		this.options = options;
	}

	abstract execute(input: string | undefined): Promise<string>;
}
