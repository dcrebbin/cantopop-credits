import { openai } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { generateJson } from ".";
import { RAW_LOCATIONS } from "./constants";
import { extractYouTubeId } from "./utils";
import fs from "node:fs";
import z from "zod";

const prompt = ``;

export async function extractData() {
  const mainStartTime = new Date();
  for (let i = 0; i < 1; i++) {
    // const rawLocation = RAW_LOCATIONS[i];
    // // if (!rawLocation || rawLocation.contributors !== undefined) {
    // //   continue;
    // // }
    // const videoId = extractYouTubeId(rawLocation?.url ?? "") ?? "";

    // if (!videoId) {
    //   continue;
    // }

    const videoId = "AgEkYyeu3Jg";

    const videoPath = `./downloads/${videoId}.mp4`;
    if (!(await fs.existsSync(videoPath))) {
      console.log(`Video ${videoId} does not exist`);
      continue;
    }

    console.log(`Processing video: ${videoId}`);

    fs.mkdirSync(`./data/${videoId}/data`, { recursive: true });

    for (let i = 1; i < 13; i++) {
      const startTime = new Date();

      const imagePath = `./downloads/${videoId}_frames/${i}.jpg`;
      if (!(await fs.existsSync(imagePath))) {
        console.log(`Image ${i} does not exist`);
        continue;
      }

      const imageBuffer = await fs.readFileSync(imagePath);

      const { text } = await generateText({
        model: openai("gpt-4.1-mini"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract the text and convert it into a json object. Ensure the keys are in camelCase. If the text is not clear/too dim, return an empty object with nothing else. If you cannot find any text, return an empty object with nothing else. ONLY RETURN JSON.
  <example>
  {
    "exampleRole1": ["example person 1", "example person 2", "example person 3"],
    "exampleRole2": ["example person 1"],
  }
  </example>`,
              },
              {
                image: imageBuffer,
                type: "image",
              },
            ],
          },
        ],
      });

      const cleanedText = text.replace(/```json\n|```/g, "");
      const object = JSON.parse(cleanedText);
      //create the directory if it doesn't exist

      await fs.writeFileSync(
        `./data/${videoId}/data/${i}.json`,
        JSON.stringify(object, null, 2)
      );
      const endTime = new Date();
      console.log(`Time taken: ${endTime.getTime() - startTime.getTime()}ms`);
    }
    const collatedData = await collateData(videoId);
    await fs.writeFileSync(
      `./data/${videoId}/data/collated.json`,
      JSON.stringify(collatedData, null, 2)
    );

    const cleanedData = await generateJson(
      prompt,
      JSON.stringify(collatedData)
    );
    console.log(cleanedData);
  }
  const endTime = new Date();
  console.log(
    `Total time taken: ${endTime.getTime() - mainStartTime.getTime()}ms`
  );
}
async function collateData(videoId: string) {
  const data: Record<string, string[]> = {};
  for (let i = 1; i < 13; i++) {
    try {
      const jsonPath = `./data/${videoId}/data/${i}.json`;
      if (!(await fs.existsSync(jsonPath))) {
        continue;
      }
      const content = fs.readFileSync(jsonPath, "utf8");
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        // Malformed JSON; skip this frame
        continue;
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        // Unexpected shape; skip
        continue;
      }

      // Merge the parsed data into the main data object
      for (const [role, contributors] of Object.entries(
        parsed as Record<string, unknown>
      )) {
        if (!role) continue;

        let contributorList: string[] = [];
        if (Array.isArray(contributors)) {
          contributorList = (contributors as unknown[])
            .map(String)
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (typeof contributors === "string") {
          const normalized = contributors.trim();
          if (normalized) contributorList = [normalized];
        } else {
          // Unsupported value; skip
          continue;
        }

        if (contributorList.length === 0) continue;

        if (data[role]) {
          // If role already exists, combine the arrays and remove duplicates
          data[role] = [...new Set([...data[role], ...contributorList])];
        } else {
          // If role doesn't exist, add it
          data[role] = [...new Set(contributorList)];
        }
      }
    } catch {
      // Unexpected error for this frame; continue with the rest
      continue;
    }
  }

  for (const [role, contributors] of Object.entries(data)) {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const raw of contributors as string[]) {
      const cleaned = raw.trim().replace(/\s+/g, " ");
      const key = cleaned.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cleaned);
      }
    }
    data[role] = unique;
  }

  return data;
}

// main();
