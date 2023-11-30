export type Senders = "me" | "bot";

export type Message = {
	from: Senders;
	message: string;
};
