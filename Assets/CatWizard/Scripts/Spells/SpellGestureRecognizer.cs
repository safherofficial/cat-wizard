using System.Collections.Generic;
using UnityEngine;

namespace CatWizard.Spells
{
    /// <summary>
    /// A compact $1-style unistroke recognizer. Paths are resampled, rotated,
    /// scaled, and translated before being compared with the five spell templates.
    /// </summary>
    public sealed class SpellGestureRecognizer : MonoBehaviour
    {
        private const int SampleCount = 64;
        private const float NormalizedSize = 250f;
        private const float HalfDiagonal = 176.7767f;

        [SerializeField, Range(3, 12)]
        private int minimumInputPoints = 4;

        [SerializeField, Min(1f)]
        private float minimumStrokeLengthPixels = 70f;

        [SerializeField, Range(0f, 1f)]
        private float minimumConfidence = 0.62f;

        [SerializeField, Range(0f, 0.5f)]
        private float minimumScoreMargin = 0.035f;

        [SerializeField, Range(1f, 2f)]
        private float minimumPathCurvatureRatio = 1.12f;

        private readonly List<GestureTemplate> templates = new List<GestureTemplate>();

        private readonly struct GestureTemplate
        {
            public readonly SpellType Spell;
            public readonly List<Vector2> Points;

            public GestureTemplate(SpellType spell, List<Vector2> points)
            {
                Spell = spell;
                Points = points;
            }
        }

        private void Awake()
        {
            BuildTemplates();
        }

        public bool TryRecognize(
            IReadOnlyList<Vector2> input,
            out SpellType spell,
            out float confidence)
        {
            spell = default;
            confidence = 0f;

            if (input == null || input.Count < minimumInputPoints)
                return false;

            // Lazy initialization also allows the Editor validation command to
            // exercise the recognizer without entering Play Mode.
            if (templates.Count == 0)
                BuildTemplates();

            float pathLength = GetPathLength(input);
            if (pathLength < minimumStrokeLengthPixels)
                return false;

            float chordLength = Vector2.Distance(input[0], input[input.Count - 1]);
            float curvatureRatio = pathLength / Mathf.Max(chordLength, 0.001f);
            if (curvatureRatio < minimumPathCurvatureRatio)
                return false;

            List<Vector2> candidate = NormalizePath(input);
            if (candidate == null || candidate.Count != SampleCount)
                return false;

            float bestScore = float.NegativeInfinity;
            float secondDifferentSpellScore = float.NegativeInfinity;
            SpellType bestSpell = default;

            for (int i = 0; i < templates.Count; i++)
            {
                GestureTemplate template = templates[i];
                float distance = DistanceAtBestAngle(candidate, template.Points);
                float score = Mathf.Clamp01(1f - distance / HalfDiagonal);

                if (score > bestScore)
                {
                    if (bestSpell != template.Spell)
                        secondDifferentSpellScore = bestScore;

                    bestScore = score;
                    bestSpell = template.Spell;
                }
                else if (template.Spell != bestSpell && score > secondDifferentSpellScore)
                {
                    secondDifferentSpellScore = score;
                }
            }

            confidence = bestScore;
            float margin = bestScore - secondDifferentSpellScore;

            if (bestScore < minimumConfidence || margin < minimumScoreMargin)
                return false;

            spell = bestSpell;
            return true;
        }

        private void BuildTemplates()
        {
            templates.Clear();

            AddTemplate(SpellType.Fireball, CreateCircle());
            AddTemplate(SpellType.Thunderbolt, CreateLightningBolt());
            AddTemplate(SpellType.Frost, CreateTriangle());
            AddTemplate(SpellType.Gravity, CreateSpiral());
            AddTemplate(SpellType.Chaos, CreateStar());
        }

        private void AddTemplate(SpellType spell, List<Vector2> rawPoints)
        {
            List<Vector2> forward = NormalizePath(rawPoints);
            templates.Add(new GestureTemplate(spell, forward));

            List<Vector2> reversed = new List<Vector2>(rawPoints);
            reversed.Reverse();
            templates.Add(new GestureTemplate(spell, NormalizePath(reversed)));
        }

        private static List<Vector2> NormalizePath(IReadOnlyList<Vector2> input)
        {
            List<Vector2> points = Resample(input, SampleCount);
            if (points.Count != SampleCount)
                return null;

            Vector2 center = Centroid(points);
            Vector2 firstOffset = points[0] - center;
            float indicativeAngle = Mathf.Atan2(firstOffset.y, firstOffset.x);

            Rotate(points, center, -indicativeAngle);
            ScaleToSquare(points, NormalizedSize);
            TranslateToOrigin(points);

            return points;
        }

        private static List<Vector2> Resample(IReadOnlyList<Vector2> input, int count)
        {
            var result = new List<Vector2>(count);
            if (input == null || input.Count == 0 || count <= 0)
                return result;

            if (input.Count == 1)
            {
                for (int i = 0; i < count; i++)
                    result.Add(input[0]);
                return result;
            }

            var cumulative = new float[input.Count];
            for (int i = 1; i < input.Count; i++)
                cumulative[i] = cumulative[i - 1] + Vector2.Distance(input[i - 1], input[i]);

            float totalLength = cumulative[input.Count - 1];
            if (totalLength <= Mathf.Epsilon)
            {
                for (int i = 0; i < count; i++)
                    result.Add(input[0]);
                return result;
            }

            int segment = 1;
            for (int sample = 0; sample < count; sample++)
            {
                float targetDistance = totalLength * sample / (count - 1);
                while (segment < cumulative.Length - 1 && cumulative[segment] < targetDistance)
                    segment++;

                float segmentStart = cumulative[segment - 1];
                float segmentLength = cumulative[segment] - segmentStart;
                float t = segmentLength <= Mathf.Epsilon
                    ? 0f
                    : (targetDistance - segmentStart) / segmentLength;

                result.Add(Vector2.Lerp(input[segment - 1], input[segment], t));
            }

            return result;
        }

