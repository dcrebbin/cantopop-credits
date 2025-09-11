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
  console.log("Starting main");
  const videoId = "Lc1McFzS-CM";
  const description = await retrieveDescriptionFromVideo(videoId);
  console.log(description);
}

main();
