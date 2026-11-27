using UnityEngine;

namespace CatWizard.Spells
{
    /// <summary>
    /// Optional development probe used to verify gesture recognition before
    /// projectile and spell-effect prefabs are connected.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class SpellGestureDebugProbe : MonoBehaviour
    {
        [SerializeField] private SpellDrawingController controller;

        private void Awake()
        {
            if (controller == null)
                controller = GetComponent<SpellDrawingController>();
        }

        private void OnEnable()
        {
            if (controller == null)
                return;

            controller.SpellCast += HandleSpellCast;
            controller.StrokeRejected += HandleRejected;
        }

        private void OnDisable()
        {
            if (controller == null)
                return;

            controller.SpellCast -= HandleSpellCast;
            controller.StrokeRejected -= HandleRejected;
        }

        private void HandleSpellCast(SpellType spell, Vector2 releasePosition, float confidence)
        {
            Debug.Log(
                $"[Cat Wizard] Gesture recognized: {spell} | confidence {confidence:0.00} | screen {releasePosition}",
                this);
        }

        private void HandleRejected(float confidence)
        {
            Debug.Log(
                $"[Cat Wizard] Gesture rejected | best confidence {confidence:0.00}",
                this);
        }
    }
}
