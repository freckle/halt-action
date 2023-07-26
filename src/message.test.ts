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

test("toString preserves content", () => {
  const single = "We're down";
  const multi = `We're down

And this is why.
`;

  expect(message.toString(message.fromContent(""))).toEqual("Merges halted");
  expect(message.toString(message.fromContent(single))).toEqual(single);
  expect(message.toString(message.fromContent(multi))).toEqual(multi);
});
