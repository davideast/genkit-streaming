import { gemini20Flash, googleAI } from '@genkit-ai/googleai';
import { genkit, z, UserFacingError } from 'genkit/beta';

const ai = genkit({
  plugins: [googleAI()],
});

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

const prompt = ai.definePrompt<Input, Output>({
  name: 'Shark Fact',
  model: gemini20Flash,
  input: { schema: InputSchema },
  output: { schema: OutputSchema },
  prompt: "Tell me a fun fact about the {{shark}} shark"
});

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
