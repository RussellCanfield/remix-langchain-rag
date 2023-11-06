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

//Various youtube sources to use transcripts as context.
const youtubeVideoSources = [
	"https://www.youtube.com/watch?v=bXfK873ASzY&ab_channel=RussellCanfield",
	"https://www.youtube.com/watch?v=w58aZjACETQ&ab_channel=JackHerrington",
	"https://www.youtube.com/watch?v=D3XYAx30CNc&ab_channel=JackHerrington",
	"https://www.youtube.com/watch?v=x22F4hSdZJM&ab_channel=JackHerrington",
	"https://www.youtube.com/watch?v=2eGXIbc6lZA&ab_channel=ZackJackson",
	"https://www.youtube.com/watch?v=AU7dKWNfWiA&ab_channel=JackHerrington",
	"https://www.youtube.com/watch?v=-ei6RqZilYI&ab_channel=Pusher",
];

//Various web sources to use as context.
const webSources = [
	"https://medium.com/swlh/webpack-5-module-federation-a-game-changer-to-javascript-architecture-bcdd30e02669",
];

const youtubeLoaders = youtubeVideoSources.map((videoURL) =>
	YoutubeLoader.createFromUrl(videoURL, {
		language: "en",
		addVideoInfo: true,
	}).load()
);

const webLoaders = webSources.map((url) =>
	new PlaywrightWebBaseLoader(url).load()
);

export const buildRAG = async () => {
	const loaders = await Promise.all([...youtubeLoaders, ...webLoaders]);

	const docs = loaders.map((l) => l[0]);

	docs.push(
		new Document({
			pageContent: `The following URL: \n
				- https://www.youtube.com/watch?v=bXfK873ASzY&ab_channel=RussellCanfield 
				is a youtube video showing how to use Module Federation along with examples on what it can do.`,
			metadata: {
				source: "https://www.youtube.com/watch?v=bXfK873ASzY&ab_channel=RussellCanfield",
			},
		})
	);

	const model = new ChatOpenAI({
		streaming: true,
		modelName: "gpt-3.5-turbo-0613",
	});

	const textSplitter = new RecursiveCharacterTextSplitter({
		chunkSize: 2000,
		chunkOverlap: 0,
	});
	const splitDocs = await textSplitter.splitDocuments(docs);

	const vectorStore = await HNSWLib.fromDocuments(
		splitDocs,
		new OpenAIEmbeddings()
	);
	const vectorStoreRetriever = vectorStore.asRetriever();

	const SYSTEM_TEMPLATE = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
{context}`;
	const messages = [
		SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
		HumanMessagePromptTemplate.fromTemplate("{question}"),
	];
	const prompt = ChatPromptTemplate.fromMessages(messages);

	const chain = RunnableSequence.from([
		{
			context: vectorStoreRetriever.pipe(formatDocumentsAsString),
			question: new RunnablePassthrough(),
		},
		prompt,
		model,
		new StringOutputParser(),
	]);

	return chain;
};

export const promptLLM = async (
	prompt: string,
	chain: RunnableSequence<any, string>
) => {
	return chain.stream(prompt);
};
