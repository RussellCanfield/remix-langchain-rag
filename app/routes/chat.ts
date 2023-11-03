import { LoaderFunctionArgs } from "@remix-run/node";
import { buildRAG, promptLLM } from "~/utils/rag.server";
import { singleton } from "~/utils/singleton.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const prompt = url.searchParams.get("prompt");

	if (!prompt) return null;

	//Naive attempt to "cache" the RAG model
	//This is an in-memory cache, in the real world you want a Vector DB.
	const getRag = singleton("rag", () => buildRAG());
	const llm = await getRag;

	const stream = await promptLLM(prompt, llm);

	//Returning the response directly to Remix throws an error
	//It appears to be a bug with langchain and how it handles cancelling the stream
	const readableStream = new ReadableStream({
		start(controller) {
			const reader = stream.getReader();

			const readStream = async () => {
				const { done, value } = await reader!.read();

				if (done) {
					controller.close();
					return;
				}

				controller.enqueue(value);
				readStream();
			};

			readStream();
		},
	});

	return new Response(readableStream);
}
