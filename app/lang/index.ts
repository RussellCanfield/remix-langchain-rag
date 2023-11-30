import { BaseTool } from "./tools/BaseTool";

const template = `{question}`;

const completePrompt = async (prompt: string) =>
	await fetch("http://localhost:11434/api/generate", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: "llama2",
			prompt,
		}),
	});

const withBasePrompt = (prompt: string, tools: BaseTool[]) => {
	return `Answer the following questions as best you can. You have access to the following tools:

    ${tools.map((tool) => {
		`${tool.name}: ${tool.description}`;
	})}
    
    Use the following format:
    
    Question: the input question you must answer
    Thought: you should always think about what to do
    Action: the action to take, should be one of [${tools
		.map((tool) => tool.name)
		.join(", ")}]
    Action Input: the input to the action
    Observation: the result of the action
    ... (this Thought/Action/Action Input/Observation can repeat N times)
    Thought: I now know the final answer
    Final Answer: the final answer to the original input question
	
	----
	
	${prompt}`;
};

export const streamLLM = async (
	prompt: string
): Promise<AsyncIterable<Uint8Array>> => {
	const response = await completePrompt(prompt);

	const reader = response.body as unknown as AsyncIterable<Uint8Array>;

	return reader;
};

const streamToText = async (stream: AsyncIterable<Uint8Array>) => {
	let result = "";
	const decoder = new TextDecoder("utf-8");
	for await (const chunk of stream) {
		const { response } = JSON.parse(
			decoder.decode(chunk, { stream: true })
		);
		result += response;
	}

	return result;
};

const responseToOutput = <T>(response: string): T => {
	const santiziedInput = response.split("\n").join("");

	const outputLineMatch = santiziedInput.match(
		/(?:Output|Final Answer|OpenAPI Output):(.+)/
	);

	if (outputLineMatch && outputLineMatch[1]) {
		try {
			let trimmedResult = outputLineMatch[1].trim();

			trimmedResult = trimmedResult.substring(
				trimmedResult.indexOf("{") - 1,
				trimmedResult.lastIndexOf("}") + 1
			);

			const outputObject = JSON.parse(trimmedResult);
			return outputObject;
		} catch (error) {
			throw new Error(
				'Error parsing JSON in the "Output" line.: ' + error
			);
		}
	} else {
		throw new Error('No valid "Output" line found in the input string.');
	}
};

export interface OpenAPIResponse {
	serverUrl: string;
	path: string;
	requestMethod: string;
}

export const OpenAPI = async ({ prompt }: { prompt: string }) => {
	const open_api_document = await fetch(
		"http://localhost:5012/swagger/v1/swagger.json"
	).then((res) => res.text());

	const promptPrefix = `Answer the following questions as best you can. You have access to the following tools:

    open_api: useful for providing an OpenAPI v3 specification document in JSON format. This document defines the API you are interacting with.
    
    Use the following format:
    
    Question: the input question you must answer
    Thought: you should always think about what to do
    Action: the action to take, should be one of [open_api]
    Action Input: the input to the action
    Observation: the result of the action
    ... (this Thought/Action/Action Input/Observation can repeat N times)
    Thought: I now know the final answer
    Final Answer: the final answer to the original input question

    -----

    You are a developer working with an OpenAPI specification JSON document. Your goal is to extract the server URL from the document in order to make HTTP requests. 
    The OpenAPI specification includes information about the API endpoints, methods, and the server where the API is hosted.
    Use the information provided in the OpenAPI specification JSON document to extract the server URL. Your input to any tool or method should be in the form of JSON pointer syntax (e.g., /servers/0/url).
    Ensure that you only use the URL contained in the JSON document; do not make up a URL. If the document contains multiple servers, choose the appropriate one based on the context of your task.
    If the server URL is nested within other structures, navigate through the JSON using the appropriate keys or paths until you reach the server URL.
    Once you have successfully extracted the server URL, it should be used to construct HTTP requests.
    Note: Assume that the OpenAPI specification follows the standard format, and the server URL is explicitly specified within the document.

    -----

    You are an agent designed to interact with JSON.
    Your goal is to return a final answer by interacting with the JSON.
    Do not make up any information that is not contained in the JSON.
    Interacting with the JSON should be in the form of json pointer syntax (e.g., /key1/0/key2).
    You should only use keys that you know for a fact exist. Validate that a key exists by seeing it previously.
    If you have not seen a key in one of those responses, you cannot use it.
    You should only add one key at a time to the path. You cannot add multiple keys at once.
    If you encounter a null or undefined value, go back to the previous key, look at the available keys, and try again.
    If the question does not seem to be related to the JSON, just return "I don't know" as the answer.
    Always begin your interaction using an empty string as the input to see what keys exist in the JSON.
    Note: After obtaining a key, use the output as the input for the same model in a loop until you encounter a previously seen value. In each iteration, add the obtained key to the path and continue the process until you reach a conclusive result.

    -----

    The final answer should be prefixed with "OpenAPI Output:" and should be output as a JSON structure containing the server URL, path and request method. Do not respond with any other answer, if it cannot be determined reply with "I don't know.".
    Please make sure that the generated output does not contain any Markdown syntax. If necessary, rephrase or simplify the response to avoid such characters. If the model provides a response with Markdown-like elements, ask it to revise accordingly.
    Note: Markdown syntax includes characters such as '*', '_', '#', and backticks.
    
    Begin!

    OpenAPI JSON Document: ${open_api_document}
    
    Thought: I must find a server URL in order to make HTTP requests. I will use the OpenAPI JSON document to find the server URL.
    Thought: Once I find the server URL value, I should look for a path that matches the question so that I can make a HTTP request.
    Thought: Once I have the server URL and path, this is my final answer. The final answer should be output as a JSON structure containing the server URL, path and request method.
    Question: ${prompt}`;

	const interactionResult = await streamToText(await streamLLM(promptPrefix));

	const serverDetails = responseToOutput<OpenAPIResponse>(interactionResult);

	const response = await makeRequest(serverDetails);

	let lastPrompt = `You are an agent designed to interact with JSON.
    
    Use the JSON data provided below and summarize the results in a simple sentence based on the user's input.
    The summary should use take into account the dates provided along with the summary for each date.
    In the output do not reference the JSON data directly, instead word it in context of the user's original question.

    JSON data:
    ${JSON.stringify(response)}

    Question: ${prompt}`;

	//console.log("PROMPT: ", lastPrompt);

	return await streamLLM(lastPrompt);
};

const makeRequest = async (requestInfo: OpenAPIResponse) => {
	const { serverUrl, path, requestMethod } = requestInfo;

	const response = await fetch(new URL(`${serverUrl}${path}`), {
		method: requestMethod,
	}).then((r) => r.json());

	return response;
};
