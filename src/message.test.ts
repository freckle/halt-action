import * as message from "./message";

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

test("toString", () => {
  const msgSingle = "We're down";
  const msgMulti = `We're down

And this is why.
`;

  expect(message.toString(message.fromContent(""))).toEqual("Merges halted");
  expect(message.toString(message.fromContent(msgSingle))).toEqual(msgSingle);
  expect(message.toString(message.fromContent(msgMulti))).toEqual(msgMulti);
});
