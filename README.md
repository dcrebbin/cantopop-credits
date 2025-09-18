# cantopop-credits

# Video Processing

This will download the video from YouTube and split it into image frames.

#### Args

--videoId="iYAtwuZXEC8" (optional - will process all videos if not provided)

e.g:

`bun run video-processing.ts --videoId="iYAtwuZXEC8"`

# Video Extraction

This will extract the credits from the image frames using a given AI provider.

#### Args

--videoId="iYAtwuZXEC8" (optional - will extract all videos if not provided)
--ai="openai" (openai or google)

e.g:

`bun run video-extraction.ts --videoId="iYAtwuZXEC8"`
