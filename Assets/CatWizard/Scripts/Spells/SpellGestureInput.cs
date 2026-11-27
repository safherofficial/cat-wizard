using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace CatWizard.Spells
{
    /// <summary>
    /// Captures one pointer stroke in screen coordinates. Input sampling is done
    /// from Update and is not affected by Time.timeScale.
    /// </summary>
    public sealed class SpellGestureInput : MonoBehaviour
    {
        private enum InputSource
        {
            None,
            Touch,
            Pen,
            Mouse
        }

        [SerializeField, Min(0f)]
        private float minimumPointSpacing = 3f;

        public event Action StrokeStarted;
        public event Action<Vector2> StrokePointAdded;
        public event Action<IReadOnlyList<Vector2>> StrokeCompleted;
        public event Action StrokeCancelled;

        private readonly List<Vector2> strokePoints = new List<Vector2>(128);
        private InputSource activeSource;

        private void Update()
        {
            if (activeSource == InputSource.None)
            {
                TryBeginStroke();
                return;
            }

            UpdateActiveStroke();
        }

        private void TryBeginStroke()
        {
            // Prefer a new touch, then a pen tip, then the mouse.
            if (Touchscreen.current != null &&
                Touchscreen.current.primaryTouch.press.wasPressedThisFrame)
            {
                BeginStroke(InputSource.Touch, Touchscreen.current.primaryTouch.position.ReadValue());
                return;
            }

            if (Pen.current != null && Pen.current.tip.wasPressedThisFrame)
            {
                BeginStroke(InputSource.Pen, Pen.current.position.ReadValue());
                return;
            }

            if (Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame)
            {
                BeginStroke(InputSource.Mouse, Mouse.current.position.ReadValue());
            }
        }

        private void BeginStroke(InputSource source, Vector2 screenPosition)
        {
            activeSource = source;
            strokePoints.Clear();
            strokePoints.Add(screenPosition);

            StrokeStarted?.Invoke();
            StrokePointAdded?.Invoke(screenPosition);
        }

        private void UpdateActiveStroke()
        {
            Vector2 position;
            bool isPressed;
            bool wasReleased;

            switch (activeSource)
            {
                case InputSource.Touch:
                    if (Touchscreen.current == null)
                    {
                        CancelStroke();
                        return;
                    }

                    var touch = Touchscreen.current.primaryTouch;
                    position = touch.position.ReadValue();
                    isPressed = touch.press.isPressed;
                    wasReleased = touch.press.wasReleasedThisFrame;
                    break;

                case InputSource.Pen:
                    if (Pen.current == null)
                    {
                        CancelStroke();
                        return;
                    }

                    position = Pen.current.position.ReadValue();
                    isPressed = Pen.current.tip.isPressed;
                    wasReleased = Pen.current.tip.wasReleasedThisFrame;
                    break;

                case InputSource.Mouse:
                    if (Mouse.current == null)
                    {
                        CancelStroke();
                        return;
                    }

                    position = Mouse.current.position.ReadValue();
                    isPressed = Mouse.current.leftButton.isPressed;
                    wasReleased = Mouse.current.leftButton.wasReleasedThisFrame;
                    break;

                default:
                    CancelStroke();
                    return;
            }

            if (wasReleased)
            {
                AppendPoint(position);
                CompleteStroke();
                return;
            }

            if (isPressed)
            {
                AppendPoint(position);
                return;
            }

            // The input disappeared without a normal release (for example,
            // a focus change). Cancel rather than accidentally casting.
            CancelStroke();
        }

        private void AppendPoint(Vector2 point)
        {
            if (strokePoints.Count > 0)
            {
                Vector2 previous = strokePoints[strokePoints.Count - 1];
                if (Vector2.Distance(previous, point) < minimumPointSpacing)
                    return;
            }

            strokePoints.Add(point);
            StrokePointAdded?.Invoke(point);
        }

        private void CompleteStroke()
        {
            List<Vector2> completedPoints = new List<Vector2>(strokePoints);
            strokePoints.Clear();
            activeSource = InputSource.None;
            StrokeCompleted?.Invoke(completedPoints);
        }

        private void CancelStroke()
        {
            if (activeSource == InputSource.None)
                return;

            strokePoints.Clear();
            activeSource = InputSource.None;
            StrokeCancelled?.Invoke();
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (!hasFocus)
                CancelStroke();
        }

        private void OnDisable()
        {
            CancelStroke();
        }
    }
}
