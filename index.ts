import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

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
  const contributors = await ai(description);
  console.log(contributors);
}

const prompt = `Using the following text, extract the song and or music video contributors with their role and an array of the contributors in JSON format.
<example>
{
  "example role 1": ["example person 1", "example person 2", "example person 3"],
  "example role 2": ["example person 1"],
}
</example>`;

async function ai(input: string) {
  const { text } = await generateText({
    model: openai("gpt-4.1-mini"),
    prompt: `${prompt} <text>${input}</text>`,
  });
  const jsonData = text.replace(/```json/g, "").replace(/```/g, "");
  return JSON.parse(jsonData);
}

main();
