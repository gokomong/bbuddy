// src/creator/ai-generator.ts
// AI ASCII art generation via Anthropic API (Claude Sonnet)

import { type CustomSprite } from './parts-combiner.js';

export interface ArtGenerationRequest {
  prompt: string;
  maxWidth?: number;
  maxHeight?: number;
}

export interface ArtGenerationResult extends CustomSprite {
  usedPrompt: string;
}

const SYSTEM_PROMPT = `너는 ASCII 아트 전문가다.
요청에 맞는 캐릭터를 ASCII/유니코드로 만들어라.

규칙:
- 최대 5줄, 줄당 최대 12자
- ASCII + 유니코드 문자만 사용
- idle 3프레임 (미세한 차이: 눈 깜빡임, 미세 움직임)
- happy 1프레임, sad 1프레임, working 1프레임
- JSON으로만 출력 (다른 텍스트 없이):
{
  "idle": [["line1","line2",...], ["line1","line2",...], ["line1","line2",...]],
  "happy":   ["line1","line2",...],
  "sad":     ["line1","line2",...],
  "working": ["line1","line2",...]
}`;

function validateFrames(frames: unknown): frames is string[][] {
  if (!Array.isArray(frames)) return false;
  return frames.every(f => Array.isArray(f) && f.every(l => typeof l === 'string'));
}

function validateSingleFrame(frame: unknown): frame is string[] {
  return Array.isArray(frame) && frame.every(l => typeof l === 'string');
}

export async function generateAsciiArt(
  request: ArtGenerationRequest,
  apiKey: string,
): Promise<ArtGenerationResult | null> {
  const maxW = request.maxWidth ?? 12;
  const maxH = request.maxHeight ?? 5;

  const userPrompt = `캐릭터: ${request.prompt}\n최대 ${maxH}줄, 줄당 최대 ${maxW}자`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      console.error(`Anthropic API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as any;
    const text: string = data?.content?.[0]?.text ?? '';

    // Extract JSON — strip markdown code fences if present
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as {
      idle?: unknown;
      happy?: unknown;
      sad?: unknown;
      working?: unknown;
    };

    if (!validateFrames(parsed.idle) || parsed.idle.length < 1) return null;

    const idle = parsed.idle as string[][];
    const happy   = validateSingleFrame(parsed.happy)   ? parsed.happy   : idle[0]!;
    const sad     = validateSingleFrame(parsed.sad)     ? parsed.sad     : idle[0]!;
    const working = validateSingleFrame(parsed.working) ? parsed.working : idle[0]!;

    // Ensure 3 idle frames
    while (idle.length < 3) idle.push(idle[idle.length - 1]!);

    return {
      idleFrames: idle.slice(0, 3),
      happyFrame: happy,
      sadFrame: sad,
      workingFrame: working,
      usedPrompt: request.prompt,
    };
  } catch (err) {
    console.error('ASCII art generation failed:', err);
    return null;
  }
}
