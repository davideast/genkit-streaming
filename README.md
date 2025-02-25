# Genkit Streaming

You know you want those cool AI typing effects. Well, streaming is super easy with Genkit. Here's how it works...

## Load API keys

```bash
npm run create:env
# set GOOGLE_GENAI_API_KEY in set_env.sh
source ./set_env.sh
```

## Set up Genkit

```ts
import { gemini20Flash, googleAI } from '@genkit-ai/googleai';
import { genkit, z, UserFacingError } from 'genkit/beta';

const ai = genkit({
  plugins: [googleAI()],
});
```

## Define schemas for input and structured output

```ts
// continued from above

const InputSchema = z.object({
  shark: z.string(),
})

const OutputSchema = z.object({
  name: z.string().describe("The name of the shark"),
  fact: z.string().describe("A fun fact about the shark"),
  strength: z.string().describe("An explanation of the shark's intelligence"),
  intelligence: z.string().describe("An explanation of the shark's strength"),
  description: z.string().describe("An overall description of the shark"),
})

type Input = typeof InputSchema;
type Output = typeof OutputSchema;
```

## Define a prompt

Prompts take input and declare an output shape with schemas. The `prompt` property is really flexible but my favorite way of handling it is with the implicit templating syntax `{{ shark }}`. This means you don't have to fight with string template literals, genkit just handles it for you.

```ts
// continued from above
const prompt = ai.definePrompt<Input, Output>({
  name: 'Shark Fact',
  model: gemini20Flash,
  input: { schema: InputSchema },
  output: { schema: OutputSchema },
  prompt: "Tell me a fun fact about the {{shark}} shark"
});
```

## Define a flow

A flow is a callable function that is observable. That's a fancy way of saying you can get a lot insight into the things that run inside of a flow. Genkit runs tracing on everything inside of a flow, so it's a good idea to wrap things in it when necessary. Below is a mapping of a prompt's input, output, and stream to a flow. It's okay too to just use the prompt stream but know that you'll miss out on some portability and observability with a flow.

```ts
// continued from above
const factFlow = ai.defineFlow<Input, Output, z.ZodString>('fact', async (input, sc) => {
  const { stream, response } = await prompt.stream(input)
  for await (const chunk of stream) {
    // Check out the GenerateResponseChunk helpers such as 
    // .accumulatedText() and .previousText()
    sc.sendChunk(chunk.text)
  }
  const { output } = (await response)
  if(!output) {
    throw new UserFacingError("UNKNOWN", 'No output from prompt')
  }
  return output;
});
```

## Streaming time

Now you can stream back on the server AND/OR get the full result output back as well.

```ts
//continued from above
(async () => {
  const {stream, output} = factFlow.stream({ shark: 'Nurse' });
  for await (const chunk of stream) {
    // streaming back the chunk
    console.log(chunk)
  }

  // getting the whole response
  const res = await output
  console.log({output: res});
})();
```

## Coming up next

Client side streaming...