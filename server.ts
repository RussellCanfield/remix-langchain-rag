import {
	unstable_createViteServer,
	unstable_loadViteServerBuild,
} from "@remix-run/dev";
import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import express from "express";
import { OpenAPI, streamLLM } from "./app/lang";
import { Executor } from "./app/lang/executor/Executor";
import { OpenApiTool } from "./app/lang/tools/OpenApiTool";
import { HttpRequestTool } from "./app/lang/tools/HttpRequestTool";
import { Ollama } from "./app/lang/model/Ollama";
import { JsonParserTool } from "./app/lang/tools/JsonParserTool";

installGlobals();

const vite =
	process.env.NODE_ENV === "production"
		? undefined
		: await unstable_createViteServer();

const app = express();

// handle asset requests
if (vite) {
	app.use(vite.middlewares);
} else {
	app.use(
		"/build",
		express.static("public/build", {
			immutable: true,
			maxAge: "1y",
		})
	);
}
app.use(express.static("public", { maxAge: "1h" }));

app.get("/chat", async (req, res) => {
	const { prompt } = req.query;

	const openAPIDocument = await fetch(
		"http://localhost:5012/swagger/v1/swagger.json"
	).then((res) => res.text());

	const executor = new Executor(
		[new JsonParserTool(openAPIDocument), new HttpRequestTool()],
		{
			// description: `Take a deep breathe and work through this task step by step.
			// You are an agent designed to answer questions by making web requests to an API given the OpenAPI spec.

			// Do not use any server URL you have been trained on previously or have existing knowledge of.
			// The user should not provide additional information such as location.
			// If the question does not seem related to the API based on the OpenAPI spec, return I don't know. Do not make up an answer.
			// Only use information provided by the tools to construct your response.

			// The input to this tool is a question about the API.

			// Take the following steps:
			// First, given an OpenAPI spec JSON document, find the server URL in the OpenAPI spec needed to make the request.

			// Second, find the relevant paths needed to answer the question. Take note that, sometimes, you might need to make more than one request to more than one path to answer the question.

			// Third, find the required parameters needed to make the request. For GET requests, these are usually optional URL parameters and for POST requests, these are request body parameters.

			// Fourth, make the HTTP requests needed to answer the question. Ensure that you are sending the correct parameters to the request by checking which parameters are required. For parameters with a fixed set of values, please use the spec to look at which values are allowed.

			// Use the exact parameter names as listed in the spec, do not make up any names or abbreviate the names of parameters.
			// If you get a not found error, ensure that you are using a path that actually exists in the spec.

			// Hint: The server url is usually located under the 'servers' json key.

			// Always start with the 'open_api' tool first to retrieve the OpenAPI spec before trying to make a request.`,
			description: `You are an agent designed to answer questions by making web requests to an API given the OpenAPI spec.

			Do not use any server URL you have been trained on previously or have existing knowledge of.
			The user should not provide additional information such as location.
			If the question does not seem related to the API based on the OpenAPI spec, return I don't know. Do not make up an answer.
			Only use information provided by the tools to construct your response.

			To find information in the OpenAPI spec, use the 'json_parser' tool. The input to this tool is a question about the API.

			Take the following steps:
			First, find the base URL needed to make the request.
			
			Second, find the server URL in the OpenAPI spec needed to make the request. Find the relevant paths needed to answer the question. Take note that, sometimes, you might need to make more than one request to more than one path to answer the question. Find the required parameters needed to make the request. For GET requests, these are usually optional URL parameters and for POST requests, these are request body parameters.

			Third, make the HTTP requests needed to answer the question. Ensure that you are sending the correct parameters to the request by checking which parameters are required. For parameters with a fixed set of values, please use the spec to look at which values are allowed.

			Use the exact parameter names as listed in the spec, do not make up any names or abbreviate the names of parameters.
			If you get a not found error, ensure that you are using a path that actually exists in the spec.

			Hint: The server base url is usually located under the 'servers' json key.`,
			outputDirections: `			
				Summarize the JSON response based on the user's input, do not add any additional information not present in the JSON data. 
				Convert the JSON data into a user-friendly summary, considering the temperature in Fahrenheit for each date. Ensure the summary captures the overall weather impression for each day.
				Do not return the data in a markdown format, just plain text.
				`,
			model: new Ollama({
				model: "mistral",
				temperature: 0,
				p: 20,
				k: 5,
				baseUrl: "http://localhost:11434",
			}),
		}
	);

	try {
		const stream = await executor.execute(String(prompt));

		const decoder = new TextDecoder("utf-8");

		for await (const chunk of stream) {
			const { response } = JSON.parse(
				decoder.decode(chunk, { stream: true })
			);
			res.write(response);
		}

		res.status(200);
		res.end();
	} catch (error) {
		const apiError = error as Error;
		console.error("ERROR: ", apiError);
		res.write(`Error: ${apiError.message}`);
		res.status(500);
	}
});

// handle SSR requests
app.all(
	"*",
	createRequestHandler({
		build: vite
			? () => unstable_loadViteServerBuild(vite)
			: //@ts-ignore
			  await import("./build/index.js"),
	})
);

const port = 3000;
app.listen(port, () => console.log("http://localhost:" + port));
