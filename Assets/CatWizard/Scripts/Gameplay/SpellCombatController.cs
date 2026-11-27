using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using CatWizard.Player;
using CatWizard.Spells;
using CatWizard.World;

namespace CatWizard.Gameplay
{
    /// <summary>
    /// Converts the recognized gesture into a spell aimed at the gesture's
    /// release location. Effects interact with the real 2D physics props.
    /// </summary>
    public sealed class SpellCombatController : MonoBehaviour
    {
        [SerializeField] private SpellDrawingController drawingController;
        [SerializeField] private CatPlayerController player;
        [SerializeField] private Camera gameplayCamera;

        private Material effectMaterial;

        public void Configure(
            SpellDrawingController drawing,
            CatPlayerController cat,
            Camera cameraToUse)
        {
            Unsubscribe();
            drawingController = drawing;
            player = cat;
            gameplayCamera = cameraToUse;
            Subscribe();
        }

        private void OnEnable()
        {
            Subscribe();
        }

        private void OnDisable()
        {
            Unsubscribe();
        }

        private void Subscribe()
        {
            if (isActiveAndEnabled && drawingController != null)
                drawingController.SpellCast += HandleSpellCast;
        }

        private void Unsubscribe()
        {
            if (drawingController != null)
                drawingController.SpellCast -= HandleSpellCast;
        }

        private void HandleSpellCast(SpellType spell, Vector2 releaseScreenPoint, float confidence)
        {
            if (gameplayCamera == null || player == null)
                return;

            Vector3 screen = new Vector3(
                releaseScreenPoint.x,
                releaseScreenPoint.y,
                Mathf.Abs(gameplayCamera.transform.position.z));

            Vector3 target3D = gameplayCamera.ScreenToWorldPoint(screen);
            Vector2 target = new Vector2(
                Mathf.Clamp(target3D.x, -9.1f, 9.1f),
                Mathf.Clamp(target3D.y, -4.7f, 4.7f));

            Vector2 origin = player.GetWorldPosition();
            player.SetAimDirection(target - origin);

            switch (spell)
            {
                case SpellType.Fireball:
                    StartCoroutine(LaunchFireball(origin, target));
                    break;

                case SpellType.Thunderbolt:
                    CastThunderbolt(origin, target);
                    break;

                case SpellType.Frost:
                    CastFrost(target);
                    break;

                case SpellType.Gravity:
                    StartCoroutine(CastGravity(target));
                    break;

                case SpellType.Chaos:
                    CastChaos(target);
                    break;
            }

            SpellLabBootstrap.LastSpellName = spell.ToString();
            SpellLabBootstrap.LastSpellConfidence = confidence;
        }

        private IEnumerator LaunchFireball(Vector2 origin, Vector2 target)
        {
            Vector2 direction = (target - origin).sqrMagnitude > 0.001f
                ? (target - origin).normalized
                : Vector2.right;

            GameObject orb = CreateEffectObject("Fireball", origin + direction * 0.65f,
                new Color(1f, 0.34f, 0.08f, 1f), SpellLabBootstrap.CircleSprite, 0.38f, 20);

            float distance = Vector2.Distance(origin, target);
            float duration = Mathf.Clamp(distance / 13f, 0.16f, 0.6f);
            float elapsed = 0f;
            Vector3 start = orb.transform.position;
            Vector3 end = new Vector3(target.x, target.y, 0f);

            while (elapsed < duration && orb != null)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                orb.transform.position = Vector3.Lerp(start, end, t);
                orb.transform.Rotate(0f, 0f, 520f * Time.deltaTime);
                yield return null;
            }

            if (orb != null)
                Destroy(orb);

            SpawnPulse(target, 1.45f, new Color(1f, 0.28f, 0.05f, 0.7f), 0.22f);
            ApplyAreaSpell(SpellType.Fireball, target, 1.45f);
        }

        private void CastThunderbolt(Vector2 origin, Vector2 target)
        {
            SpawnLightning(origin, target);
            HashSet<DestructibleProp> struck = new HashSet<DestructibleProp>();
            const int segments = 14;

            for (int i = 0; i <= segments; i++)
            {
                float t = i / (float)segments;
                Vector2 point = Vector2.Lerp(origin, target, t);
                Collider2D[] hits = Physics2D.OverlapCircleAll(point, 0.36f);

                for (int j = 0; j < hits.Length; j++)
                {
                    DestructibleProp prop = hits[j].GetComponentInParent<DestructibleProp>();
                    if (prop != null && struck.Add(prop))
                        prop.ReceiveSpell(SpellType.Thunderbolt, point);
                }
            }

            SpawnPulse(target, 0.95f, new Color(0.4f, 0.85f, 1f, 0.65f), 0.18f);
        }

        private void CastFrost(Vector2 target)
        {
            SpawnPulse(target, 2.2f, new Color(0.35f, 0.83f, 1f, 0.52f), 0.44f);
            ApplyAreaSpell(SpellType.Frost, target, 2.15f);
        }

