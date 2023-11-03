import { useState } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/cjs/styles/prism";

const Home = () => {
	const [lastMessage, setLastMessage] = useState<string | null>(null);
	const [messages, setMessages] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);

	const handleChatMessage = (
		event: React.KeyboardEvent<HTMLTextAreaElement>
	) => {
		if (event.key === "Enter") {
			event.preventDefault();

			let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
			const prompt = event.currentTarget.value;

			setMessages((oldMessages) => [
				...(oldMessages ?? []),
				`Me: ${prompt}`,
			]);

			setLoading(true);

			fetch(`/chat?prompt=${prompt}`).then((response) => {
				setLoading(false);
				reader = response.body!.getReader();

				let data = "MFE Helper: ";

				const readStream = async () => {
					const { done, value } = await reader!.read();

					if (done) {
						setMessages((oldMessages) => [...oldMessages, data]);
						setLastMessage(null);
						reader?.releaseLock();
						return;
					}

					data += new TextDecoder("utf-8").decode(value);
					setLastMessage(data);
					readStream();
				};

				readStream();
			});
		}
	};

	return (
		<div className="rounded-md bg-slate-100 shadow-md h-5/6 flex flex-col">
			<ul className="p-6 flex-1 overflow-auto">
				{messages.map((message, index) => (
					<li key={index}>
						<Markdown className={"chat-message"}>
							{message}
						</Markdown>
					</li>
				))}
				{lastMessage && (
					<li style={{ whiteSpace: "pre-line" }}>
						<Markdown
							children={lastMessage}
							className={"chat-message"}
							components={{
								code(props) {
									const {
										children,
										className,
										node,
										...rest
									} = props;
									const match = /javascript-(\w+)/.exec(
										className || ""
									);
									return match ? (
										<SyntaxHighlighter
											children={String(children).replace(
												/\n$/,
												""
											)}
											style={dark}
											language={match[1]}
											PreTag="div"
										/>
									) : (
										<code {...rest} className={className}>
											{children}
										</code>
									);
								},
							}}
						/>
					</li>
				)}
				{loading && <div className="skeleton skeleton-text"></div>}
			</ul>
			<div className="h-16">
				<textarea
					name="prompt"
					placeholder="Enter your question here..."
					className="chat-input rounded-md pl-6 pr-6 pt-2 pb-2"
					onKeyDownCapture={handleChatMessage}
				/>
			</div>
		</div>
	);
};

export default Home;
