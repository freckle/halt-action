import * as message from "./message";

test("fromContent empty", async () => {
  const msg = message.fromContent("");

  expect(msg.title).toEqual("Merges halted");
  expect(msg.summary).toBeNull();
});

test("fromContent single-line", async () => {
  const msg = message.fromContent("We're down");

  expect(msg.title).toEqual("We're down");
  expect(msg.summary).toBeNull();
});

test("fromContent multi-line", async () => {
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

test("fromContent multi-line squished", async () => {
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
