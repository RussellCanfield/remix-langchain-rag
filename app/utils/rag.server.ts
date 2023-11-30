import { YoutubeLoader } from "langchain/document_loaders/web/youtube";
import { PlaywrightWebBaseLoader } from "langchain/document_loaders/web/playwright";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import {
	ChatPromptTemplate,
	HumanMessagePromptTemplate,
	SystemMessagePromptTemplate,
} from "langchain/prompts";
import {
	RunnablePassthrough,
	RunnableSequence,
} from "langchain/schema/runnable";
import { StringOutputParser } from "langchain/schema/output_parser";
import { formatDocumentsAsString } from "langchain/util/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import {
	OpenApiToolkit,
	createOpenApiAgent,
	initializeAgentExecutorWithOptions,
} from "langchain/agents";
import { JsonSpec } from "langchain/tools";
import { BaseLanguageModel } from "langchain/base_language";
import { APIChain, LLMChain, SimpleSequentialChain } from "langchain/chains";
import { OutputFixingParser } from "langchain/output_parsers";
import { ChatOllama } from "langchain/chat_models/ollama";
import { Ollama } from "langchain/llms/ollama";
import { OpenApiLlama } from "./tools/OpenApiLlama";

//Various youtube sources to use transcripts as context.
// const youtubeVideoSources = [
// 	"https://www.youtube.com/watch?v=bXfK873ASzY&ab_channel=RussellCanfield",
// 	"https://www.youtube.com/watch?v=w58aZjACETQ&ab_channel=JackHerrington",
// 	"https://www.youtube.com/watch?v=D3XYAx30CNc&ab_channel=JackHerrington",
// 	"https://www.youtube.com/watch?v=x22F4hSdZJM&ab_channel=JackHerrington",
// 	"https://www.youtube.com/watch?v=2eGXIbc6lZA&ab_channel=ZackJackson",
// 	"https://www.youtube.com/watch?v=AU7dKWNfWiA&ab_channel=JackHerrington",
// 	"https://www.youtube.com/watch?v=-ei6RqZilYI&ab_channel=Pusher",
// ];

// //Various web sources to use as context.
// const webSources = [
// 	"https://medium.com/swlh/webpack-5-module-federation-a-game-changer-to-javascript-architecture-bcdd30e02669",
// ];

// const youtubeLoaders = youtubeVideoSources.map((videoURL) =>
// 	YoutubeLoader.createFromUrl(videoURL, {
// 		language: "en",
// 		addVideoInfo: true,
// 	}).load()
// );

// const webLoaders = webSources.map((url) =>
// 	new PlaywrightWebBaseLoader(url).load()
// );

export const buildRAG = async () => {
	// const loaders = await Promise.all([...youtubeLoaders, ...webLoaders]);

	// const docs = loaders.map((l) => l[0]);

	// docs.push(
	// 	new Document({
	// 		pageContent: `The following URL: \n
	// 			- https://www.youtube.com/watch?v=bXfK873ASzY&ab_channel=RussellCanfield
	// 			is a youtube video showing how to use Module Federation along with examples on what it can do.`,
	// 		metadata: {
	// 			source: "https://www.youtube.com/watch?v=bXfK873ASzY&ab_channel=RussellCanfield",
	// 		},
	// 	})
	// );

	// const model = new ChatOpenAI({
	// 	streaming: true,
	// 	modelName: "gpt-4-1106-preview",
	// });

	const model = new ChatOllama({
		baseUrl: "http://localhost:11434",
		model: "llama2",
	});

	// const textSplitter = new RecursiveCharacterTextSplitter({
	// 	chunkSize: 2000,
	// 	chunkOverlap: 0,
	// });
	// const splitDocs = await textSplitter.splitDocuments(docs);

	// const vectorStore = await HNSWLib.fromDocuments(
	// 	splitDocs,
	// 	new OpenAIEmbeddings()
	// );
	// const vectorStoreRetriever = vectorStore.asRetriever();

	// const SYSTEM_TEMPLATE = ``;
	// const messages = [
	// 	SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
	// 	HumanMessagePromptTemplate.fromTemplate("{question} "),
	// ];
	const prompt = ChatPromptTemplate.fromTemplate(`
	[INST]<<SYS>>Use the following pieces of context to answer the question at the end.
	If you don't know the answer, just say that you don't know, don't try to make up an answer.

	Use the Weather Forecast API to answer the following questions, ignore the location and date for now.
	Retrieving weather forecast information can be done by making a GET request to the /WeatherForecast endpoint.
	The OpenAPI JSON document provided by the tool 'json_explorer' contains the server url.
	Once you discover the endpoint and understand its inputs, you can make a web request to this endpoint.
	The return value with be a JSON value, just return this value to the user as JSON data.
	<</SYS>>

	{input}
	[/INST]`);

	const chain = RunnableSequence.from([
		{
			// context: vectorStoreRetriever.pipe(formatDocumentsAsString),
			//
			question: async (input) => {
				const agent = await loadExternalApi(model);

				// const parser = OutputFixingParser.fromLLM(
				// 	model,
				// 	new StringOutputParser()
				// );

				// model.pipe(parser);

				// console.log(input);
				const result = await agent.invoke({
					input,
				});
				console.log("HERE: ", result);
				return result.output;
			},
			//question: new RunnablePassthrough(),
		},
		prompt,
		model,
		new StringOutputParser(),
	]);

	//const test = await loadExternalApi(model);
	//test.verbose = true;

	return chain;
};

const loadExternalApi = async (model: BaseLanguageModel) => {
	const swaggerDoc = await fetch(
		"http://localhost:5012/swagger/v1/swagger.json"
	).then((res) => res.json());

	const toolkit = new OpenApiLlama(new JsonSpec(swaggerDoc), model, {
		"Content-Type": "application/json",
	});

	// const parser = OutputFixingParser.fromLLM(model, new StringOutputParser());
	// model.pipe(parser);

	// return await initializeAgentExecutorWithOptions(toolkit.tools, model, {
	// 	agentType: 'chat-conversational-react-description',
	// });

	return createOpenApiAgent(model, toolkit);
};

export const promptLLM = async (prompt: string, chain: any) => {
	return chain.invoke({
		input: prompt,
	});
};
