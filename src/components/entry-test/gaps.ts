/**
 * A gap in a prompt line is four or more underscores. The chosen option is written into it, so the
 * learner reads the whole sentence they are answering with.
 *
 * An option for two gaps reads „sind / besucht": its parts fill the gaps in order, across the
 * lines of the prompt. An option of one part fills the gaps of the first line that has any, as the
 * old page did; any other gap stays blank.
 */

const GAP = /_{4,}/;

export type PromptPiece = { text: string } | { gap: string };

export function fillPrompt(lines: string[], option: string): PromptPiece[][] {
  const parts = option ? option.split(/\s+\/\s+/) : [];
  const several = parts.length > 1;
  let gapIndex = 0;
  let firstGapLine = -1;

  return lines.map((line, lineIndex) => {
    const texts = line.split(GAP);
    if (texts.length > 1 && firstGapLine < 0) firstGapLine = lineIndex;
    const pieces: PromptPiece[] = [];
    texts.forEach((text, i) => {
      if (text) pieces.push({ text });
      if (i === texts.length - 1) return;
      const fill = several ? (parts[gapIndex] ?? '') : lineIndex === firstGapLine ? (parts[0] ?? '') : '';
      pieces.push({ gap: fill });
      gapIndex += 1;
    });
    return pieces;
  });
}
