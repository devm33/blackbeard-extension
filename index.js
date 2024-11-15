import { Octokit } from "@octokit/core";
import express from "express";
import { Readable } from "node:stream";
import { createAckEvent, createConfirmationEvent, createDoneEvent, createTextEvent, getUserConfirmation, prompt } from '@copilot-extensions/preview-sdk';
import { randomUUID } from "node:crypto";

const app = express()

app.post("/", express.json(), async (req, res) => {
  res.write(createAckEvent());

  // Parse the request payload and log it.
  const payload = req.body;

  // Check for confirmation
  let userConfirmation = getUserConfirmation(payload);
  if (userConfirmation) {
    console.log("Received a user confirmation", userConfirmation);
    if (userConfirmation.accepted) {
      res.write(createTextEvent("You confirmed!"));
    } else {
      res.write(createTextEvent("You denied!"));
    }
    res.write(createDoneEvent());
    res.end();
    return;
  }

  // Identify the user, using the GitHub API token provided in the request headers.
  const tokenForUser = req.get("X-GitHub-Token");
  const octokit = new Octokit({ auth: tokenForUser });
  const user = await octokit.request("GET /user");
  // console.log("User:", user.data.login);

  // console.log("Payload:", payload);

  // Insert a special pirate-y system message in our message list.
  const messages = payload.messages;
  // messages.unshift({
  //   role: "system",
  //   content: "You are a helpful assistant that replies to user messages as if you were the Blackbeard Pirate.",
  // });
  messages.unshift({
    role: "system",
    content: `Start every response with the user's name, which is @${user.data.login}`,
  });

  // Use Copilot's LLM to generate a response to the user's messages, with
  // our extra system messages attached.
  const copilotLLMResponse = await prompt({
    token: tokenForUser,
    messages
  });
  console.log("Copilot LLM response:", copilotLLMResponse);
  res.write(createTextEvent(copilotLLMResponse.message.content));
  let confirm = createConfirmationEvent({
    id: randomUUID(),
    title: "Confirmation title",
    message: "Confirmation message",
  });
  console.log("Confirmation:", confirm);
  res.write(confirm);

  res.write(createDoneEvent());
  res.end();
})

const port = Number(process.env.PORT || '3000')
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
});
