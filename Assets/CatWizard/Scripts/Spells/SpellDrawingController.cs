using System;
using System.Collections.Generic;
using UnityEngine;

namespace CatWizard.Spells
{
    /// <summary>
    /// Connects pointer capture, slow motion, gesture recognition, tracing visuals,
    /// and the spell-cast event consumed by the projectile/effect layer.
    /// </summary>
    public sealed class SpellDrawingController : MonoBehaviour
    {
        [Header("Gesture pipeline")]
        [SerializeField] private SpellGestureInput gestureInput;
        [SerializeField] private SpellGestureRecognizer gestureRecognizer;
        [SerializeField] private SpellTimeDilation timeDilation;
        [SerializeField] private SpellStrokeRenderer strokeRenderer;

        /// <summary>
        /// Fired once for each recognized gesture. The screen position is the
        /// release point and confidence is a normalized 0..1 recognizer score.
        /// Subscribe a spell/projectile system to perform the actual cast.
        /// </summary>
        public event Action<SpellType, Vector2, float> SpellCast;

        /// <summary>
        /// Fired when a completed gesture does not match a known spell.
        /// </summary>
        public event Action<float> StrokeRejected;

        private bool isDrawing;
        private Vector2 lastScreenPoint;

        private void Awake()
        {
            if (gestureInput == null)
                gestureInput = GetComponent<SpellGestureInput>();

            if (gestureRecognizer == null)
                gestureRecognizer = GetComponent<SpellGestureRecognizer>();

            if (timeDilation == null)
                timeDilation = GetComponent<SpellTimeDilation>();
        }

        private void OnEnable()
        {
            if (gestureInput == null)
            {
                Debug.LogError("SpellDrawingController requires a SpellGestureInput component.", this);
                enabled = false;
                return;
            }

            gestureInput.StrokeStarted += HandleStrokeStarted;
            gestureInput.StrokePointAdded += HandleStrokePointAdded;
            gestureInput.StrokeCompleted += HandleStrokeCompleted;
            gestureInput.StrokeCancelled += HandleStrokeCancelled;
        }

        private void OnDisable()
        {
            if (gestureInput != null)
            {
                gestureInput.StrokeStarted -= HandleStrokeStarted;
                gestureInput.StrokePointAdded -= HandleStrokePointAdded;
                gestureInput.StrokeCompleted -= HandleStrokeCompleted;
                gestureInput.StrokeCancelled -= HandleStrokeCancelled;
            }

            if (isDrawing)
                ResolveAndRestore();

            if (strokeRenderer != null)
                strokeRenderer.CancelStroke();
        }

        private void HandleStrokeStarted()
        {
            isDrawing = true;
            lastScreenPoint = Vector2.zero;

            if (timeDilation != null)
                timeDilation.BeginDrawing();

            if (strokeRenderer != null)
                strokeRenderer.BeginStroke();
        }

        private void HandleStrokePointAdded(Vector2 screenPoint)
        {
            lastScreenPoint = screenPoint;

            if (strokeRenderer != null)
                strokeRenderer.AddScreenPoint(screenPoint);
        }

        private void HandleStrokeCompleted(IReadOnlyList<Vector2> points)
        {
            if (!isDrawing)
                return;

            try
            {
                if (points != null && points.Count > 0)
                    lastScreenPoint = points[points.Count - 1];

                if (gestureRecognizer == null)
                {
                    Debug.LogError("No SpellGestureRecognizer is assigned.", this);
                    return;
                }

                if (gestureRecognizer.TryRecognize(points, out SpellType spell, out float confidence))
                {
                    SpellCast?.Invoke(spell, lastScreenPoint, confidence);
                }
                else
                {
                    StrokeRejected?.Invoke(confidence);
                }
            }
            finally
            {
                if (strokeRenderer != null)
                    strokeRenderer.CompleteStroke();

                ResolveAndRestore();
            }
        }

        private void HandleStrokeCancelled()
        {
            if (strokeRenderer != null)
                strokeRenderer.CancelStroke();

            ResolveAndRestore();
        }

        private void ResolveAndRestore()
        {
            isDrawing = false;

            if (timeDilation != null)
                timeDilation.ResolveDrawing();
        }
    }
}
