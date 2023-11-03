import { useState, useMemo } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/cjs/styles/prism";

type Senders = "me" | "bot";

type ChatMessage = {
	from: Senders;
	message: string;
};

const Home = () => {
	const [lastMessage, setLastMessage] = useState<string | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
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
				{
					from: "me",
					message: prompt,
				},
			]);

			setLoading(true);

			fetch(`/chat?prompt=${prompt}`).then((response) => {
				setLoading(false);
				reader = response.body!.getReader();

				let data = "Bot: ";

				const readStream = async () => {
					const { done, value } = await reader!.read();

					if (done) {
						setMessages((oldMessages) => [
							...oldMessages,
							{
								from: "bot",
								message: data.replace("Bot: ", ""),
							},
						]);
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

	const chatMessages = useMemo(() => {
		return messages.map(({ from, message }, index) => (
			<li key={index}>
				<Markdown
					className={`chat-message ${
						from === "bot"
							? "bg-slate-800 text-white"
							: "bg-slate-400 text-white"
					}`}
				>
					{`${from === "bot" ? "Bot: " : "Me: "} ${message}`}
				</Markdown>
			</li>
		));
	}, [messages]);

	return (
		<div className="rounded-md bg-slate-100 shadow-md h-5/6 flex flex-col">
			<ul className="flex-1 overflow-auto bg-slate-500 border-2 border-slate-400">
				{chatMessages}
				{lastMessage && (
					<li style={{ whiteSpace: "pre-line" }}>
						<Markdown
							children={lastMessage}
							className={"chat-message bg-slate-800 text-white"}
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
				{loading && (
					<div className="chat-message bg-slate-800 text-white">
						<div className="skeleton skeleton-text"></div>
					</div>
				)}
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
