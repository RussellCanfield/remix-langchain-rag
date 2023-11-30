import { BaseTool, BaseToolOptions } from "./BaseTool";

const basePrompt = `You are an agent designed to interact with JSON.
Your goal is to return a final answer by interacting with the JSON.
You have access to the following tools which help you learn more about the JSON you are interacting with.
Only use the below tools. Only use the information returned by the below tools to construct your final answer.
Do not make up any information that is not contained in the JSON.
Your input to the tools should be in the form of in json pointer syntax (e.g. /key1/0/key2).
You must escape a slash in a key with a ~1, and escape a tilde with a ~0.
For example, to access the key /foo, you would use /~1foo
You should only use keys that you know for a fact exist. You must validate that a key exists by seeing it previously when calling 'json_list_keys'.
If you have not seen a key in one of those responses, you cannot use it.
You should only add one key at a time to the path. You cannot add multiple keys at once.
If you encounter a null or undefined value, go back to the previous key, look at the available keys, and try again.

If the question does not seem to be related to the JSON, just return "I don't know" as the answer.
Always begin your interaction with the 'json_list_keys' with an empty string as the input to see what keys exist in the JSON.

Note that sometimes the value at a given path is large. In this case, you will get an error "Value is a large dictionary, should explore its keys directly".
In this case, you should ALWAYS follow up by using the 'json_list_keys' tool to see what keys exist at that path.
Do not simply refer the user to the JSON or a section of the JSON, as this is not a valid answer. Keep digging until you find the answer and explicitly return it.`;

export class JsonParserTool extends BaseTool {
	constructor(jsonDoc: string) {
		super(
			"json_parser",
			`Always use this tool to parse OpenAPI spec documents and extract the relevant information.
			If you need additional context from the user, ask for it.
			Do not simply refer the user to the JSON or a section of the JSON, as this is not a valid answer.
			
			Example inputs to this tool: 
				'What are the required query parameters for a GET request to the /bar endpoint?'
				'What are the required parameters in the request body for a POST request to the /foo endpoint?'

			Here is the OpenAPI spec JSON document you will be working with:
			${jsonDoc}

			-----
			
			The output of this tool will be a URL string to make HTTP requests.
			`,
			{
				promptTemplate: basePrompt,
			}
		);
	}

	async execute(input: string): Promise<string> {
		return Promise.resolve("");
	}
}
