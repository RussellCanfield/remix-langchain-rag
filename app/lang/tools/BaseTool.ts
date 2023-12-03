export abstract class BaseTool {
	name: string;
	description: string;

	constructor(name: string, description: string) {
		this.name = name;
		this.description = description;
	}

	abstract execute(input: string | undefined): Promise<string>;
}
