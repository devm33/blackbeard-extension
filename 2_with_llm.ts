import express from 'express';
import { Octokit } from '@octokit/core';
import { createAckEvent, createDoneEvent, createTextEvent, getUserConfirmation, MessageRole, prompt } from '@copilot-extensions/preview-sdk';

const app = express();
app.use(express.json());

app.get('/', (_, res) => {
    res.send('ack');
});

app.post('/', async (req, res) => {
  // Ack chat message to show loading indicator.
  res.write(createAckEvent());

  // Parse the request body.
  const payload = req.body;

  // Identify the user, using the GitHub API token provided in the request headers.
  const tokenForUser = req.get("X-GitHub-Token") || '';
  const octokit = new Octokit({ auth: tokenForUser });
  const userResponse = await octokit.request("GET /user");
  const userLogin = userResponse.data.login;

  res.write(createTextEvent(`Hello ${userLogin}!`));

  // End chat response.
  res.write(createDoneEvent());
  res.end();
});

const port = Number(process.env.PORT || '3000');
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});