using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;

namespace CatWizard.Spells
{
    /// <summary>
    /// Captures a single stroke from mouse, touch, or stylus in screen-space.
    /// On touch devices the left edge is reserved for movement; any touch that
    /// starts to the right of that zone can draw a spell.
    /// </summary>
    public sealed class SpellGestureInput : MonoBehaviour
    {
        private enum InputSource { None, Touch, Pen, Mouse }

        [SerializeField, Min(0f)]
        private float minimumPointSpacing = 2.5f;

        [SerializeField, Range(0.1f, 0.6f)]
        private float gestureMinimumXFraction = 0.32f;

        public event Action StrokeStarted;
        public event Action<Vector2> StrokePointAdded;
        public event Action<IReadOnlyList<Vector2>> StrokeCompleted;
        public event Action StrokeCancelled;

        public bool IsDrawing => activeSource != InputSource.None;

        private readonly List<Vector2> strokePoints = new List<Vector2>(160);
        private InputSource activeSource;
        private int activeTouchId = -1;

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
            if (Touchscreen.current != null)
            {
                var touches = Touchscreen.current.touches;
                for (int i = 0; i < touches.Count; i++)
                {
                    TouchControl touch = touches[i];
                    if (!touch.press.wasPressedThisFrame)
                        continue;

                    Vector2 position = touch.position.ReadValue();
                    if (position.x < Screen.width * gestureMinimumXFraction)
                        continue;

                    activeTouchId = touch.touchId.ReadValue();
                    BeginStroke(InputSource.Touch, position);
                    return;
                }
            }

            if (Pen.current != null && Pen.current.tip.wasPressedThisFrame)
            {
                BeginStroke(InputSource.Pen, Pen.current.position.ReadValue());
                return;
            }

            if (Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame)
                BeginStroke(InputSource.Mouse, Mouse.current.position.ReadValue());
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
                {
                    TouchControl touch = FindActiveTouch();
                    if (touch == null)
                    {
                        CancelStroke();
                        return;
                    }

                    position = touch.position.ReadValue();
                    isPressed = touch.press.isPressed;
                    wasReleased = touch.press.wasReleasedThisFrame;
                    break;
                }
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
            }
            else if (isPressed)
            {
                AppendPoint(position);
            }
            else
            {
                CancelStroke();
            }
        }

        private TouchControl FindActiveTouch()
        {
            if (Touchscreen.current == null)
                return null;

            var touches = Touchscreen.current.touches;
            for (int i = 0; i < touches.Count; i++)
            {
                TouchControl touch = touches[i];
                if (touch.touchId.ReadValue() == activeTouchId)
                    return touch;
            }

            return null;
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
            List<Vector2> completed = new List<Vector2>(strokePoints);
            strokePoints.Clear();
            activeSource = InputSource.None;
            activeTouchId = -1;
            StrokeCompleted?.Invoke(completed);
        }

        private void CancelStroke()
        {
            if (activeSource == InputSource.None)
                return;

            strokePoints.Clear();
            activeSource = InputSource.None;
            activeTouchId = -1;
            StrokeCancelled?.Invoke();
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (!hasFocus)
                CancelStroke();
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused)
                CancelStroke();
        }

        private void OnDisable()
        {
            CancelStroke();
        }
    }
}
