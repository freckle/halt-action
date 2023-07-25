const DEFAULT_TITLE = "Merges halted";

export type Message = {
  title: string;
  summary: string | null;
};

export function fromContent(contents: string): Message {
  const lines = contents.trim() === "" ? [] : contents.split("\n");

  switch (lines.length) {
    case 0:
      return {
        title: DEFAULT_TITLE,
        summary: null,
      };
    case 1:
      return {
        title: lines[0],
        summary: null,
      };
    default:
      return {
        title: lines[0],
        summary: (lines[1] === ""
          ? lines.slice(1)
          : [""].concat(lines.slice(1))
        ) // add leading blank line
          .join("\n"),
      };
  }
}

export function toString(message: Message): string {
  return message.summary
    ? `${message.title}\n${message.summary}`
    : message.title;
}
