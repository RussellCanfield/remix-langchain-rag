import { BaseTool, BaseToolOptions } from "./BaseTool";

export interface OpenApiToolOptions extends BaseToolOptions {
	openApiDocument: string;
	apiDescription: string;
}

const basePrompt = `
You are a developer working with an OpenAPI specification JSON document. Your goal is to extract the server URL from the JSON document and make a HTTP request to gather information to answer the question. 
The OpenAPI specification includes information about the API endpoints, methods, and the server where the API is hosted.
Use the information provided in the OpenAPI specification JSON document to extract the server URL.
Ensure that you only use the URL contained in the JSON document; do not make up a URL. If the document contains multiple servers, choose the appropriate one based on the context of your task.
If the server URL is nested within other structures, navigate through the JSON using the appropriate keys or paths until you reach the server URL.
Once you have successfully extracted the server URL, navigate through the JSON using the appropriate keys or paths until you find the path that matches the question. The path
will have a summary object as a sub-key that provides context for that the path is used for.
After finding the best path, the path should contain the HTTP method expected which is a 'GET' or 'POST'.
Note: Assume that the OpenAPI specification follows the standard format, and the server URL, path and HTTP method is explicitly specified within the document.
Note: The server URL is typically located under the 'servers' key, but it may be nested within other structures.

-----

Please make sure that the generated output does not contain any Markdown syntax. If necessary, rephrase or simplify the response to avoid such characters. 
If the model provides a response with Markdown-like elements, revise accordingly.
Note: Markdown syntax includes characters such as '*', '_', '#', '<', '>' and backticks.

Identify the server URL, path and HTTP method. Observe the result in as a single line using the format below:

'http://www.weather.com/forecastdata'
`;

const sanitizeURL = (input: string): string => {
	const match = input.match(/(http[s]?:\/\/[^\s'"\|\\^~[\]`<>#%{}]+)/g);

	if (!match || match.length === 0) {
		throw new Error("Invalid URL");
	}

	return match[0].trim();
};

export class OpenApiTool extends BaseTool {
	options: OpenApiToolOptions;

	constructor(options: Omit<OpenApiToolOptions, "promptTemplate">) {
		super(
			"open_api",
			`Always use this tool to retrieve OpenAPI spec documents from the following url:. 
			Once you have the OpenAPI spec, do not use this tool again.
			The output will be an OpenAPI spec document as a JSON document.`
		);

		this.options = {
			...options,
			promptTemplate: basePrompt,
		};
	}

	async execute(input: string): Promise<string> {
		console.log("OpenApiTool: ", input);

		const url = input;

		const sanitizedUrl = sanitizeURL(url);
		const response = await fetch(sanitizedUrl).then((res) => res.text());

		return `OpenAPI spec JSON document: 
				'${response}'
				`;
	}
}
