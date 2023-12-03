import { BaseTool } from "./BaseTool";

const sanitizeURL = (input: string): string => {
	const match = input.match(/(http[s]?:\/\/[^\s'"\|\\^~[\]`<>#%{}]+)/g);

	if (!match || match.length === 0) {
		throw new Error("Invalid URL");
	}

	return match[0].trim();
};

export class HttpRequestTool extends BaseTool {
	constructor() {
		super(
			"http_request",
			`A portal to the internet. Always use this tool when you need to get specific content from a website (i.e. HTTP GET Request). 
			Input should be a url. Here is an example input to this tool:

			"http://www.weather.com/forecastdata"

			Note: Do not include the HTTP method in the URL (i.e. GET or POST). Assume this tool handles GET requests only.

			Ensure the URL is complete, including the 'http://' or 'https://' prefix.
			The final answer to the question being asked is the Observation (i.e. output) from this tool.`
		);
	}

	override async execute(url: string): Promise<string> {
		console.log("HTTP: ", url);

		const sanitizedUrl = sanitizeURL(url);

		const response = await fetch(new URL(sanitizedUrl));

		if (response.status !== 200) {
			throw new Error(
				`HTTP Request failed with status code ${response.status}`
			);
		}

		const responseBody = await response.text();

		return responseBody;
	}
}
