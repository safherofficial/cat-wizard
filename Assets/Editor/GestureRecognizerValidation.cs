#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using CatWizard.Spells;

namespace CatWizard.Editor
{
    internal static class GestureRecognizerValidation
    {
        [MenuItem("Cat Wizard/Validate Gesture Recognizer")]
        private static void RunValidation()
        {
            GameObject host = new GameObject("CatWizard Gesture Validation (temporary)");
            host.hideFlags = HideFlags.HideAndDontSave;

            try
            {
                SpellGestureRecognizer recognizer = host.AddComponent<SpellGestureRecognizer>();
                var failures = new List<string>();
                SpellType[] expected =
                {
                    SpellType.Fireball,
                    SpellType.Thunderbolt,
                    SpellType.Frost,
                    SpellType.Gravity,
                    SpellType.Chaos
                };

                List<Vector2>[] paths =
                {
                    MakeCircle(),
                    MakeLightning(),
                    MakeTriangle(),
                    MakeSpiral(),
                    MakeStar()
                };

                for (int i = 0; i < paths.Length; i++)
                {
                    List<Vector2> transformed = TransformWithNoise(paths[i], i * 0.37f, 0.82f);

                    bool accepted = recognizer.TryRecognize(
                        transformed,
                        out SpellType actual,
                        out float confidence);

                    if (!accepted || actual != expected[i])
                    {
                        failures.Add(
                            expected[i] + " => " +
                            (accepted ? actual.ToString() : "REJECTED") +
                            " (confidence " + confidence.ToString("0.000") + ")");
                    }
                    else
                    {
                        Debug.Log(
                            "[Cat Wizard] PASS " + expected[i] +
                            " confidence " + confidence.ToString("0.000"));
                    }
                }

                List<Vector2> accidentalLine = new List<Vector2>();
                for (int i = 0; i < 20; i++)
                    accidentalLine.Add(new Vector2(i * 15f, 100f + i * 2f));

                if (recognizer.TryRecognize(accidentalLine, out SpellType accidentalSpell, out float accidentalScore))
                {
                    failures.Add(
                        "Straight-line scribble unexpectedly recognized as " +
                        accidentalSpell + " (confidence " + accidentalScore.ToString("0.000") + ")");
                }
                else
                {
                    Debug.Log("[Cat Wizard] PASS unrecognized straight-line gesture rejected");
                }

                if (failures.Count == 0)
                    Debug.Log("[Cat Wizard] Gesture recognizer validation passed: 6/6 checks.");
                else
                    Debug.LogError(
                        "[Cat Wizard] Gesture recognizer validation failed: " +
                        string.Join("; ", failures));
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(host);
            }
        }

        private static List<Vector2> TransformWithNoise(List<Vector2> source, float rotation, float scale)
        {
            var result = new List<Vector2>(source.Count);
            float cosine = Mathf.Cos(rotation);
            float sine = Mathf.Sin(rotation);
            Vector2 translation = new Vector2(460f, 290f);

            for (int i = 0; i < source.Count; i++)
            {
                Vector2 point = source[i] * scale;
                Vector2 rotated = new Vector2(
                    point.x * cosine - point.y * sine,
                    point.x * sine + point.y * cosine);

                Vector2 noise = new Vector2(
                    Mathf.Sin(i * 1.71f) * 2.5f,
                    Mathf.Cos(i * 1.37f) * 2.5f);

                result.Add(rotated + translation + noise);
            }

            return result;
        }

        private static List<Vector2> MakeCircle()
        {
            var points = new List<Vector2>(81);
            for (int i = 0; i <= 80; i++)
            {
                float angle = Mathf.PI * 2f * i / 80f;
                points.Add(new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * 100f);
            }

            return points;
        }

        private static List<Vector2> MakeLightning()
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

        private static List<Vector2> MakeTriangle()
        {
            return new List<Vector2>
            {
                new Vector2(-100f, -75f),
                new Vector2(100f, -75f),
                new Vector2(0f, 105f),
                new Vector2(-100f, -75f)
            };
        }

        private static List<Vector2> MakeSpiral()
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

        private static List<Vector2> MakeStar()
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
#endif
