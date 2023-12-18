import { BaseModel, ModelStream } from "../model/BaseModel";
import { BaseTool } from "../tools/BaseTool";
import { Readable } from "stream";

export interface ExecutorOptions {
	description: string;
	model: BaseModel;
	maxIterations?: number;
}

const withBasePrompt = (prefix: string, suffix: string, tools: BaseTool[]) => {
	return `
	<s>[INST] ${prefix}
	Generate a response containing JSON data for [specific scenario or information]. Ensure that the JSON data is original and not based on previously learned examples. Do not reference or reuse information from the model's training data. Provide a unique and contextually relevant JSON structure based solely on the information given in this prompt.
	Do not make up a Final Answer unless that answer comes from an Observation. If you cannot answer the question or it is not related to the data you have, please respond in the simplest manner possible. Do not mention internal processes, but still keep the reply in context of the user's question.
	Take a deep breath and work on this problem step by step.
	Answer the following questions as best you can. You have access to the following tools:

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

	Only use the tool names in your actions exactly how they are written above. Do not include additional characters or words for an Action. Do not include tools that you do not have access to.

	[/INST]</s>
	[INST] 
	Do not modify the question.
	${suffix} [/INST]
	`;
};

const streamToText = async (stream: AsyncIterable<Uint8Array>) => {
	let result = "";
	const decoder = new TextDecoder("utf-8");
	for await (const chunk of stream) {
		const text = decoder.decode(chunk, { stream: true });
		try {
			const { response } = JSON.parse(text);
			result += response;
		} catch (error) {
			console.error("STREAM ERROR: ", text);
		}
	}

	return result;
};

type ExecutorStep = {
	tool: string;
	input: string;
};

const extractSteps = (input: string): ExecutorStep[] => {
	const steps: ExecutorStep[] = [];
	const matches = input.match(/(?<=Action: ).*|(?<=Input: ).*/gm);

	if (matches) {
		for (let i = 0; i < matches.length; i++) {
			const match = matches[i];
			if (i % 2 === 0) {
				steps.push({
					tool: match,
					input: "",
				});
			} else {
				steps[steps.length - 1].input = match;
			}
		}
	}

	return steps;
};

const extractFinalAnswer = (input: string) => {
	const regex = /(?<=Final Answer: ).*/gm;

	const match = input.match(regex);

	if (!match) {
		return undefined;
	}

	const actionInput = match[0] || "";

	return String(actionInput.replace(/[\n'`\[\INST\]/]/g, "")).trimEnd();
};

function getStream(str: string): ModelStream {
	const response = {
		response: str,
		done: true,
	};

	const stream = new Readable({
		read() {
			this.push(JSON.stringify(response));
			this.push(null);
		},
	});

	return stream as unknown as ModelStream;
}

export class Executor {
	tools: BaseTool[];
	options: ExecutorOptions;
	toolMap: Map<string, BaseTool>;
	steps: Set<string> = new Set();

	constructor(tools: BaseTool[], options: ExecutorOptions) {
		this.tools = tools;
		this.options = options;

		this.toolMap = new Map<string, BaseTool>(
			tools.map((tool) => [tool.name, tool])
		);
	}

	async processStep(prompt: string, tool: BaseTool, input: string) {
		const toolResult = await tool.execute(input);

		if (toolResult) {
			return `[INST] Observation: ${toolResult} [/INST]\n`;
		}

		return null;
	}

	async execute(question: string): Promise<ModelStream> {
		const { model, maxIterations } = this.options;

		const basePrompt = withBasePrompt(
			this.options.description,
			`Begin!

			Question: ${question}`,
			this.tools
		);

		let prompt = basePrompt;
		let iterator = 0;
		let toolIndex = 0;

		try {
			while (iterator < maxIterations!) {
				const response = await streamToText(
					await model.getStream(prompt)
				);

				prompt += `[INST] ${response} [/INST]\n`;

				const steps = extractSteps(response);

				console.log(response);
				console.log(steps);

				if (
					!steps ||
					steps.length === 0 ||
					toolIndex === steps.length
				) {
					console.log("DONE: ", prompt);
					const finalAnswer = extractFinalAnswer(response);

					if (finalAnswer) {
						return getStream(finalAnswer);
					}

					throw new Error("No steps found");
				}

				const firstStep = steps[toolIndex];

				if (!firstStep) {
					console.log("DONE: ", prompt);
					const finalAnswer = extractFinalAnswer(response);

					if (finalAnswer) {
						return getStream(finalAnswer);
					}

					throw new Error("No steps found");
				}

				const toolInstance = this.toolMap.get(firstStep.tool);

				if (!toolInstance) {
					throw new Error(`Tool not found: ${firstStep.tool}`);
				}

				const toolResponse = await this.processStep(
					prompt,
					toolInstance,
					firstStep.input
				);

				toolIndex++;

				console.log(toolResponse);

				prompt += toolResponse;

				iterator++;
			}
		} catch (error) {
			console.error(error);
			return getStream(
				"Sorry, I am not able to answer the question at this time."
			);
		}

		return getStream(
			"Sorry, I am not able to answer the question at this time."
		);
	}
}
