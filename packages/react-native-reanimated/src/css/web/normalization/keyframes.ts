'use strict';
import {
  withImplicitStrokeDashArrayBounds,
  withMatchingPathStructure,
} from '../../svg/web/processors';
import type { CSSAnimationKeyframes } from '../../types';

type KeyframesNormalizer = (
  keyframes: CSSAnimationKeyframes
) => CSSAnimationKeyframes;

// Whole-set keyframe fixups that a per-value processor can't express, because
// they need to see every keyframe at once rather than one value in isolation.
// Each is a pure keyframes -> keyframes transform and a no-op unless its target
// prop is animated, so order is irrelevant - add new checks to this list.
const NORMALIZERS: readonly KeyframesNormalizer[] = [
  withImplicitStrokeDashArrayBounds,
  withMatchingPathStructure,
];

export const normalizeWebKeyframes: KeyframesNormalizer = (keyframes) =>
  NORMALIZERS.reduce((acc, normalize) => normalize(acc), keyframes);
