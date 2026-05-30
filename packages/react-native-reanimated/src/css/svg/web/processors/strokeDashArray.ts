'use strict';
import { maybeAddSuffix, type UnknownRecord } from '../../../../common';
import type { CSSAnimationKeyframes } from '../../../types';
import { offsetOf } from '../../../utils';

// Suffix each element; suffixing the joined array yields invalid CSS like
// `10%,5%px` that the browser drops.
export const processStrokeDashArray = (
  value: number | string | ReadonlyArray<number | string>
): string =>
  Array.isArray(value)
    ? value.map((element) => maybeAddSuffix(element, 'px')).join(' ')
    : maybeAddSuffix(value, 'px');

const firstDash = (block: UnknownRecord): unknown => {
  const value = block.strokeDasharray;
  return Array.isArray(value) ? value[0] : value;
};

// Fill `strokeDasharray` at the `edge` (start 0 / end 1) from the nearest dash
// keyframe's first dash, merging into `existing` (a keyframe already at that
// edge) or inserting a new `from`/`to`.
const fillEdge = (
  keyframes: Record<string, UnknownRecord>,
  edge: 0 | 1,
  key: string | undefined,
  source: string
): Record<string, UnknownRecord> => {
  const strokeDasharray = firstDash(keyframes[source]);
  const resultingKey = key ?? (edge === 0 ? 'from' : 'to');

  return {
    ...keyframes,
    [resultingKey]: { ...keyframes[resultingKey], strokeDasharray },
  };
};

type DashFrame = { key: string; offset: number };

function findEarliestAndLatestFrame(frames: DashFrame[]) {
  let earliest = frames[0];
  let latest = frames[0];
  let i = 1;

  for (; i + 1 < frames.length; i += 2) {
    const first = frames[i];
    const second = frames[i + 1];
    const [earlier, later] =
      first.offset < second.offset ? [first, second] : [second, first];
    if (earlier.offset < earliest.offset) {
      earliest = earlier;
    }
    if (later.offset > latest.offset) {
      latest = later;
    }
  }

  // An even count leaves one unpaired frame; fold it into both bounds.
  if (i < frames.length) {
    const leftover = frames[i];
    if (leftover.offset < earliest.offset) {
      earliest = leftover;
    }
    if (leftover.offset > latest.offset) {
      latest = leftover;
    }
  }

  return { earliest, latest };
}

// A missing 0%/100% endpoint backfills from the base `none`, which can't
// interpolate to a length list and so snaps. Fill each missing edge with a lone
// length (it repeats to fit any list, so it interpolates).
export function withImplicitStrokeDashArrayBounds<TStyle extends object>(
  definitions: CSSAnimationKeyframes<TStyle>
): CSSAnimationKeyframes<TStyle> {
  const blocks = definitions as Record<string, UnknownRecord>;

  // Single pass: collect the dash frames and remember any keyframe already on an
  // edge (0/1), so a later fill can merge into it without scanning again.
  const dashFrames: DashFrame[] = [];
  let startKey: string | undefined;
  let endKey: string | undefined;

  for (const key in blocks) {
    const offset = offsetOf(key);
    if (offset === null) {
      continue;
    }
    if (offset === 0) {
      startKey = key;
    } else if (offset === 1) {
      endKey = key;
    }
    if ('strokeDasharray' in blocks[key]) {
      dashFrames.push({ key, offset });
    }
  }
  if (dashFrames.length === 0) {
    return definitions;
  }

  // Only the extremes matter so search for the min/max offset.
  const { earliest, latest } = findEarliestAndLatestFrame(dashFrames);

  let result = blocks;
  if (earliest.offset > 0) {
    result = fillEdge(result, 0, startKey, earliest.key);
  }
  if (latest.offset < 1) {
    result = fillEdge(result, 1, endKey, latest.key);
  }

  return result as CSSAnimationKeyframes<TStyle>;
}
