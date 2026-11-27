using System.Collections;
using UnityEngine;

namespace CatWizard.Spells
{
    /// <summary>
    /// Slows the game world while a spell gesture is being drawn, then restores
    /// the original time scale using unscaled time so the recovery itself is smooth.
    /// </summary>
    public sealed class SpellTimeDilation : MonoBehaviour
    {
        [SerializeField, Range(0.05f, 0.5f)]
        private float drawingTimeScale = 0.15f;

        [SerializeField, Min(0.01f)]
        private float restoreDuration = 0.25f;

        private float normalTimeScale;
        private float normalFixedDeltaTime;
        private Coroutine restoreRoutine;
        private bool isDrawing;

        private void Awake()
        {
            normalTimeScale = Mathf.Max(Time.timeScale, 0.0001f);
            normalFixedDeltaTime = Time.fixedDeltaTime;
        }

        public void BeginDrawing()
        {
            if (restoreRoutine != null)
            {
                StopCoroutine(restoreRoutine);
                restoreRoutine = null;
            }

            isDrawing = true;
            ApplyTimeScale(drawingTimeScale);
        }

        /// <summary>
        /// Call once after the stroke has been resolved, whether or not it matched
        /// a spell. The spell event should be dispatched immediately before this.
        /// </summary>
        public void ResolveDrawing()
        {
            if (!isDrawing && Mathf.Approximately(Time.timeScale, normalTimeScale))
                return;

            isDrawing = false;

            if (restoreRoutine != null)
                StopCoroutine(restoreRoutine);

            restoreRoutine = StartCoroutine(RestoreOverRealtime());
        }

        private IEnumerator RestoreOverRealtime()
        {
            float startScale = Time.timeScale;
            float duration = Mathf.Max(0.01f, restoreDuration);
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.unscaledDeltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                t = t * t * (3f - 2f * t);
                ApplyTimeScale(Mathf.Lerp(startScale, normalTimeScale, t));
                yield return null;
            }

            ApplyTimeScale(normalTimeScale);
            restoreRoutine = null;
        }

        private void ApplyTimeScale(float scale)
        {
            Time.timeScale = scale;
            Time.fixedDeltaTime = normalFixedDeltaTime * (scale / normalTimeScale);
        }

        private void RestoreImmediately()
        {
            isDrawing = false;

            if (restoreRoutine != null)
            {
                StopCoroutine(restoreRoutine);
                restoreRoutine = null;
            }

            if (normalTimeScale > 0f)
                ApplyTimeScale(normalTimeScale);
        }

        private void OnDisable()
        {
            RestoreImmediately();
        }

        private void OnDestroy()
        {
            RestoreImmediately();
        }
    }
}
