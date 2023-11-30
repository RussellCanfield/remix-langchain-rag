import {
	AgentExecutor,
	JsonToolkit,
	OpenApiToolkit,
	ZeroShotAgent,
	ZeroShotCreatePromptArgs,
} from "langchain/agents";
import { BaseLanguageModel } from "langchain/base_language";
import { LLMChain } from "langchain/chains";
import { DynamicTool, Json, JsonListKeysTool, JsonSpec } from "langchain/tools";
import jsonpointer from "jsonpointer";

export const JSON_EXPLORER_DESCRIPTION = `You are an agent designed to answer questions by making web requests to an API given the OpenAPI spec.

If the question does not seem related to the API, return I don't know. Do not make up an answer.
Only use information provided by the tools to construct your response.

To find information in the OpenAPI spec, use the 'json_explorer' tool. The input to this tool is a question about the API.

Take the following steps:
1. Retrieve Server URL:
2. Start by loading the OpenAPI specification JSON document.
3. Identify the "server" key within the JSON.
4. Extract the URL associated with the server.

Handle Errors Gracefully by implementing error-handling mechanisms to manage potential issues like missing keys or unexpected JSON structures.
Test the prompt with various OpenAPI documents.
Iterate and refine the prompt based on any encountered issues or improvements identified during testing.
Use the exact parameter names as listed in the spec, do not make up any names or abbreviate the names of parameters.
If you get a not found error, ensure that you are using a path that actually exists in the spec.`;

export const JSON_PREFIX = `You are an agent designed to interact with JSON.
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
Always begin your interaction with the 'json_list_keys' with an initial value of '' as the input to see what keys exist in the JSON.

Note that sometimes the value at a given path is large. In this case, you will get an error "Value is a large dictionary, should explore its keys directly".
In this case, you should ALWAYS follow up by using the 'json_list_keys' tool to see what keys exist at that path.
Do not simply refer the user to the JSON or a section of the JSON, as this is not a valid answer. Keep digging until you find the answer and explicitly return it.

Explore Paths:
Navigate to the "paths" key in the JSON.
For each endpoint under "paths":
	Identify the HTTP method (GET or POST).
	Extract the endpoint URL.

Gather Request Inputs:
For each endpoint:
	If it's a GET request:
		Look for any query parameters.
	If it's a POST request:
		Examine the POST body structure and retrieve necessary input parameters.

Compile Information:
Organize the extracted data into a structured format or data structure.
Include:
	Server URL
	Endpoint URLs with associated HTTP methods.
	Request inputs for each endpoint.
	
`;

export const JSON_SUFFIX = `Begin!

Question: {input}
Thought: Always begin your very first interaction with the 'json_list_keys' with an empty string as the input to see what keys exist in the JSON.
{agent_scratchpad}`;

export interface Headers {
	[key: string]: string;
}

export function createJsonAgent(
	llm: BaseLanguageModel,
	toolkit: JsonToolkit,
	args?: ZeroShotCreatePromptArgs
) {
	const {
		prefix = JSON_PREFIX,
		suffix = JSON_SUFFIX,
		inputVariables = ["input", "agent_scratchpad"],
	} = args ?? {};
	const { tools } = toolkit;
	const prompt = ZeroShotAgent.createPrompt(tools, {
		prefix,
		suffix,
		inputVariables,
	});
	const chain = new LLMChain({ prompt, llm });
	const agent = new ZeroShotAgent({
		llmChain: chain,
		allowedTools: tools.map((t) => t.name),
	});
	return AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: true,
	});
}

export class OpenApiLlama extends OpenApiToolkit {
	constructor(jsonSpec: JsonSpec, llm: BaseLanguageModel, headers?: Headers) {
		super(jsonSpec, llm, headers);
		const jsonAgent = createJsonAgent(llm, new JsonToolkit(jsonSpec));
		jsonAgent.verbose = true;

		const jsonAgentTools = jsonAgent.tools.filter(
			(t) => t.name !== "json_list_keys"
		);
		jsonAgent.tools = [
			...jsonAgentTools,
			new JsonListKeysLlamaTool(jsonSpec),
		];

		this.tools = [
			...this.tools.filter((t) => t.name !== "json_explorer"),
			new DynamicTool({
				name: "json_explorer",
				func: async (input: string) => {
					const pointer = jsonpointer.compile("/components");
					const res = pointer.get(jsonSpec.obj) as Json;

					console.log("RES: ", res);

					//@ts-ignore
					const data = Object.keys(res).join(", ");

					console.log("RES DATA: ", data);

					const result = await jsonAgent.call({
						input: input === "None" ? "" : input,
					});

					console.log("OPEN API LLAMA RESULT: ", result);
					return result.toString();
				},
				description: JSON_EXPLORER_DESCRIPTION,
			}),
		];
	}
}

export class JsonListKeysLlamaTool extends JsonListKeysTool {
	constructor(jsonSpec: JsonSpec) {
		super(jsonSpec);
	}
	override async _call(input: string) {
		const sanitizedInput = input
			.replace("None", "")
			.replace("empty string", "");

		console.log("JSON LIST KEYS LLAMA INPUT: ", sanitizedInput);

		const res = this.jsonSpec.getKeys(sanitizedInput);

		console.log("JSON LIST KEYS LLAMA RESULT: ", res);

		return res;
	}
}
