import * as message from "./message";

test("wasOriginallyEmpty", () => {
  const wasOriginallyEmpty = (x: string): boolean => {
    return message.wasOriginallyEmpty(message.fromContent(x));
  };

  expect(wasOriginallyEmpty("")).toEqual(true);
  expect(wasOriginallyEmpty("  \n")).toEqual(true);
  expect(wasOriginallyEmpty("We're down")).toEqual(false);
  expect(wasOriginallyEmpty("We're down\n\nBecause")).toEqual(false);
});

test("fromContent empty", () => {
  const msg = message.fromContent("");

  expect(msg.title).toEqual("Merges halted");
  expect(msg.summary).toBeNull();
});

test("fromContent single-line", () => {
  const msg = message.fromContent("We're down");

  expect(msg.title).toEqual("We're down");
  expect(msg.summary).toBeNull();
});

test("fromContent multi-line", () => {
  const msg = message.fromContent(`This is the first line

And these are some follow up lines that are really long and wrapping into a
paragraph or two.

- And
- Some
- Others
`);

  expect(msg.title).toEqual("This is the first line");
  expect(msg.summary).toEqual(`
And these are some follow up lines that are really long and wrapping into a
paragraph or two.

- And
- Some
- Others
`);
});

test("fromContent multi-line squished", () => {
  const msg = message.fromContent(`This is the first line
And these are some follow up lines that are really long and wrapping into a
paragraph or two.

- And
- Some
- Others
`);

  expect(msg.title).toEqual("This is the first line");
  expect(msg.summary).toEqual(`
And these are some follow up lines that are really long and wrapping into a
paragraph or two.

- And
- Some
- Others
`);
});

test("toStatusDescription short", () => {
  const msg = message.fromContent("This is a message");

  expect(message.toStatusDescription(msg)).toEqual(msg.title);
});

test("toStatusDescription long", () => {
  const msg = message.fromContent(
    "This is a super long message that is much longer than 140 characters and " +
      "it just keeps going and why would anyone make a HALT file with a title " +
      "this long?",
  );
  const description = message.toStatusDescription(msg);

  expect(description.length).toEqual(140);
  expect(description.slice(0, 20)).toEqual("This is a super long");
  expect(description.slice(-20)).toEqual(" HALT file with a...");
});

test("toString preserves content", () => {
  const single = "We're down";
  const multi = `We're down

And this is why.
`;

  expect(message.toString(message.fromContent(""))).toEqual("Merges halted");
  expect(message.toString(message.fromContent(single))).toEqual(single);
  expect(message.toString(message.fromContent(multi))).toEqual(multi);
});