        private IEnumerator CastGravity(Vector2 target)
        {
            GameObject vortex = CreateEffectObject(
                "Gravity Vortex", target, new Color(0.72f, 0.38f, 1f, 0.58f),
                SpellLabBootstrap.CircleSprite, 1.1f, 18);

            float duration = 1.15f;
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;

                if (vortex != null)
                    vortex.transform.Rotate(0f, 0f, 280f * Time.deltaTime);

                Collider2D[] hits = Physics2D.OverlapCircleAll(target, 3.6f);
                for (int i = 0; i < hits.Length; i++)
                {
                    DestructibleProp prop = hits[i].GetComponentInParent<DestructibleProp>();
                    if (prop != null)
                        prop.ApplyGravityPull(target, 24f);
                }

                yield return null;
            }

            if (vortex != null)
                Destroy(vortex);

            SpawnPulse(target, 2.1f, new Color(0.77f, 0.42f, 1f, 0.6f), 0.28f);
            ApplyAreaSpell(SpellType.Gravity, target, 2.4f);
        }

        private void CastChaos(Vector2 target)
        {
            SpawnPulse(target, 3.2f, new Color(1f, 0.16f, 0.56f, 0.62f), 0.48f);
            ApplyAreaSpell(SpellType.Chaos, target, 3.0f);
        }

        private void ApplyAreaSpell(SpellType spell, Vector2 center, float radius)
        {
            Collider2D[] hits = Physics2D.OverlapCircleAll(center, radius);
            HashSet<DestructibleProp> affected = new HashSet<DestructibleProp>();

            for (int i = 0; i < hits.Length; i++)
            {
                DestructibleProp prop = hits[i].GetComponentInParent<DestructibleProp>();
                if (prop != null && affected.Add(prop))
                    prop.ReceiveSpell(spell, center);
            }
        }

        private void SpawnLightning(Vector2 start, Vector2 end)
        {
            GameObject lineObject = new GameObject("Thunderbolt Arc");
            LineRenderer line = lineObject.AddComponent<LineRenderer>();
            line.useWorldSpace = true;
            line.positionCount = 19;
            line.startWidth = 0.12f;
            line.endWidth = 0.025f;
            line.numCapVertices = 5;
            line.sortingOrder = 25;
            line.material = GetEffectMaterial();
            line.startColor = new Color(0.64f, 0.94f, 1f, 1f);
            line.endColor = new Color(0.2f, 0.55f, 1f, 0.2f);

            Vector2 delta = end - start;
            Vector2 perpendicular = delta.sqrMagnitude > 0.001f
                ? new Vector2(-delta.normalized.y, delta.normalized.x)
                : Vector2.up;

            for (int i = 0; i < line.positionCount; i++)
            {
                float t = i / (float)(line.positionCount - 1);
                float jagged = (i == 0 || i == line.positionCount - 1)
                    ? 0f
                    : Random.Range(-0.2f, 0.2f);

                Vector2 point = Vector2.Lerp(start, end, t) + perpendicular * jagged;
                line.SetPosition(i, new Vector3(point.x, point.y, -0.05f));
            }

            StartCoroutine(FadeAndDestroyLine(lineObject, line, 0.24f));
        }

        private IEnumerator FadeAndDestroyLine(GameObject target, LineRenderer line, float duration)
        {
            float elapsed = 0f;
            Color startColor = line.startColor;
            Color endColor = line.endColor;

            while (elapsed < duration && target != null)
            {
                elapsed += Time.deltaTime;
                float alpha = 1f - Mathf.Clamp01(elapsed / duration);
                line.startColor = new Color(startColor.r, startColor.g, startColor.b, alpha);
                line.endColor = new Color(endColor.r, endColor.g, endColor.b, alpha);
                yield return null;
            }

            if (target != null)
                Destroy(target);
        }

        private void SpawnPulse(Vector2 point, float maximumScale, Color tint, float duration)
        {
            GameObject pulse = CreateEffectObject(
                "Spell Impact", point, tint, SpellLabBootstrap.CircleSprite, 0.15f, 22);
            StartCoroutine(AnimatePulse(pulse, maximumScale, tint, duration));
        }

        private IEnumerator AnimatePulse(GameObject target, float maximumScale, Color tint, float duration)
        {
            SpriteRenderer renderer = target.GetComponent<SpriteRenderer>();
            float elapsed = 0f;

            while (elapsed < duration && target != null)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                float eased = t * t * (3f - 2f * t);
                target.transform.localScale = Vector3.one * Mathf.Lerp(0.15f, maximumScale, eased);

                if (renderer != null)
                    renderer.color = new Color(tint.r, tint.g, tint.b, Mathf.Lerp(tint.a, 0f, t));

                yield return null;
            }

            if (target != null)
                Destroy(target);
        }

        private GameObject CreateEffectObject(
            string objectName,
            Vector2 position,
            Color tint,
            Sprite sprite,
            float scale,
            int sortingOrder)
        {
            GameObject effect = new GameObject(objectName);
            effect.transform.position = new Vector3(position.x, position.y, -0.1f);
            effect.transform.localScale = Vector3.one * scale;

            SpriteRenderer renderer = effect.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.color = tint;
            renderer.sortingOrder = sortingOrder;
            return effect;
        }

        private Material GetEffectMaterial()
        {
            if (effectMaterial != null)
                return effectMaterial;

            Shader shader = Shader.Find("Sprites/Default");
            if (shader == null)
                shader = Shader.Find("Universal Render Pipeline/2D/Sprite-Unlit-Default");

            if (shader != null)
                effectMaterial = new Material(shader);

            return effectMaterial;
        }

        private void OnDestroy()
        {
            if (effectMaterial != null)
                Destroy(effectMaterial);
        }
    }
}
