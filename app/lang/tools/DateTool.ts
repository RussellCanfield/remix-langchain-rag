import { BaseTool } from "./BaseTool";

export class DateTool extends BaseTool {
	constructor() {
		super(
			"current_date",
			`Useful to find the current date. The input to this tool is an empty string. The output of this tool is the current date as a string in the following format: YYYY-mm-DD.`
		);
	}

	override async execute(_: string): Promise<string> {
		return new Date().toISOString().split("T")[0];
	}
}