        private static void Rotate(List<Vector2> points, Vector2 center, float radians)
        {
            float cosine = Mathf.Cos(radians);
            float sine = Mathf.Sin(radians);

            for (int i = 0; i < points.Count; i++)
            {
                Vector2 offset = points[i] - center;
                points[i] = new Vector2(
                    offset.x * cosine - offset.y * sine,
                    offset.x * sine + offset.y * cosine) + center;
            }
        }

        private static void ScaleToSquare(List<Vector2> points, float size)
        {
            Vector2 min = points[0];
            Vector2 max = points[0];

            for (int i = 1; i < points.Count; i++)
            {
                min = Vector2.Min(min, points[i]);
                max = Vector2.Max(max, points[i]);
            }

            float width = Mathf.Max(max.x - min.x, 0.0001f);
            float height = Mathf.Max(max.y - min.y, 0.0001f);
            float scaleX = size / width;
            float scaleY = size / height;

            for (int i = 0; i < points.Count; i++)
                points[i] = new Vector2(points[i].x * scaleX, points[i].y * scaleY);
        }

        private static void TranslateToOrigin(List<Vector2> points)
        {
            Vector2 center = Centroid(points);
            for (int i = 0; i < points.Count; i++)
                points[i] -= center;
        }

        private static Vector2 Centroid(IReadOnlyList<Vector2> points)
        {
            Vector2 sum = Vector2.zero;
            for (int i = 0; i < points.Count; i++)
                sum += points[i];

            return sum / Mathf.Max(1, points.Count);
        }

        private static float DistanceAtBestAngle(List<Vector2> points, List<Vector2> template)
        {
            const float angleRange = Mathf.PI * 0.25f;
            const float anglePrecision = Mathf.PI / 90f;
            const float phi = 0.61803398875f;

            float a = -angleRange;
            float b = angleRange;
            float x1 = phi * a + (1f - phi) * b;
            float x2 = (1f - phi) * a + phi * b;
            float f1 = DistanceAtAngle(points, template, x1);
            float f2 = DistanceAtAngle(points, template, x2);

            while (Mathf.Abs(b - a) > anglePrecision)
            {
                if (f1 < f2)
                {
                    b = x2;
                    x2 = x1;
                    f2 = f1;
                    x1 = phi * a + (1f - phi) * b;
                    f1 = DistanceAtAngle(points, template, x1);
                }
                else
                {
                    a = x1;
                    x1 = x2;
                    f1 = f2;
                    x2 = (1f - phi) * a + phi * b;
                    f2 = DistanceAtAngle(points, template, x2);
                }
            }

            return Mathf.Min(f1, f2);
        }

        private static float DistanceAtAngle(
            List<Vector2> points,
            List<Vector2> template,
            float radians)
        {
            Vector2 center = Centroid(points);
            float cosine = Mathf.Cos(radians);
            float sine = Mathf.Sin(radians);
            float total = 0f;

            for (int i = 0; i < points.Count; i++)
            {
                Vector2 offset = points[i] - center;
                Vector2 rotated = new Vector2(
                    offset.x * cosine - offset.y * sine,
                    offset.x * sine + offset.y * cosine) + center;

                total += Vector2.Distance(rotated, template[i]);
            }

            return total / points.Count;
        }

        private static float GetPathLength(IReadOnlyList<Vector2> points)
        {
            float length = 0f;
            for (int i = 1; i < points.Count; i++)
                length += Vector2.Distance(points[i - 1], points[i]);

            return length;
        }

        private static List<Vector2> CreateCircle()
        {
            var points = new List<Vector2>(81);
            for (int i = 0; i <= 80; i++)
            {
                float angle = Mathf.PI * 2f * i / 80f;
                points.Add(new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * 100f);
            }

            return points;
        }

        private static List<Vector2> CreateTriangle()
        {
            return new List<Vector2>
            {
                new Vector2(-100f, -75f),
                new Vector2(100f, -75f),
                new Vector2(0f, 105f),
                new Vector2(-100f, -75f)
            };
        }

        private static List<Vector2> CreateLightningBolt()
        {
            return new List<Vector2>
            {
                new Vector2(15f, 110f),
                new Vector2(-55f, 15f),
                new Vector2(-5f, 15f),
                new Vector2(-35f, -105f),
                new Vector2(60f, 5f),
                new Vector2(10f, 5f)
            };
        }

        private static List<Vector2> CreateSpiral()
        {
            var points = new List<Vector2>(81);
            for (int i = 0; i <= 80; i++)
            {
                float t = i / 80f;
                float angle = t * Mathf.PI * 4f;
                float radius = Mathf.Lerp(5f, 110f, t);
                points.Add(new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * radius);
            }

            return points;
        }

        private static List<Vector2> CreateStar()
        {
            var points = new List<Vector2>(11);
            for (int i = 0; i <= 10; i++)
            {
                float angle = -Mathf.PI * 0.5f + i * Mathf.PI / 5f;
                float radius = i % 2 == 0 ? 110f : 45f;
                points.Add(new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * radius);
            }

            return points;
        }
    }
}
