import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

const STICKER_PROMPT_TEMPLATE = `cute Japanese sticker illustration of {keyword}, chibi style, white background, thick black outline, kawaii, sticker sheet style, no text, flat colors, simple`

export async function generateSticker(keyword: string): Promise<string> {
  const prompt = STICKER_PROMPT_TEMPLATE.replace('{keyword}', keyword)

  const output = await replicate.run(
    'black-forest-labs/flux-schnell:fast-download',
    {
      input: {
        prompt,
        num_inference_steps: 4,
        guidance_scale: 0,
      },
    }
  ) as unknown as string

  // output is a URL to the generated image
  return output
}
