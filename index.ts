import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import z from "zod";

async function retrieveDescriptionFromVideo(videoId: string) {
  const youtubePlayer: any = await retrieveYouTubePlayer(videoId);
  return youtubePlayer?.videoDetails?.shortDescription ?? null;
}

async function retrieveYouTubePlayer(videoId: string) {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/player`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com",
    },
    body: JSON.stringify({
      context: {
        client: {
          hl: "en",
          clientName: "WEB",
          clientVersion: "2.20250417.01.00",
        },
        request: { useSsl: true },
      },
      videoId: videoId,
    }),
  });

  if (res.status !== 200) {
    throw new Error(
      `Failed to retrieve YouTube player: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();
  return data;
}

async function main() {
  const description = await retrieveDescriptionFromVideo("Rvj-o2fNFWk");
  const contributors = await generateJson(prompt, description);
  console.log(contributors);
}

const prompt = `Using the following text, extract the song and or music video contributors with their role and an array of the contributors in JSON format. Only output the JSON object and nothing else.
<example>
{
  "example role 1": ["example person 1", "example person 2", "example person 3"],
  "example role 2": ["example person 1"],
}
</example>`;

export async function generateJson(prompt: string, input: string) {
  const { object } = await generateObject({
    model: openai("gpt-4.1-mini"),
    prompt: `${prompt} <text>${input}</text>`,
    schema: z.object(),
  });
  return object;
}

main();
