import { BaseModel, ModelStream } from "../model/BaseModel";
import { BaseTool } from "../tools/BaseTool";
import { DateTool } from "../tools/DateTool";
import { HttpRequestTool } from "../tools/HttpRequestTool";
import { Executor, ExecutorOptions } from "./Executor";

export const createOpenApiExecutor = async (
	openApiDocumentUrl: string,
	model: BaseModel
) => {
	let openApiDocument: string | undefined;

	try {
		openApiDocument = await fetch(openApiDocumentUrl).then((res) =>
			res.text()
		);
	} catch (error) {
		openApiDocument =
			"Unable to fetch OpenAPI document. Please reply to the user that you cannot answer their question at this time.";
	}

	const openApiExecutor = new OpenApiExecutor(
		[new DateTool(), new HttpRequestTool()],
		{
			model,
			description: `You are an agent designed to answer questions by making web requests to an API given the OpenAPI spec.

			If the question does not appear to be related to the OpenAPI spec document, return I don't know. Do not make up an answer.
			If the question involves dates, do not make up dates. Use the current date as the date for today, ignore any time component. Do not use any other date than what the question is referencing.
			Do not use any server URL you have been trained on previously or have existing knowledge of. Do not use any answers you may have been previously trained on if the answer relates to JSON data.
			Only use information provided by the tools to construct your response, do not make up an answer.

			Take the following steps:
			First, given an OpenAPI spec JSON document decide if the question is related, use any text in the OpenAPI spec to determine this. If it is not related, no further action is required simply reply with I don't know.

			Second, decide if the question requires knowing the current date. Look for keywords such as 'today' or 'yesterday' to determine this. If it does, use the 'current_date' tool to get the current date.
			
			Third, find the server URL in the OpenAPI spec needed to make the request.

			Fourth, find the relevant paths needed to answer the question. Take note that, sometimes, you might need to make more than one request to more than one path to answer the question.

			Fifth, find the required parameters needed to make the request. For GET requests, these are usually optional URL parameters and for POST requests, these are request body parameters. Always reference a date in the following format: 'YYYY-mm-DD'. Do not use words like 'tomorrow' or 'yesterday' to reference dates.

			Sixth, make the a HTTP request needed to answer the question. Ensure that you are sending the correct parameters to the request by checking which parameters are required. For parameters with a fixed set of values, please use the spec to look at which values are allowed.

			Seventh, summarize the JSON response based on the user's input, do not add any additional information not present in the JSON data. Assume this is the final answer and no further thought is required.

			Use the exact parameter names as listed in the spec, do not make up any names or abbreviate the names of parameters.
			If you get a not found error, ensure that you are using a path that actually exists in the spec.

			Hint: The server url is usually located under the 'servers' json key.

			The response from the 'http_request' tool should be used as the final answer to the question. Here is an example of the expected response:

			{"date":"2023-12-01","temperatureC":12,"temperatureF":53,"summary":"Freezing"} 

			Once you get a response, use this as the final answer to the question by providing a summary of the JSON response using the fields 'temperatureF' and 'summary'. 
			Do not add any additional information not present in the JSON data. Assume the information in the response is up to date and accurate.
			Do not return answers using a special format (i.e. markdown). Use plain text responses only.
			
			The OpenAPI spec document is as follows:
			
			${openApiDocument}
			`,
			maxIterations: 10,
		}
	);

	return openApiExecutor;
};

export class OpenApiExecutor extends Executor {
	tools: BaseTool[];
	options: ExecutorOptions;

	constructor(tools: BaseTool[], options: ExecutorOptions) {
		super(tools, options);

		this.tools = tools;
		this.options = options;
	}

	async execute(question: string): Promise<ModelStream> {
		return super.execute(question);
	}
}
