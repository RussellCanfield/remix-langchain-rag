import { useState, useMemo, memo } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

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

				let data = "";

				const readStream = async () => {
					const { done, value } = await reader!.read();

					if (done) {
						setMessages((oldMessages) => [
							...oldMessages,
							{
								from: "bot",
								message: data,
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

			event.currentTarget.value = "";
		}
	};

	const ChatMessage = memo(({ from, message }: ChatMessage) => {
		return (
			<div className="flex mb-2 items-center gap-4 p-4">
				{from === "me" && (
					<span className="rounded-[50%] h-[50px] w-[50px] bg-slate-100 leading-[3em] text-center">
						Me
					</span>
				)}
				<Markdown
					children={message}
					className={
						"chat-message text-white border-border-color rounded-md border-2 flex-1"
					}
					components={{
						p(props) {
							const { children, className, node, ...rest } =
								props;

							//Special handling because I'm giving it a specific format.
							const hasVideo = /v=(\w+)/.exec(
								String(message) || ""
							);

							return (
								<>
									<p className="text-white">{children}</p>
									{hasVideo && (
										<LiteYouTubeEmbed
											id={hasVideo[1]}
											title={""}
										></LiteYouTubeEmbed>
									)}
								</>
							);
						},
						code(props) {
							const { children, className, node, ...rest } =
								props;

							const languageType = /language-(\w+)/.exec(
								className || ""
							);

							return (
								<SyntaxHighlighter
									children={String(children).replace(
										/\n$/,
										""
									)}
									style={dracula}
									language={
										languageType ? languageType[1] : ""
									}
								/>
							);
						},
					}}
				/>
				{from === "bot" && (
					<span className="rounded-[50%] h-[50px] w-[50px] bg-slate-100 leading-[3em] text-center">
						Bot
					</span>
				)}
			</div>
		);
	});

	const chatMessages = useMemo(() => {
		return messages.map(({ from, message }, index) => (
			<li key={index}>
				<ChatMessage from={from} message={message} />
			</li>
		));
	}, [messages]);

	return (
		<div className="rounded-md shadow-md h-5/6 flex flex-col">
			<ul className="flex-1 overflow-auto bg-gradient-to-r from-zinc-950 to-zinc-900 border-2 border-border-color">
				{chatMessages}
				{lastMessage && (
					<li style={{ whiteSpace: "pre-line" }}>
						<ChatMessage from="bot" message={lastMessage} />
					</li>
				)}
				{loading && (
					<div className="chat-message bg-zinc-800 text-white">
						<div className="skeleton"></div>
						<div className="skeleton animation"></div>
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
