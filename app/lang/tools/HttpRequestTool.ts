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
			`A portal to the internet. Always use this tool when you need to get specific content from a website (i.e. HTTP Request). Input should be a url string.
			
			Example inputs to this tool: 
				'http://www.weather.com/forecastdata'
				'https://www.google.com/search?q=weather'

			The output will be the text response of the GET request.`
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
