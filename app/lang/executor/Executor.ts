import { BaseModel, ModelStream } from "../model/BaseModel";
import { BaseTool } from "../tools/BaseTool";
import { Readable } from "stream";

export interface ExecutorOptions {
	description: string;
	outputDirections: string;
	model: BaseModel;
	maxIterations?: number;
}

const withBasePrompt = (
	prompt: string,
	description: string,
	tools: BaseTool[]
) => {
	return `
	<s>[INST] Take a deep breathe and work through this task step by step. Answer the following questions as best you can. You have access to the following tools:

	${tools.map((tool) => `${tool.name}: ${tool.description}`).join("\n")}

	Use the following format in your response:

	Question: the input question you must answer
	Thought: you should always think about what to do
	Action: the action to take, should be one of [${tools.map((tool) => tool.name)}]
	Action Input: the input to the action (e.g. tool input)
	Observation: the result of the action
	... (this Thought/Action/Action Input/Observation can repeat N times)
	Thought: I now know the final answer
	Final Answer: the final answer to the original input question

	Only use the tool names in your actions exactly how they are written above. Do not include additional characters.

	${description}

	Begin!

	Question: ${prompt} 
	Thought: I should explore the spec to find the base url for the API.
	[/INST]</s>
	`;
	// return `<s>[INST]
	// Take a deep breath and work on this problem step-by-step.
	// Your task is to answer the given question using the available tools.
	// If you cannot answer the question or it is not related to the data you have, please respond in the simplest manner possible. Do not mention internal processes, but still keep the reply in context of the user's question.
	// You have the following tools available to you:

	// ${tools.map((tool) => `${tool.name}: ${tool.description}`).join("\n")}

	// Follow the format below:

	// - Question: The input question you must answer
	// - Thought: Your thought process
	// - Action: The action to take, should be one of the available tools: ${tools
	// 	.map((tool) => tool.name)
	// 	.join(", ")} - use the tool name provided exactly.
	// - Action Input: The input to the action
	// - Observation: The result of the action
	// - Repeat the Thought/Action/Action Input/Observation sequence as needed
	// - Thought: Your final thoughts
	// - Final Answer: The final answer to the original input question

	// When thinking of an action, use the tool name exactly as it appears above. Do not include other words.
	// Do not make up a response.

	// ----

	// ${description}

	// [/INST]</s>

	// Begin!

	// [INST]
	// Question: ${prompt}
	// Thought: The server endpoint is in the OpenApi JSON document.
	// [/INST]</s>
	// `;
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

const extractToolFromAnswer = (input: string, tools: BaseTool[]) => {
	let tool: string | undefined;

	const sanitizedInput = input.replace(/[\n'`\\]/g, "");

	for (const toolInstance of tools) {
		if (sanitizedInput.includes(toolInstance.name)) {
			tool = toolInstance.name;
			break;
		}
	}

	console.log("TOOL MATCH: ", tool);

	return tool;
};

const extractActionInput = (input: string) => {
	const regex = /(?<=Action Input: ).*/;

	const match = input.match(regex);

	if (!match) {
		return undefined;
	}

	const actionInput = match[0] || "";

	console.log("ACTION INPUT MATCH: ", actionInput);

	return String(actionInput.replace(/[\n'`]/g, ""));
};

const extractFinalAnswer = (input: string) => {
	const regex = /(?<=Action Input: ).*/;

	const match = input.match(regex);

	if (!match) {
		return undefined;
	}

	console.log("RAW INPUT MATCH: ", match);

	const actionInput = match[0] || "";

	console.log("ACTION INPUT MATCH: ", actionInput);

	return String(actionInput.replace(/[\n'`]/g, ""));
};

export class Executor {
	tools: BaseTool[];
	options: ExecutorOptions;
	toolMap: Map<string, BaseTool>;
	maxIterations: number;

	constructor(tools: BaseTool[], options: ExecutorOptions) {
		this.tools = tools;
		this.options = options;
		this.maxIterations = options.maxIterations ?? 10;

		this.toolMap = new Map<string, BaseTool>(
			tools.map((tool) => [tool.name, tool])
		);
	}

	async execute(question: string): Promise<ModelStream> {
		const { model } = this.options;
		const basePrompt = withBasePrompt(
			question,
			this.options.description,
			this.tools
		);

		let prompt = basePrompt;

		for (let i = 0; i < this.maxIterations; i++) {
			console.log("ITERATION: ", i);

			const response = await streamToText(await model.getStream(prompt));

			// prompt = prompt + `[INST] ${response} [/INST]</s>\n`;

			console.log("RESPONSE: ", response);

			const tool = extractToolFromAnswer(response, this.tools);

			const toolInstance = this.toolMap.get(tool ?? "");

			if (!toolInstance) {
				console.log("DONE: ", prompt);
				return await model.getStream(
					prompt +
						`[INST] ${this.options.outputDirections} [/INST]</s>\n`
				);
			}

			const toolInput = extractActionInput(response);

			let toolResult = null;

			try {
				toolResult = await toolInstance.execute(toolInput);
			} catch (error) {
				console.log("TOOL ERROR: ", error);
				return await model.getStream(
					`You are a helpful assistant! Unfortunately, I was unable to find the answer to your question.`
				);
			}

			console.log("TOOL RESULT: ", toolResult);

			if (toolResult) {
				prompt += `Observation: ${toolResult}\n`;
			}

			//console.log("PROMPT: ", prompt);
		}

		return Readable.from([
			"Sorry I am unable to answer your question at this time.",
		]) as unknown as ModelStream;
	}
}
