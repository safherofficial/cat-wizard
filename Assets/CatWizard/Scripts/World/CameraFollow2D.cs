using UnityEngine;

namespace CatWizard.World
{
    public sealed class CameraFollow2D : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField, Min(0f)] private float smoothTime = 0.16f;
        [SerializeField] private Vector2 bounds = new Vector2(9.1f, 4.5f);

        private Vector3 velocity;

        public void Configure(Transform followTarget, Vector2 worldBounds)
        {
            target = followTarget;
            bounds = worldBounds;
        }

        private void LateUpdate()
        {
            if (target == null)
                return;

            Vector3 desired = new Vector3(
                Mathf.Clamp(target.position.x, -bounds.x, bounds.x),
                Mathf.Clamp(target.position.y, -bounds.y, bounds.y),
                transform.position.z);

            transform.position = Vector3.SmoothDamp(
                transform.position,
                desired,
                ref velocity,
                Mathf.Max(0.001f, smoothTime),
                Mathf.Infinity,
                Time.unscaledDeltaTime);
        }
    }
}
