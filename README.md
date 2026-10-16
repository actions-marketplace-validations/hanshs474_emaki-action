# emaki Seedance AI Video Generator (GitHub Action)

Official GitHub Action for emaki (emaki.ai), the Japanese-language AI video generator for [Seedance 2.5](https://emaki.ai/seedance-2-5) and [Seedance 2.0](https://emaki.ai/seedance-2). Generate a video clip or an image inside a workflow on [emaki](https://emaki.ai/?utm_source=github-action&utm_medium=package) and get back the URL of the finished file: release teasers, product clips, social posts, or a nightly clip from a prompt file.

日本語での使い方は [シーダンス](https://emaki.ai/) へ。

```yaml
- uses: hanshs474/emaki-action@v1
  id: clip
  with:
    api-key: ${{ secrets.EMAKI_API_KEY }}
    prompt: "a paper lantern drifting over a night river, slow push in"
    duration: "5"
    aspect-ratio: "16:9"
    output-path: assets/teaser.mp4
- run: echo "${{ steps.clip.outputs.url }}"
```

[Image to video](https://emaki.ai/image-to-video): pass a first frame.

```yaml
- uses: hanshs474/emaki-action@v1
  with:
    api-key: ${{ secrets.EMAKI_API_KEY }}
    image-url: https://example.com/product.jpg
    prompt: "the camera slowly orbits the product while light sweeps across it"
    resolution: 720p
```

An image instead of a clip:

```yaml
- uses: hanshs474/emaki-action@v1
  with:
    api-key: ${{ secrets.EMAKI_API_KEY }}
    media: image
    model: nano_banana_2
    prompt: "a ramen shop at dusk, isometric"
```

## Inputs

| Input | |
|---|---|
| `api-key` | required. Create one at [emaki.ai/settings/apikeys](https://emaki.ai/settings/apikeys) and store it as a repository secret `EMAKI_API_KEY` |
| `prompt` | required. What to make |
| `media` | `video` (default) or `image` |
| `model` | empty uses `seedance_2_5` for video and `nano_banana_2_lite` for images. Video: `seedance_2_5`, `seedance_2`, `seedance_2_fast`, `seedance_2_mini`, `minimax_h3`, `veo_3_1`. Image: `nano_banana_2_lite`, `nano_banana_2`, `seedream_5_lite`, `gpt_image_2` |
| `image-url` | public https url of the first frame |
| `aspect-ratio`, `duration`, `resolution` | e.g. `9:16`, `8`, `720p` (Seedance 2.5 takes 4 to 30 seconds and 480p, 720p or 1080p) |
| `parameters` | extra model parameters as JSON, e.g. `{"generate_audio": false}` |
| `output-path` | download the file into the workspace |
| `timeout-minutes` | default 15; video can wait in a queue |

Outputs: `url` (the finished file), `path` (if `output-path` was set) and `id` (the emaki run id).

Each run costs credits on your emaki account, the same price as on the website. The step fails with the service's own message on a wrong key, an empty balance, a model that unlocks after a credit purchase, or a refused prompt. To make a clip sharper afterwards, there is the [AI video upscaler](https://emaki.ai/video-upscaler).

No dependencies (`node test.js` runs the offline tests); MIT licensed.
