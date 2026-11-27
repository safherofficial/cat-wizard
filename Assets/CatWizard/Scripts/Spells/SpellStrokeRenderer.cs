using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace CatWizard.Spells
{
    /// <summary>
    /// Draws the active pointer path in world space with a LineRenderer.
    /// Assign a bright, unlit material in the Inspector for the magical-trail look.
    /// </summary>
    [RequireComponent(typeof(LineRenderer))]
    public sealed class SpellStrokeRenderer : MonoBehaviour
    {
        [SerializeField] private Camera gameplayCamera;
        [SerializeField] private float worldPlaneZ = 0f;
        [SerializeField, Min(0.001f)] private float lineWidth = 0.055f;
        [SerializeField, Min(0f)] private float lingerAfterRelease = 0.18f;

        private LineRenderer line;
        private readonly List<Vector3> worldPoints = new List<Vector3>(128);
        private Coroutine clearRoutine;

        private void Awake()
        {
            line = GetComponent<LineRenderer>();
            line.useWorldSpace = true;
            line.numCapVertices = 6;
            line.numCornerVertices = 4;
            line.startWidth = lineWidth;
            line.endWidth = lineWidth;

            if (gameplayCamera == null)
                gameplayCamera = Camera.main;
        }

        public void BeginStroke()
        {
            StopClearRoutine();
            Clear();
        }

        public void AddScreenPoint(Vector2 screenPoint)
        {
            if (gameplayCamera == null)
            {
                gameplayCamera = Camera.main;
                if (gameplayCamera == null)
                    return;
            }

            Vector3 screen = new Vector3(
                screenPoint.x,
                screenPoint.y,
                Mathf.Abs(gameplayCamera.transform.position.z - worldPlaneZ));

            Vector3 world = gameplayCamera.ScreenToWorldPoint(screen);
            world.z = worldPlaneZ;
            worldPoints.Add(world);

            line.positionCount = worldPoints.Count;
            line.SetPosition(worldPoints.Count - 1, world);
        }

        public void CompleteStroke()
        {
            StopClearRoutine();
            clearRoutine = StartCoroutine(ClearAfterLinger());
        }

        public void CancelStroke()
        {
            StopClearRoutine();
            Clear();
        }

        private IEnumerator ClearAfterLinger()
        {
            float elapsed = 0f;
            while (elapsed < lingerAfterRelease)
            {
                elapsed += Time.unscaledDeltaTime;
                yield return null;
            }

            Clear();
            clearRoutine = null;
        }

        private void StopClearRoutine()
        {
            if (clearRoutine == null)
                return;

            StopCoroutine(clearRoutine);
            clearRoutine = null;
        }

        private void Clear()
        {
            worldPoints.Clear();
            if (line != null)
                line.positionCount = 0;
        }

        private void OnDisable()
        {
            StopClearRoutine();
            Clear();
        }
    }
}
